'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor,
  PointerSensor, useSensor, useSensors, DragStartEvent,
  DragOverEvent, DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task, Comment } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/toast';
import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/lib/motion';
import {
  Plus, ChevronDown, X, Calendar, Flag, User,
  MessageSquare, Trash2, CheckCircle, Edit2, ArrowRightLeft
} from 'lucide-react';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'bg-zinc-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-yellow-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' },
];

export function TasksView() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  // Task detail modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // New task modal states
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('ansh');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskColumnId, setNewTaskColumnId] = useState('backlog');
  const [newTaskSubmitting, setNewTaskSubmitting] = useState(false);

  // Status change dropdown for task detail
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  // Derive unique assignees from tasks
  const uniqueAssignees = useMemo(() => {
    const seen = new Map<string, Task['assignee']>();
    tasks.forEach(t => {
      if (!seen.has(t.assignee.name)) {
        seen.set(t.assignee.name, t.assignee);
      }
    });
    return Array.from(seen.values());
  }, [tasks]);

  // Derive unique projects from tasks
  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    tasks.forEach(t => {
      if (t.project) projects.add(t.project);
    });
    return Array.from(projects).sort();
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
      toast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
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
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const overIndex = tasks.findIndex(t => t.id === overId);
        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const newTasks = [...tasks];
          newTasks[activeIndex].columnId = tasks[overIndex].columnId;
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex].columnId = String(overId);
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';

    if (isActiveTask && isOverTask) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const overIndex = tasks.findIndex(t => t.id === overId);
        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const newColumnId = tasks[overIndex].columnId;
          fetch('/api/tasks/' + String(activeId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnId: newColumnId }),
          }).catch(console.error);
          const newTasks = [...tasks];
          newTasks[activeIndex].columnId = newColumnId;
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(tasks, activeIndex, overIndex);
      });
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (assigneeFilter && task.assignee.name !== assigneeFilter) return false;
    if (projectFilter && task.project !== projectFilter) return false;
    return true;
  });

  // --- Comment Handlers ---

  const handleAddComment = async () => {
    if (!selectedTask || !newCommentText.trim()) return;

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'Ansh',
          text: newCommentText.trim(),
        }),
      });

      if (res.ok) {
        const newComment: Comment = await res.json().catch(() => ({
          id: `c${Date.now()}`,
          author: 'Ansh',
          text: newCommentText.trim(),
          timestamp: 'Just now',
        }));

        const updatedTask = {
          ...selectedTask,
          comments: [...(selectedTask.comments || []), newComment],
        };

        setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);
        setNewCommentText('');
        toast('Comment added', 'success');
      } else {
        toast('Failed to add comment', 'error');
      }
    } catch {
      // Fallback: update locally if API fails
      const newComment: Comment = {
        id: `c${Date.now()}`,
        author: 'Ansh',
        text: newCommentText.trim(),
        timestamp: 'Just now',
      };

      const updatedTask = {
        ...selectedTask,
        comments: [...(selectedTask.comments || []), newComment],
      };

      setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
      setNewCommentText('');
      toast('Comment saved locally', 'info');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask) return;

    const updatedTask = {
      ...selectedTask,
      comments: (selectedTask.comments || []).filter(c => c.id !== commentId),
    };

    setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    toast('Comment deleted', 'success');
  };

  // --- Edit Handlers ---

  const startEditing = () => {
    if (!selectedTask) return;
    setIsEditing(true);
    setEditTitle(selectedTask.title);
    setEditDescription(selectedTask.description || '');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditTitle('');
    setEditDescription('');
  };

  const saveEdit = async () => {
    if (!selectedTask || !editTitle.trim()) return;

    const updatedTask = {
      ...selectedTask,
      title: editTitle.trim(),
      description: editDescription.trim(),
    };

    setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    setIsEditing(false);

    try {
      await fetch('/api/tasks/' + selectedTask.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() }),
      });
      toast('Task updated', 'success');
    } catch {
      toast('Failed to save changes', 'error');
    }
  };

  // --- Status Change Handler ---

  const handleChangeStatus = async (task: Task, newColumnId: string) => {
    const updatedTask = { ...task, columnId: newColumnId };
    setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
    if (selectedTask?.id === task.id) {
      setSelectedTask(updatedTask);
    }

    try {
      await fetch('/api/tasks/' + task.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: newColumnId }),
      });
      const colTitle = COLUMNS.find(c => c.id === newColumnId)?.title || newColumnId;
      toast(`Moved to ${colTitle}`, 'success');
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  // --- Delete Handler ---

  const handleDeleteTask = async (task: Task) => {
    try {
      await fetch('/api/tasks/' + task.id, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== task.id));
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
      toast('Task deleted', 'success');
    } catch {
      toast('Failed to delete task', 'error');
    }
  };

  // --- Create Task Handler ---

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setNewTaskSubmitting(true);

    const assigneeName = newTaskAssignee === 'ansh' ? 'Ansh' : newTaskAssignee === 'velo' ? 'VELO' : 'Unassigned';

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          columnId: newTaskColumnId,
          assignee: assigneeName,
          priority: newTaskPriority,
          dueDate: newTaskDue || undefined,
        }),
      });

      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssignee('ansh');
      setNewTaskPriority('medium');
      setNewTaskDue('');
      setNewTaskColumnId('backlog');
      setIsNewTaskModalOpen(false);
      toast('Task created', 'success');
      fetchTasks();
    } catch {
      toast('Failed to create task', 'error');
    } finally {
      setNewTaskSubmitting(false);
    }
  };

  // --- Open new task modal with pre-selected column ---

  const openNewTaskForColumn = (columnId: string) => {
    setNewTaskColumnId(columnId);
    setIsNewTaskModalOpen(true);
  };

  // Close task detail and reset editing state
  const closeTaskDetail = () => {
    setSelectedTask(null);
    setIsEditing(false);
    setNewCommentText('');
  };

  // --- Loading State ---

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="px-8 py-6 flex items-center gap-8 border-b border-border-base bg-bg-subtle">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
        <div className="px-8 py-4 flex items-center gap-6 border-b border-border-base mb-4">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
        <div className="flex-1 overflow-hidden px-8 pb-8">
          <div className="flex gap-6 h-full">
            {COLUMNS.map(col => (
              <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="w-2 h-2 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Metrics Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="px-8 py-6 flex items-center gap-8 border-b border-border-base bg-bg-subtle"
        >
          <motion.div variants={staggerItem} className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-emerald-500">{filteredTasks.length}</span>
            <span className="text-sm text-text-muted">Tasks</span>
          </motion.div>
          <motion.div variants={staggerItem} className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-blue-500">{filteredTasks.filter(t => t.columnId === 'in-progress').length}</span>
            <span className="text-sm text-text-muted">In progress</span>
          </motion.div>
          <motion.div variants={staggerItem} className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-text-base">{tasks.length}</span>
            <span className="text-sm text-text-muted">Total</span>
          </motion.div>
        </motion.div>

        {/* Toolbar */}
        <div className="px-8 py-4 flex items-center gap-6 bg-bg-panel/50 backdrop-blur-sm border-b border-border-base mb-4">
          <Button onClick={() => setIsNewTaskModalOpen(true)} size="md">
            <Plus size={16} /> New task
          </Button>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            {uniqueAssignees.map(assignee => (
              <button
                key={assignee.name}
                onClick={() => setAssigneeFilter(assigneeFilter === assignee.name ? null : assignee.name)}
                className={`transition-colors px-3 py-1.5 rounded-md hover:bg-bg-panel flex items-center gap-2 ${assigneeFilter === assignee.name ? 'bg-bg-panel text-text-base font-medium' : ''}`}
              >
                <Avatar name={assignee.name} color={assignee.color} size="xs" />
                {assignee.name}
              </button>
            ))}

            {uniqueProjects.length > 0 && (
              <>
                <div className="h-4 w-px bg-border-base mx-2" />

                <select
                  value={projectFilter || ''}
                  onChange={(e) => setProjectFilter(e.target.value || null)}
                  className="bg-transparent border-none text-sm text-text-muted hover:text-text-base focus:ring-0 cursor-pointer outline-none"
                >
                  <option value="">All projects</option>
                  {uniqueProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-8 custom-scrollbar">
          <div className="flex gap-6 h-full">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <SortableContext items={COLUMNS.map(c => c.id)}>
                {COLUMNS.map(col => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    tasks={filteredTasks.filter(t => t.columnId === col.id)}
                    onTaskClick={setSelectedTask}
                    onTaskEdit={(task) => {
                      setSelectedTask(task);
                      setIsEditing(true);
                      setEditTitle(task.title);
                      setEditDescription(task.description || '');
                    }}
                    onTaskDelete={handleDeleteTask}
                    onTaskChangeStatus={(task) => {
                      // Cycle to next column
                      const currentIndex = COLUMNS.findIndex(c => c.id === task.columnId);
                      const nextIndex = (currentIndex + 1) % COLUMNS.length;
                      handleChangeStatus(task, COLUMNS[nextIndex].id);
                    }}
                    onAddTask={() => openNewTaskForColumn(col.id)}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeTask ? <KanbanCard task={activeTask} isOverlay /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      <Modal open={!!selectedTask} onClose={closeTaskDetail} size="lg">
        {selectedTask && (
          <>
            <ModalHeader onClose={closeTaskDetail}>
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    selectedTask.columnId === 'done' ? 'success' :
                    selectedTask.columnId === 'in-progress' ? 'info' :
                    selectedTask.columnId === 'review' ? 'warning' : 'default'
                  }
                >
                  {COLUMNS.find(c => c.id === selectedTask.columnId)?.title || selectedTask.columnId}
                </Badge>
                {selectedTask.project && (
                  <span className="text-xs font-medium text-text-muted">
                    {selectedTask.project}
                  </span>
                )}
              </div>
            </ModalHeader>

            <ModalBody className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {/* Title - editable or static */}
              {isEditing ? (
                <div className="mb-6 space-y-3">
                  <Input
                    label="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Task title"
                  />
                  <Textarea
                    label="Description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Task description"
                    rows={4}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={!editTitle.trim()}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <h2 className="text-xl font-semibold text-text-base mb-6">{selectedTask.title}</h2>
              )}

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                    <User size={14} /> Assignee
                  </h4>
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={selectedTask.assignee.name}
                      color={selectedTask.assignee.color}
                      size="sm"
                    />
                    <span className="text-sm text-text-base">{selectedTask.assignee.name}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                    <Flag size={14} /> Priority
                  </h4>
                  <Badge
                    variant={
                      selectedTask.priority === 'high' ? 'error' :
                      selectedTask.priority === 'medium' ? 'warning' :
                      selectedTask.priority === 'low' ? 'info' : 'muted'
                    }
                  >
                    {selectedTask.priority ? selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1) : 'None'}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                    <Calendar size={14} /> Due Date
                  </h4>
                  <span className="text-sm text-text-base">{selectedTask.dueDate || 'No due date'}</span>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                    <ArrowRightLeft size={14} /> Status
                  </h4>
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="sm">
                        {COLUMNS.find(c => c.id === selectedTask.columnId)?.title || selectedTask.columnId}
                        <ChevronDown size={12} />
                      </Button>
                    }
                    align="left"
                  >
                    {COLUMNS.map(col => (
                      <DropdownItem
                        key={col.id}
                        icon={<div className={`w-2 h-2 rounded-full ${col.color}`} />}
                        onClick={() => handleChangeStatus(selectedTask, col.id)}
                      >
                        {col.title}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </div>
              </div>

              {/* Description (when not editing) */}
              {!isEditing && (
                <div className="mb-8">
                  <h4 className="text-sm font-medium text-text-base mb-2">Description</h4>
                  <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap bg-bg-panel p-4 rounded-lg border border-border-base">
                    {selectedTask.description || 'No description provided.'}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h4 className="text-sm font-medium text-text-base mb-4 flex items-center gap-2">
                  <MessageSquare size={16} /> Comments
                  {selectedTask.comments && selectedTask.comments.length > 0 && (
                    <Badge variant="muted">{selectedTask.comments.length}</Badge>
                  )}
                </h4>

                <div className="flex flex-col gap-4 mb-6">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3 group">
                        <Avatar name={comment.author} size="md" />
                        <div className="flex-1 bg-bg-panel border border-border-base rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-text-base">{comment.author}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-text-muted">{comment.timestamp}</span>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-opacity"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-text-muted">{comment.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-text-muted italic">No comments yet.</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Avatar name="Ansh" color="bg-emerald-500/20 text-emerald-400" size="md" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim() || commentSubmitting}
                        loading={commentSubmitting}
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={startEditing}>
                  <Edit2 size={14} /> Edit
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTask(selectedTask)}
              >
                <Trash2 size={14} /> Delete
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* New Task Modal */}
      <Modal open={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} size="md">
        <ModalHeader onClose={() => setIsNewTaskModalOpen(false)}>
          <h2 className="text-lg font-semibold text-text-base">Create New Task</h2>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="Task title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Task description"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            rows={4}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Assignee"
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              options={[
                { value: 'ansh', label: 'Ansh' },
                { value: 'velo', label: 'VELO' },
                { value: 'unassigned', label: 'Unassigned' },
              ]}
            />
            <Select
              label="Priority"
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Column"
              value={newTaskColumnId}
              onChange={(e) => setNewTaskColumnId(e.target.value)}
              options={COLUMNS.map(col => ({ value: col.id, label: col.title }))}
            />
            <Input
              label="Due Date"
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsNewTaskModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim() || newTaskSubmitting}
            loading={newTaskSubmitting}
          >
            Create Task
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
