'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Task } from '@/types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Plus, Filter, Video, CheckCircle, Youtube, Linkedin, Mail, Twitter } from 'lucide-react';

// --- Content type config ---

type ContentType = 'YouTube' | 'LinkedIn' | 'Newsletter' | 'Twitter';

const CONTENT_TYPE_CONFIG: Record<ContentType, { icon: React.ElementType; color: string; badgeClass: string }> = {
  YouTube: { icon: Youtube, color: 'text-red-500', badgeClass: 'bg-red-500/10 border-red-500/30 text-red-400' },
  LinkedIn: { icon: Linkedin, color: 'text-blue-500', badgeClass: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  Newsletter: { icon: Mail, color: 'text-purple-500', badgeClass: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
  Twitter: { icon: Twitter, color: 'text-sky-500', badgeClass: 'bg-sky-500/10 border-sky-500/30 text-sky-400' },
};

const CONTENT_TYPES: ContentType[] = ['YouTube', 'LinkedIn', 'Newsletter', 'Twitter'];

const COLUMNS = [
  { id: 'idea', title: 'Idea', color: 'bg-zinc-500' },
  { id: 'scripting', title: 'Scripting', color: 'bg-blue-500' },
  { id: 'recording-drafting', title: 'Recording/Drafting', color: 'bg-red-500' },
  { id: 'editing', title: 'Editing', color: 'bg-yellow-500' },
  { id: 'review', title: 'Review', color: 'bg-orange-500' },
  { id: 'scheduled', title: 'Scheduled', color: 'bg-purple-500' },
  { id: 'published', title: 'Published', color: 'bg-emerald-500' },
];

// --- Helpers ---

function getContentTypeBadgeColor(label: string): string {
  const cfg = CONTENT_TYPE_CONFIG[label as ContentType];
  return cfg ? cfg.badgeClass : 'text-zinc-400 bg-zinc-400/10';
}

function mapApiToTask(item: Record<string, unknown>): Task {
  const contentType = String(item.content_type ?? item.platform ?? '');
  return {
    id: String(item.id),
    columnId: String(item.stage ?? item.columnId ?? 'idea'),
    title: String(item.title),
    description: String(item.description ?? ''),
    assignee: {
      name: String(item.assignee ?? 'Ansh'),
      initial: String(item.assignee ?? 'A').charAt(0).toUpperCase(),
      color: String(item.assignee ?? 'Ansh') === 'VELO' ? 'bg-purple-500' : 'bg-blue-500',
    },
    tag: {
      label: contentType,
      color: getContentTypeBadgeColor(contentType),
    },
    timeAgo: '',
  };
}

// --- Component ---

export function ContentPipelineView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // --- New content form state ---
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ContentType>('YouTube');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignee, setFormAssignee] = useState('Ansh');
  const [formDate, setFormDate] = useState('');

  const resetForm = () => {
    setFormTitle('');
    setFormType('YouTube');
    setFormDescription('');
    setFormAssignee('Ansh');
    setFormDate('');
  };

  // --- Data fetching ---

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        const mapped: Task[] = (data as Record<string, unknown>[]).map(mapApiToTask);
        setTasks(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch content', e);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  // --- Dynamic metrics ---

  const publishedCount = useMemo(() => tasks.filter(t => t.columnId === 'published').length, [tasks]);
  const inProgressCount = useMemo(() => tasks.filter(t => t.columnId !== 'idea' && t.columnId !== 'published').length, [tasks]);
  const pendingReviewCount = useMemo(() => tasks.filter(t => t.columnId === 'review').length, [tasks]);

  // --- Filtered tasks ---

  const filteredTasks = useMemo(() => {
    if (filterType === 'all') return tasks;
    return tasks.filter(t => t.tag.label === filterType);
  }, [tasks, filterType]);

  // --- Actions ---

  const handleApprove = async (id: string) => {
    await fetch('/api/content/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', approved_at: new Date().toISOString(), approved_by: 'Ansh' }),
    }).catch(console.error);
    toast('Content approved', 'success');
    fetchContent();
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast('Title is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          content_type: formType,
          description: formDescription.trim(),
          assignee: formAssignee,
          target_date: formDate || undefined,
          stage: 'idea',
        }),
      });
      if (res.ok) {
        toast('Content created', 'success');
        setShowNewModal(false);
        resetForm();
        fetchContent();
      } else {
        toast('Failed to create content', 'error');
      }
    } catch {
      toast('Failed to create content', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- DnD ---

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const newTasks = [...tasks];
          newTasks[activeIndex].columnId = tasks[overIndex].columnId;
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex].columnId = overId as string;
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  // --- Columns with dynamic counts ---

  const columnsWithCounts = useMemo(
    () => COLUMNS.map(col => ({
      ...col,
      count: filteredTasks.filter(t => t.columnId === col.id).length,
    })),
    [filteredTasks]
  );

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base flex items-center justify-between shrink-0 bg-bg-panel/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-semibold text-text-base tracking-tight flex items-center gap-2">
            <Video size={20} className="text-accent" />
            Content Pipeline
          </h1>
          <p className="text-sm text-text-muted mt-1">Manage YouTube, LinkedIn, and Newsletter content</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-bg-base flex items-center justify-center text-xs font-medium text-white z-20">A</div>
            <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-bg-base flex items-center justify-center text-xs font-medium text-white z-10">V</div>
          </div>

          {/* Filter button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 bg-bg-panel border rounded-md text-sm transition-colors shadow-elevation-card-rest ${
                filterType !== 'all'
                  ? 'border-accent text-accent'
                  : 'border-border-base text-text-muted hover:text-text-base'
              }`}
            >
              <Filter size={14} />
              {filterType === 'all' ? 'Filter' : filterType}
            </button>

            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-bg-panel border border-border-strong rounded-lg shadow-elevation-modal overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => { setFilterType('all'); setShowFilterMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      filterType === 'all' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-base hover:bg-bg-subtle'
                    }`}
                  >
                    All Types
                  </button>
                  {CONTENT_TYPES.map(ct => {
                    const cfg = CONTENT_TYPE_CONFIG[ct];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={ct}
                        onClick={() => { setFilterType(ct); setShowFilterMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                          filterType === ct ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-base hover:bg-bg-subtle'
                        }`}
                      >
                        <Icon size={14} className={cfg.color} />
                        {ct}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <Button variant="primary" size="sm" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            New Content
          </Button>
        </div>
      </div>

      {/* Pipeline Metrics - dynamic */}
      <div className="px-6 py-4 border-b border-border-base flex gap-6 shrink-0 bg-bg-subtle">
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Published</span>
          <span className="text-lg font-semibold text-text-base">{publishedCount} Published</span>
        </div>
        <div className="w-px h-10 bg-border-base"></div>
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">In Progress</span>
          <span className="text-lg font-semibold text-text-base">{inProgressCount} Items</span>
        </div>
        <div className="w-px h-10 bg-border-base"></div>
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Pending Review</span>
          <span className="text-lg font-semibold text-text-base">{pendingReviewCount} Pending</span>
        </div>
      </div>

      {/* Active filter indicator */}
      {filterType !== 'all' && (
        <div className="px-6 py-2 border-b border-border-base bg-bg-subtle/50 flex items-center gap-2">
          <span className="text-xs text-text-muted">Filtering by:</span>
          <Badge variant={filterType === 'YouTube' ? 'error' : filterType === 'LinkedIn' ? 'info' : filterType === 'Newsletter' ? 'warning' : 'info'}>
            {React.createElement(CONTENT_TYPE_CONFIG[filterType].icon, { size: 10 })}
            {filterType}
          </Badge>
          <button
            onClick={() => setFilterType('all')}
            className="text-xs text-text-muted hover:text-text-base ml-1 underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full items-start">
            {columnsWithCounts.map(col => {
              const colTasks = filteredTasks.filter(t => t.columnId === col.id);
              const isReviewColumn = col.id === 'review';

              return (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  tasks={colTasks}
                  onTaskClick={(task) => {
                    if (isReviewColumn) handleApprove(task.id);
                  }}
                  onTaskChangeStatus={(task) => {
                    if (isReviewColumn) handleApprove(task.id);
                  }}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? <KanbanCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* New Content Modal */}
      <Modal open={showNewModal} onClose={() => { setShowNewModal(false); resetForm(); }}>
        <ModalHeader onClose={() => { setShowNewModal(false); resetForm(); }}>
          <h2 className="text-lg font-semibold text-text-base">New Content</h2>
          <p className="text-sm text-text-muted mt-0.5">Add a new piece of content to the pipeline</p>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="e.g. How I replaced my entire team with AI"
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
          />
          <Select
            label="Content Type"
            value={formType}
            onChange={e => setFormType(e.target.value as ContentType)}
            options={CONTENT_TYPES.map(ct => ({ value: ct, label: ct }))}
          />
          <Textarea
            label="Description"
            placeholder="Brief description of the content..."
            rows={3}
            value={formDescription}
            onChange={e => setFormDescription(e.target.value)}
          />
          <Select
            label="Assignee"
            value={formAssignee}
            onChange={e => setFormAssignee(e.target.value)}
            options={[
              { value: 'Ansh', label: 'Ansh' },
              { value: 'VELO', label: 'VELO' },
            ]}
          />
          <Input
            label="Target Date"
            type="date"
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => { setShowNewModal(false); resetForm(); }}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleCreate}>
            Create
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
