'use client';

import React, { useState, useEffect } from 'react';
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
import { Plus, Filter, Video, CheckCircle } from 'lucide-react';

const COLUMNS = [
  { id: 'idea', title: 'Idea', count: 1, color: 'bg-zinc-500' },
  { id: 'scripting', title: 'Scripting', count: 1, color: 'bg-blue-500' },
  { id: 'recording-drafting', title: 'Recording/Drafting', count: 1, color: 'bg-red-500' },
  { id: 'editing', title: 'Editing', count: 1, color: 'bg-yellow-500' },
  { id: 'review', title: 'Review', count: 1, color: 'bg-orange-500' },
  { id: 'scheduled', title: 'Scheduled', count: 1, color: 'bg-purple-500' },
  { id: 'published', title: 'Published', count: 1, color: 'bg-emerald-500' },
];

export function ContentPipelineView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        // Map API response to Task shape for the kanban
        const mapped: Task[] = (data as Record<string, unknown>[]).map((item) => ({
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
            label: String(item.content_type ?? item.platform ?? ''),
            color: 'text-zinc-400 bg-zinc-400/10',
          },
          timeAgo: '',
          status: String(item.status ?? ''),
        }));
        setTasks(mapped);
      }
    } catch (e) {
      console.error('Failed to fetch content', e);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleApprove = async (id: string) => {
    await fetch('/api/content/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', approved_at: new Date().toISOString(), approved_by: 'Ansh' }),
    }).catch(console.error);
    fetchContent();
  };

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

    // Dropping a task over another task
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

    // Dropping a task over an empty column
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
          
          <button className="flex items-center gap-2 px-3 py-1.5 bg-bg-panel border border-border-base rounded-md text-sm text-text-muted hover:text-text-base transition-colors shadow-elevation-card-rest">
            <Filter size={14} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 transition-colors shadow-elevation-card-rest">
            <Plus size={16} />
            New Content
          </button>
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="px-6 py-4 border-b border-border-base flex gap-6 shrink-0 bg-bg-subtle">
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">This Week</span>
          <span className="text-lg font-semibold text-text-base">3 Published</span>
        </div>
        <div className="w-px h-10 bg-border-base"></div>
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">In Progress</span>
          <span className="text-lg font-semibold text-text-base">4 Items</span>
        </div>
        <div className="w-px h-10 bg-border-base"></div>
        <div className="flex flex-col">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wider">VELO Drafts</span>
          <span className="text-lg font-semibold text-text-base">2 Pending</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 custom-scrollbar">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full items-start">
            {COLUMNS.map(col => (
              <KanbanColumn 
                key={col.id} 
                column={col} 
                tasks={tasks.filter(t => t.columnId === col.id)} 
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeTask ? <KanbanCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
