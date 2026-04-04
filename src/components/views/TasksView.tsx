'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor,
  PointerSensor, useSensor, useSensors, DragStartEvent,
  DragOverEvent, DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task, Comment } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { Plus, ChevronDown, Activity, X, Calendar, Flag, User, MessageSquare, Trash2 } from 'lucide-react';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'bg-zinc-500' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: 'bg-yellow-500' },
  { id: 'done', title: 'Done', color: 'bg-emerald-500' },
];

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  
  // Modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('ansh');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDue, setNewTaskDue] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error('Failed to fetch tasks', e);
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

  if (loading) return <div className="p-8 text-text-muted">Loading...</div>;

  const filteredTasks = tasks.filter(task => {
    if (assigneeFilter && task.assignee.name !== assigneeFilter) return false;
    if (projectFilter && task.project !== projectFilter) return false;
    return true;
  });

  const handleAddComment = () => {
    if (!selectedTask || !newCommentText.trim()) return;
    
    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: 'Ansh', // Assuming current user is Ansh for now
      text: newCommentText.trim(),
      timestamp: 'Just now'
    };

    const updatedTask = {
      ...selectedTask,
      comments: [...(selectedTask.comments || []), newComment]
    };

    setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    setNewCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (!selectedTask) return;

    const updatedTask = {
      ...selectedTask,
      comments: (selectedTask.comments || []).filter(c => c.id !== commentId)
    };

    setTasks(tasks.map(t => t.id === selectedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
  };

  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Metrics Header */}
        <div className="px-8 py-6 flex items-center gap-8 border-b border-border-base bg-bg-subtle">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-emerald-500">{filteredTasks.length}</span>
            <span className="text-sm text-text-muted">Tasks</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-blue-500">{filteredTasks.filter(t => t.columnId === 'in-progress').length}</span>
            <span className="text-sm text-text-muted">In progress</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-text-base">{tasks.length}</span>
            <span className="text-sm text-text-muted">Total</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 flex items-center gap-6 bg-bg-panel/50 backdrop-blur-sm border-b border-border-base mb-4">
          <button 
            onClick={() => setIsNewTaskModalOpen(true)}
            className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors shadow-elevation-card-rest"
          >
            <Plus size={16} /> New task
          </button>
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <button 
              onClick={() => setAssigneeFilter(assigneeFilter === 'Ansh' ? null : 'Ansh')}
              className={`transition-colors px-3 py-1.5 rounded-md hover:bg-bg-panel ${assigneeFilter === 'Ansh' ? 'bg-bg-panel text-text-base font-medium' : ''}`}
            >
              Ansh
            </button>
            <button 
              onClick={() => setAssigneeFilter(assigneeFilter === 'VELO' ? null : 'VELO')}
              className={`transition-colors px-3 py-1.5 rounded-md hover:bg-bg-panel ${assigneeFilter === 'VELO' ? 'bg-bg-panel text-text-base font-medium' : ''}`}
            >
              VELO
            </button>
            
            <div className="h-4 w-px bg-border-base mx-2"></div>

            <select 
              value={projectFilter || ''} 
              onChange={(e) => setProjectFilter(e.target.value || null)}
              className="bg-transparent border-none text-sm text-text-muted hover:text-text-base focus:ring-0 cursor-pointer outline-none"
            >
              <option value="">All projects</option>
              <option value="Velocity OS">Velocity OS</option>
              <option value="Agency Client Delivery">Agency Client Delivery</option>
              <option value="Personal Brand/Content">Personal Brand/Content</option>
            </select>
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
                    onTaskEdit={(task) => { /* Handle edit */ }}
                    onTaskDelete={async (task) => {
              await fetch('/api/tasks/' + task.id, { method: 'DELETE' }).catch(console.error);
              fetchTasks();
            }}
                    onTaskChangeStatus={(task) => { /* Handle status change */ }}
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

      {/* Live Activity Sidebar */}
      <div className="w-80 border-l border-border-base bg-bg-base flex flex-col shrink-0">
        <div className="p-4 border-b border-border-base">
          <h3 className="text-sm font-medium text-text-base">Live Activity</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
          
          <div className="bg-bg-panel border border-border-base rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <Activity size={12} /> Scout
            </div>
            <p className="text-xs text-text-muted">4 trends: Claude presentation, Code finance app, Udi roast...</p>
          </div>

          <div className="bg-bg-panel border border-border-base rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-purple-500">
              <Activity size={12} /> Quill
            </div>
            <p className="text-xs text-text-muted">Script: Claude Code Agent - Everything</p>
          </div>

          <div className="bg-bg-panel border border-border-base rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-500">
              <CheckCircle size={12} /> Henry
            </div>
            <p className="text-xs text-text-muted">Completed: System Status Update</p>
          </div>

        </div>
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-bg-base border border-border-strong rounded-xl shadow-elevation-modal w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-base">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium px-2 py-1 rounded bg-bg-subtle text-text-muted border border-border-base">
                  {COLUMNS.find(c => c.id === selectedTask.columnId)?.title || selectedTask.columnId}
                </span>
                {selectedTask.project && (
                  <span className="text-xs font-medium text-text-muted">
                    {selectedTask.project}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="text-sm font-medium text-text-muted hover:text-text-base px-3 py-1.5 rounded-md hover:bg-bg-subtle transition-colors">
                  Edit
                </button>
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-subtle rounded-md transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <h2 className="text-xl font-semibold text-text-base mb-6">{selectedTask.title}</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                    <User size={14} /> Assignee
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedTask.assignee.color}`}>
                      {selectedTask.assignee.initial}
                    </div>
                    <span className="text-sm text-text-base">{selectedTask.assignee.name}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                    <Flag size={14} /> Priority
                  </h4>
                  <span className={`text-sm capitalize ${
                    selectedTask.priority === 'high' ? 'text-red-500' : 
                    selectedTask.priority === 'medium' ? 'text-yellow-500' : 
                    selectedTask.priority === 'low' ? 'text-blue-500' : 'text-text-muted'
                  }`}>
                    {selectedTask.priority || 'None'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-2">
                    <Calendar size={14} /> Due Date
                  </h4>
                  <span className="text-sm text-text-base">{selectedTask.dueDate || 'No due date'}</span>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-sm font-medium text-text-base mb-2">Description</h4>
                <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap bg-bg-panel p-4 rounded-lg border border-border-base">
                  {selectedTask.description || 'No description provided.'}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-text-base mb-4 flex items-center gap-2">
                  <MessageSquare size={16} /> Comments
                </h4>
                
                <div className="flex flex-col gap-4 mb-6">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-bg-subtle border border-border-base flex items-center justify-center text-xs font-bold text-text-base shrink-0">
                          {comment.author.charAt(0)}
                        </div>
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
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                    A
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea 
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-bg-panel border border-border-base rounded-lg p-3 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong resize-none min-h-[80px]"
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={handleAddComment}
                        disabled={!newCommentText.trim()}
                        className="bg-bg-subtle hover:bg-bg-panel text-text-base px-4 py-1.5 rounded-md text-sm font-medium transition-colors border border-border-base disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-bg-base border border-border-strong rounded-xl shadow-elevation-modal w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border-base">
              <h2 className="text-lg font-semibold text-text-base">Create New Task</h2>
              <button 
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-subtle rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Title</label>
                <input 
                  type="text" 
                  placeholder="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Description</label>
                <textarea 
                  placeholder="Task description"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong resize-none min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-base mb-1.5">Assignee</label>
                  <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong appearance-none">
                    <option value="ansh">Ansh</option>
                    <option value="velo">VELO</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-base mb-1.5">Priority</label>
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className="w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong appearance-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Due Date</label>
                <input 
                  type="date" 
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="w-full bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border-base flex justify-end gap-3 bg-bg-subtle">
              <button 
                onClick={() => setIsNewTaskModalOpen(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-text-muted hover:text-text-base hover:bg-bg-panel transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!newTaskTitle.trim()) return;
                  const assigneeName = newTaskAssignee === 'ansh' ? 'Ansh' : newTaskAssignee === 'velo' ? 'VELO' : 'Unassigned';
                  await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: newTaskTitle,
                      description: newTaskDesc,
                      columnId: 'backlog',
                      assignee: assigneeName,
                      priority: newTaskPriority,
                      dueDate: newTaskDue || undefined,
                    }),
                  }).catch(console.error);
                  setNewTaskTitle('');
                  setNewTaskDesc('');
                  setNewTaskAssignee('ansh');
                  setNewTaskPriority('medium');
                  setNewTaskDue('');
                  setIsNewTaskModalOpen(false);
                  fetchTasks();
                }}
                className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-elevation-card-rest"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dummy CheckCircle for live activity
function CheckCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}
