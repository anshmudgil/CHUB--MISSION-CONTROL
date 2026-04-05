'use client';

import React, { useMemo } from 'react';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { KanbanCard } from './KanbanCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Inbox } from 'lucide-react';

interface KanbanColumnProps {
  column: { id: string; title: string; color: string };
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (task: Task) => void;
  onTaskChangeStatus?: (task: Task) => void;
  onAddTask?: () => void;
}

export function KanbanColumn({ column, tasks, onTaskClick, onTaskEdit, onTaskDelete, onTaskChangeStatus, onAddTask }: KanbanColumnProps) {
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="bg-bg-panel/50 border-2 border-border-strong opacity-40 rounded-xl w-80 h-full flex-shrink-0" />;
  }

  return (
    <div ref={setNodeRef} style={style} className="w-80 h-full flex-shrink-0 flex flex-col">
      <div {...attributes} {...listeners} className="flex items-center justify-between mb-4 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.color}`} />
          <h2 className="text-sm font-medium text-text-base">{column.title}</h2>
          <span className="text-xs text-text-muted ml-1">{tasks.length}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTask?.();
          }}
          className="text-text-muted hover:text-text-base transition-colors"
          title={`Add task to ${column.title}`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 custom-scrollbar pb-4">
        <SortableContext items={taskIds}>
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick?.(task)}
              onEdit={() => onTaskEdit?.(task)}
              onDelete={() => onTaskDelete?.(task)}
              onChangeStatus={() => onTaskChangeStatus?.(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <EmptyState
            icon={<Inbox size={24} />}
            title="No tasks"
            description={`Drop tasks here or click + to add one`}
            className="py-8 border border-dashed border-border-base rounded-xl"
          />
        )}
      </div>
    </div>
  );
}
