'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ChevronDown, ChevronRight, Target, Lightbulb, FolderOpen, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Project = {
  id: string;
  title: string;
  description?: string;
  taskCount?: number;
  completed?: number;
};

type Initiative = {
  id: string;
  title: string;
  description?: string;
  projects: Project[];
  expanded: boolean;
};

type Objective = {
  id: string;
  title: string;
  description?: string;
  color: 'blue' | 'purple' | 'emerald' | 'amber';
  initiatives: Initiative[];
  expanded: boolean;
  progress?: number;
};

type PlanningData = { [quarter: string]: Objective[] };

// ── Constants ─────────────────────────────────────────────────────────────────

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

function getCurrentQuarter(): string {
  const month = new Date().getMonth(); // 0-indexed
  const year = new Date().getFullYear();
  const q = Math.floor(month / 3) + 1;
  return `Q${q} ${year}`;
}

const colorMap = {
  blue: {
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
    icon: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    progress: 'bg-blue-500',
  },
  purple: {
    border: 'border-l-purple-500',
    dot: 'bg-purple-500',
    icon: 'text-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    progress: 'bg-purple-500',
  },
  emerald: {
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
    icon: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    progress: 'bg-emerald-500',
  },
  amber: {
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
    icon: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    progress: 'bg-amber-500',
  },
};

const STORAGE_KEY = 'mc-planning';

// ── Inline editable row (for adding initiatives / projects) ───────────────────

function InlineAddRow({
  placeholder,
  onConfirm,
  onCancel,
}: {
  placeholder: string;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    if (value.trim()) onConfirm(value.trim());
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 bg-bg-subtle border border-border-base rounded-md px-2 py-1 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong"
      />
      <button
        onClick={handleConfirm}
        className="p-1 text-emerald-400 hover:text-emerald-300 rounded-md"
      >
        <Check size={14} />
      </button>
      <button onClick={onCancel} className="p-1 text-text-muted hover:text-text-base rounded-md">
        <X size={14} />
      </button>
    </div>
  );
}

// ── ProjectRow ────────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-bg-subtle group">
      <FolderOpen size={13} className="text-text-muted shrink-0" />
      <span className="flex-1 text-xs text-text-muted">{project.title}</span>
      {(project.taskCount !== undefined) && (
        <Badge variant="muted">{project.completed ?? 0}/{project.taskCount}</Badge>
      )}
      <div className="hidden group-hover:flex items-center gap-1">
        <button onClick={() => onEdit(project)} className="p-0.5 text-text-muted hover:text-text-base rounded">
          <Edit2 size={12} />
        </button>
        <button onClick={() => onDelete(project.id)} className="p-0.5 text-text-muted hover:text-red-400 rounded">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── InitiativeRow ─────────────────────────────────────────────────────────────

function InitiativeRow({
  initiative,
  onToggle,
  onEdit,
  onDelete,
  onAddProject,
  onEditProject,
  onDeleteProject,
}: {
  initiative: Initiative;
  onToggle: () => void;
  onEdit: (init: Initiative) => void;
  onDelete: (id: string) => void;
  onAddProject: (title: string) => void;
  onEditProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
}) {
  const [addingProject, setAddingProject] = useState(false);

  return (
    <div className="bg-bg-subtle border border-border-base rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-panel/50 group"
        onClick={onToggle}
      >
        <button
          className="text-text-muted shrink-0"
          onClick={e => { e.stopPropagation(); onToggle(); }}
        >
          {initiative.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Lightbulb size={13} className="text-text-muted shrink-0" />
        <span className="flex-1 text-sm text-text-base">{initiative.title}</span>
        <Badge variant="muted">{initiative.projects.length} projects</Badge>
        <div className="hidden group-hover:flex items-center gap-1 ml-1">
          <button
            onClick={e => { e.stopPropagation(); onEdit(initiative); }}
            className="p-0.5 text-text-muted hover:text-text-base rounded"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(initiative.id); }}
            className="p-0.5 text-text-muted hover:text-red-400 rounded"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Projects (when expanded) */}
      <AnimatePresence>
        {initiative.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-0.5 border-t border-border-base">
              {initiative.projects.map(project => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onEdit={onEditProject}
                  onDelete={onDeleteProject}
                />
              ))}
              {addingProject ? (
                <InlineAddRow
                  placeholder="Project title..."
                  onConfirm={title => { onAddProject(title); setAddingProject(false); }}
                  onCancel={() => setAddingProject(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingProject(true)}
                  className="text-xs text-text-muted hover:text-accent flex items-center gap-1 mt-1.5 px-2"
                >
                  <Plus size={11} /> Add Project
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main PlanningView ─────────────────────────────────────────────────────────

export function PlanningView() {
  const { toast } = useToast();

  const defaultQuarter = QUARTERS.includes(getCurrentQuarter()) ? getCurrentQuarter() : QUARTERS[0];
  const [selectedQuarter, setSelectedQuarter] = useState<string>(defaultQuarter);
  const [planningData, setPlanningData] = useState<PlanningData>({});

  // New objective modal
  const [showNewObjectiveModal, setShowNewObjectiveModal] = useState(false);
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  const [newObjectiveDescription, setNewObjectiveDescription] = useState('');
  const [newObjectiveColor, setNewObjectiveColor] = useState<Objective['color']>('blue');

  // Edit objective modal
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [editObjectiveTitle, setEditObjectiveTitle] = useState('');
  const [editObjectiveDescription, setEditObjectiveDescription] = useState('');
  const [editObjectiveColor, setEditObjectiveColor] = useState<Objective['color']>('blue');

  // Edit initiative modal
  const [editingInitiative, setEditingInitiative] = useState<{ objId: string; init: Initiative } | null>(null);
  const [editInitiativeTitle, setEditInitiativeTitle] = useState('');

  // Edit project modal
  const [editingProject, setEditingProject] = useState<{ objId: string; initId: string; project: Project } | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState('');

  // ── Load / save ──────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPlanningData(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  const save = useCallback((data: PlanningData) => {
    setPlanningData(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const objectives = planningData[selectedQuarter] ?? [];

  const updateObjectives = (updater: (prev: Objective[]) => Objective[]) => {
    save({ ...planningData, [selectedQuarter]: updater(objectives) });
  };

  // ── Objective CRUD ────────────────────────────────────────────────────────

  const handleAddObjective = () => {
    if (!newObjectiveTitle.trim()) return;
    const obj: Objective = {
      id: Date.now().toString(),
      title: newObjectiveTitle.trim(),
      description: newObjectiveDescription.trim() || undefined,
      color: newObjectiveColor,
      initiatives: [],
      expanded: true,
      progress: 0,
    };
    updateObjectives(prev => [...prev, obj]);
    setShowNewObjectiveModal(false);
    setNewObjectiveTitle('');
    setNewObjectiveDescription('');
    setNewObjectiveColor('blue');
    toast('Objective added', 'success');
  };

  const openEditObjective = (obj: Objective) => {
    setEditingObjective(obj);
    setEditObjectiveTitle(obj.title);
    setEditObjectiveDescription(obj.description ?? '');
    setEditObjectiveColor(obj.color);
  };

  const handleSaveObjective = () => {
    if (!editingObjective || !editObjectiveTitle.trim()) return;
    updateObjectives(prev =>
      prev.map(o =>
        o.id === editingObjective.id
          ? { ...o, title: editObjectiveTitle.trim(), description: editObjectiveDescription.trim() || undefined, color: editObjectiveColor }
          : o
      )
    );
    setEditingObjective(null);
    toast('Objective updated', 'success');
  };

  const deleteObjective = (id: string) => {
    updateObjectives(prev => prev.filter(o => o.id !== id));
    toast('Objective deleted', 'info');
  };

  const toggleObjective = (id: string) => {
    updateObjectives(prev =>
      prev.map(o => (o.id === id ? { ...o, expanded: !o.expanded } : o))
    );
  };

  // ── Initiative CRUD ───────────────────────────────────────────────────────

  const addInitiative = (objId: string, title: string) => {
    const init: Initiative = {
      id: `${Date.now()}`,
      title,
      projects: [],
      expanded: false,
    };
    updateObjectives(prev =>
      prev.map(o =>
        o.id === objId ? { ...o, initiatives: [...o.initiatives, init] } : o
      )
    );
    toast('Initiative added', 'success');
  };

  const deleteInitiative = (objId: string, initId: string) => {
    updateObjectives(prev =>
      prev.map(o =>
        o.id === objId
          ? { ...o, initiatives: o.initiatives.filter(i => i.id !== initId) }
          : o
      )
    );
    toast('Initiative deleted', 'info');
  };

  const toggleInitiative = (objId: string, initId: string) => {
    updateObjectives(prev =>
      prev.map(o =>
        o.id === objId
          ? {
              ...o,
              initiatives: o.initiatives.map(i =>
                i.id === initId ? { ...i, expanded: !i.expanded } : i
              ),
            }
          : o
      )
    );
  };

  const openEditInitiative = (objId: string, init: Initiative) => {
    setEditingInitiative({ objId, init });
    setEditInitiativeTitle(init.title);
  };

  const handleSaveInitiative = () => {
    if (!editingInitiative || !editInitiativeTitle.trim()) return;
    const { objId, init } = editingInitiative;
    updateObjectives(prev =>
      prev.map(o =>
        o.id === objId
          ? {
              ...o,
              initiatives: o.initiatives.map(i =>
                i.id === init.id ? { ...i, title: editInitiativeTitle.trim() } : i
              ),
            }
          : o
      )
    );
    setEditingInitiative(null);
    toast('Initiative updated', 'success');
  };

  // ── Project CRUD ──────────────────────────────────────────────────────────

  const addProject = (objId: string, initId: string, title: string) => {
    const project: Project = { id: `${Date.now()}`, title };
    updateObjectives(prev =>
      prev.map(o =>
        o.id === objId
          ? {
              ...o,
              initiatives: o.initiatives.map(i =>
                i.id === initId
                  ? { ...i, projects: [...i.projects, project] }
                  : i
              ),
            }
          : o
      )
    );
    toast('Project added', 'success');
  };

  const deleteProject = (objId: string, initId: string, projectId: string) => {
    updateObjectives(prev =>
      prev.map(o =>
        o.id === objId
          ? {
              ...o,
              initiatives: o.initiatives.map(i =>
                i.id === initId
                  ? { ...i, projects: i.projects.filter(p => p.id !== projectId) }
                  : i
              ),
            }
          : o
      )
    );
    toast('Project deleted', 'info');
  };

  const openEditProject = (objId: string, initId: string, project: Project) => {
    setEditingProject({ objId, initId, project });
    setEditProjectTitle(project.title);
  };

  const handleSaveProject = () => {
    if (!editingProject || !editProjectTitle.trim()) return;
    const { objId, initId, project } = editingProject;
    updateObjectives(prev =>
      prev.map(o =>
        o.id === objId
          ? {
              ...o,
              initiatives: o.initiatives.map(i =>
                i.id === initId
                  ? {
                      ...i,
                      projects: i.projects.map(p =>
                        p.id === project.id ? { ...p, title: editProjectTitle.trim() } : p
                      ),
                    }
                  : i
              ),
            }
          : o
      )
    );
    setEditingProject(null);
    toast('Project updated', 'success');
  };

  // ── Inline add initiative tracking ───────────────────────────────────────

  const [addingInitiativeFor, setAddingInitiativeFor] = useState<string | null>(null);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center border border-blue-500/30">
              <Target size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-base tracking-tight">Strategic Planning</h1>
              <p className="text-sm text-text-muted mt-0.5">Objectives, initiatives, and projects by quarter</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quarter selector */}
            <div className="flex items-center gap-1 bg-bg-subtle border border-border-base rounded-lg p-0.5">
              {QUARTERS.map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    selectedQuarter === q
                      ? 'bg-bg-panel text-text-base shadow-sm'
                      : 'text-text-muted hover:text-text-base'
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
            <Button onClick={() => setShowNewObjectiveModal(true)} size="sm">
              <Plus size={14} /> New Objective
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {objectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-bg-panel border border-border-base flex items-center justify-center">
              <Target size={28} className="text-text-muted" />
            </div>
            <div>
              <p className="text-base font-medium text-text-base">No objectives yet</p>
              <p className="text-sm text-text-muted mt-1">Add an objective to start planning {selectedQuarter}</p>
            </div>
            <Button onClick={() => setShowNewObjectiveModal(true)} size="sm">
              <Plus size={14} /> New Objective
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {objectives.map(obj => (
              <div
                key={obj.id}
                className={cn(
                  'bg-bg-panel border border-border-base border-l-4 rounded-xl',
                  colorMap[obj.color].border
                )}
              >
                {/* Objective header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-bg-subtle/50 rounded-t-xl transition-colors"
                  onClick={() => toggleObjective(obj.id)}
                >
                  <button
                    className="text-text-muted shrink-0"
                    onClick={e => { e.stopPropagation(); toggleObjective(obj.id); }}
                  >
                    {obj.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <Target size={16} className={cn('shrink-0', colorMap[obj.color].icon)} />
                  <span className="font-medium text-text-base flex-1">{obj.title}</span>
                  {obj.description && (
                    <span className="text-xs text-text-muted max-w-xs truncate hidden sm:block">{obj.description}</span>
                  )}
                  {/* Progress bar */}
                  <div className="w-24 h-1.5 bg-bg-subtle rounded-full overflow-hidden shrink-0">
                    <div
                      className={cn('h-full rounded-full', colorMap[obj.color].progress)}
                      style={{ width: `${obj.progress ?? 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-muted w-8 text-right shrink-0">{obj.progress ?? 0}%</span>
                  <button
                    onClick={e => { e.stopPropagation(); openEditObjective(obj); }}
                    className="p-1 text-text-muted hover:text-text-base rounded-md transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteObjective(obj.id); }}
                    className="p-1 text-text-muted hover:text-red-400 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Initiatives */}
                <AnimatePresence>
                  {obj.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2 border-t border-border-base pt-3">
                        {obj.initiatives.map(init => (
                          <InitiativeRow
                            key={init.id}
                            initiative={init}
                            onToggle={() => toggleInitiative(obj.id, init.id)}
                            onEdit={i => openEditInitiative(obj.id, i)}
                            onDelete={initId => deleteInitiative(obj.id, initId)}
                            onAddProject={title => addProject(obj.id, init.id, title)}
                            onEditProject={p => openEditProject(obj.id, init.id, p)}
                            onDeleteProject={projectId => deleteProject(obj.id, init.id, projectId)}
                          />
                        ))}

                        {/* Add initiative row */}
                        {addingInitiativeFor === obj.id ? (
                          <InlineAddRow
                            placeholder="Initiative title..."
                            onConfirm={title => { addInitiative(obj.id, title); setAddingInitiativeFor(null); }}
                            onCancel={() => setAddingInitiativeFor(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setAddingInitiativeFor(obj.id)}
                            className="text-xs text-text-muted hover:text-accent flex items-center gap-1 mt-2"
                          >
                            <Plus size={12} /> Add Initiative
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── New Objective Modal ─────────────────────────────────────────────── */}
      <Modal open={showNewObjectiveModal} onClose={() => setShowNewObjectiveModal(false)} size="sm">
        <ModalHeader onClose={() => setShowNewObjectiveModal(false)}>
          <h2 className="text-lg font-semibold text-text-base">New Objective</h2>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="Title"
            placeholder="Launch Creator Revenue Engine"
            value={newObjectiveTitle}
            onChange={e => setNewObjectiveTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddObjective(); }}
          />
          <Textarea
            label="Description"
            placeholder="What does success look like?"
            rows={2}
            value={newObjectiveDescription}
            onChange={e => setNewObjectiveDescription(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-text-base mb-2">Color</label>
            <div className="flex gap-2">
              {(['blue', 'purple', 'emerald', 'amber'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setNewObjectiveColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    colorMap[c].dot,
                    newObjectiveColor === c && 'ring-2 ring-white ring-offset-2 ring-offset-bg-base'
                  )}
                />
              ))}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowNewObjectiveModal(false)}>Cancel</Button>
          <Button onClick={handleAddObjective} disabled={!newObjectiveTitle.trim()}>Add Objective</Button>
        </ModalFooter>
      </Modal>

      {/* ── Edit Objective Modal ────────────────────────────────────────────── */}
      <Modal open={!!editingObjective} onClose={() => setEditingObjective(null)} size="sm">
        {editingObjective && (
          <>
            <ModalHeader onClose={() => setEditingObjective(null)}>
              <h2 className="text-lg font-semibold text-text-base">Edit Objective</h2>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <Input
                label="Title"
                value={editObjectiveTitle}
                onChange={e => setEditObjectiveTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveObjective(); }}
              />
              <Textarea
                label="Description"
                rows={2}
                value={editObjectiveDescription}
                onChange={e => setEditObjectiveDescription(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-text-base mb-2">Color</label>
                <div className="flex gap-2">
                  {(['blue', 'purple', 'emerald', 'amber'] as const).map(c => (
                    <button
                      key={c}
                      onClick={() => setEditObjectiveColor(c)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        colorMap[c].dot,
                        editObjectiveColor === c && 'ring-2 ring-white ring-offset-2 ring-offset-bg-base'
                      )}
                    />
                  ))}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEditingObjective(null)}>Cancel</Button>
              <Button onClick={handleSaveObjective} disabled={!editObjectiveTitle.trim()}>Save Changes</Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* ── Edit Initiative Modal ───────────────────────────────────────────── */}
      <Modal open={!!editingInitiative} onClose={() => setEditingInitiative(null)} size="sm">
        {editingInitiative && (
          <>
            <ModalHeader onClose={() => setEditingInitiative(null)}>
              <h2 className="text-lg font-semibold text-text-base">Edit Initiative</h2>
            </ModalHeader>
            <ModalBody>
              <Input
                label="Title"
                value={editInitiativeTitle}
                onChange={e => setEditInitiativeTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveInitiative(); }}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEditingInitiative(null)}>Cancel</Button>
              <Button onClick={handleSaveInitiative} disabled={!editInitiativeTitle.trim()}>Save Changes</Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* ── Edit Project Modal ──────────────────────────────────────────────── */}
      <Modal open={!!editingProject} onClose={() => setEditingProject(null)} size="sm">
        {editingProject && (
          <>
            <ModalHeader onClose={() => setEditingProject(null)}>
              <h2 className="text-lg font-semibold text-text-base">Edit Project</h2>
            </ModalHeader>
            <ModalBody>
              <Input
                label="Title"
                value={editProjectTitle}
                onChange={e => setEditProjectTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveProject(); }}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEditingProject(null)}>Cancel</Button>
              <Button onClick={handleSaveProject} disabled={!editProjectTitle.trim()}>Save Changes</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
