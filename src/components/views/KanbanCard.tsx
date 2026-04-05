'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Edit2, Trash2, ArrowRightLeft, Calendar, Flag } from 'lucide-react';

interface KanbanCardProps {
  task: Task;
  isOverlay?: boolean;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onChangeStatus?: (e: React.MouseEvent) => void;
}

export function KanbanCard({ task, isOverlay, onClick, onEdit, onDelete, onChangeStatus }: KanbanCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="bg-bg-panel border border-border-strong opacity-30 rounded-xl h-32 w-full" />;
  }

  // Map columnId to a readable status
  const getStatusLabel = (columnId: string) => {
    const statusMap: Record<string, string> = {
      'backlog': 'Backlog',
      'in-progress': 'In Progress',
      'review': 'Review',
      'done': 'Done',
      'idea': 'Idea',
      'scripting': 'Scripting',
      'recording-drafting': 'Recording/Drafting',
      'editing': 'Editing',
      'scheduled': 'Scheduled',
      'published': 'Published'
    };
    return statusMap[columnId] || columnId;
  };

  const priorityVariant = (p?: string) => {
    if (p === 'high') return 'error' as const;
    if (p === 'medium') return 'warning' as const;
    if (p === 'low') return 'info' as const;
    return 'muted' as const;
  };

  const statusVariant = (columnId: string) => {
    if (['done', 'published'].includes(columnId)) return 'success' as const;
    if (['in-progress', 'scripting', 'recording-drafting', 'editing'].includes(columnId)) return 'info' as const;
    if (['review', 'scheduled'].includes(columnId)) return 'warning' as const;
    return 'default' as const;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "group bg-bg-panel border border-border-base rounded-xl p-4 flex flex-col gap-3 relative transition-all shadow-elevation-card-rest hover:shadow-elevation-card-hover hover:border-border-strong",
        isOverlay && "rotate-2 scale-105 shadow-elevation-card-hover border-border-strong cursor-grabbing",
        !isOverlay && "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      {/* Quick Actions (Hover) */}
      {!isOverlay && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-panel/90 backdrop-blur-sm p-1 rounded-lg border border-border-base shadow-sm z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(e); }}
            className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-subtle rounded-md transition-colors"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onChangeStatus?.(e); }}
            className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-subtle rounded-md transition-colors"
            title="Change Status"
          >
            <ArrowRightLeft size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(e); }}
            className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <div className="flex items-start gap-2 pr-6">
        <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
          ['backlog', 'idea'].includes(task.columnId) ? 'bg-zinc-500' :
          ['in-progress', 'scripting', 'recording-drafting', 'editing'].includes(task.columnId) ? 'bg-blue-500' :
          ['review', 'scheduled'].includes(task.columnId) ? 'bg-yellow-500' : 'bg-emerald-500'
        )} />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-text-base leading-tight">{task.title}</h3>
          {task.description && (
            <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {(task.priority || task.dueDate) && (
        <div className="flex items-center gap-2 mt-1">
          {task.priority && (
            <Badge variant={priorityVariant(task.priority)} dot>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-text-muted">
              <Calendar size={10} />
              <span>{task.dueDate}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.tag.label && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", task.tag.color)}>
              {task.tag.label}
            </span>
          )}
          <Badge variant={statusVariant(task.columnId)}>
            {getStatusLabel(task.columnId)}
          </Badge>
        </div>
        <Avatar
          name={task.assignee.name}
          color={task.assignee.color}
          size="xs"
        />
      </div>
    </div>
  );
}
