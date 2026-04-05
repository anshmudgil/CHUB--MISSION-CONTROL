'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X, Tag, AlignLeft, Plus } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { staggerContainer, staggerItem } from '@/lib/motion';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const typeColors: Record<string, string> = {
  'Velocity OS': 'muted',
  'Content': 'info',
  'Agency': 'warning',
  'Automations': 'success',
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon...
  const diff = (day === 0 ? -6 : 1 - day); // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type CalendarEventWithDate = CalendarEvent & { eventDate?: string };

export function CalendarView() {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithDate | null>(null);
  const [events, setEvents] = useState<CalendarEventWithDate[]>([]);
  const [viewMode, setViewMode] = useState<string>('week');

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then((data: Record<string, string>[]) => {
        setEvents(data.map(e => ({
          id: e.id,
          title: e.title,
          description: e.description || '',
          time: e.time || '',
          type: (e.type || 'Velocity OS') as CalendarEvent['type'],
          color: e.color || '',
          day: 0,
          eventDate: e.event_date,
        })));
      })
      .catch(() => {});
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Get the Monday of the displayed week
  const weekStart = useMemo(() => {
    const base = getWeekStart(today);
    return addDays(base, weekOffset * 7);
  }, [today, weekOffset]);

  // The 7 days of the displayed week (Mon–Sun)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Map events to dates
  const getEventsForDate = (date: Date): CalendarEventWithDate[] => {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return events.filter(event => {
      if (event.eventDate) return event.eventDate === dateStr;
      // Fallback for legacy data using day offset
      const evDate = addDays(today, event.day ?? 0);
      return isSameDay(evDate, date);
    });
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekLabel = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} – ${monthNames[addDays(weekStart, 6).getMonth()]} ${addDays(weekStart, 6).getDate()}, ${weekStart.getFullYear()}`;

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-base tracking-tight">Calendar</h1>
            <p className="text-sm text-text-muted mt-0.5">Scheduled tasks and agent jobs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Tabs
            tabs={[
              { id: 'week', label: 'Week' },
              { id: 'today', label: 'Today' },
            ]}
            activeTab={viewMode}
            onChange={setViewMode}
          />

          {viewMode === 'week' && (
            <div className="flex items-center gap-1 bg-bg-subtle border border-border-base rounded-lg p-0.5">
              <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 hover:bg-bg-panel rounded-md text-text-muted hover:text-text-base transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-text-base min-w-[180px] text-center px-2">{weekLabel}</span>
              <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 hover:bg-bg-panel rounded-md text-text-muted hover:text-text-base transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={() => { setWeekOffset(0); setViewMode('week'); }}>Today</Button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-hidden p-6">
        <AnimatePresence mode="wait">
          {viewMode === 'week' ? (
            <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col bg-bg-panel border border-border-base rounded-xl overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border-base bg-bg-subtle shrink-0">
                {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={i} className="py-3 text-center border-r last:border-r-0 border-border-base">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">{DAY_NAMES[i]}</div>
                      <div className={`text-sm font-medium mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : 'text-text-base'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              <div className="grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar">
                {weekDays.map((day, i) => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = isSameDay(day, today);
                  return (
                    <div key={i} className={`border-r last:border-r-0 border-border-base p-2 min-h-[200px] ${isToday ? 'bg-accent/5' : ''}`}>
                      {dayEvents.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <span className="text-[10px] text-text-muted opacity-50">—</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {dayEvents.map(event => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`text-[10px] px-2 py-1.5 rounded border bg-bg-base truncate flex items-start gap-1 cursor-pointer hover:opacity-80 transition-opacity text-left w-full ${event.color}`}
                              title={event.title}
                            >
                              <Clock size={8} className="shrink-0 opacity-70 mt-0.5" />
                              <div>
                                <div className="truncate font-medium">{event.title}</div>
                                {event.time && <div className="opacity-70">{event.time}</div>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div key="today" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto custom-scrollbar">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-lg font-semibold text-text-base mb-6">
                  {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
                {(() => {
                  const todayEvents = getEventsForDate(today);
                  return todayEvents.length === 0 ? (
                    <EmptyState
                      icon={<CalendarIcon size={32} />}
                      title="Nothing scheduled today"
                      description="Enjoy your free day or create a new event."
                    />
                  ) : (
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                      {todayEvents.map(event => (
                        <motion.div
                          key={event.id}
                          variants={staggerItem}
                          onClick={() => setSelectedEvent(event)}
                          className={`bg-bg-panel border border-border-base rounded-xl p-4 cursor-pointer hover:border-border-strong hover:shadow-elevation-card-hover transition-all ${event.color ? 'border-l-4' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-medium text-text-base mb-1">{event.title}</h3>
                              {event.time && (
                                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                  <Clock size={12} />
                                  <span>{event.time}</span>
                                </div>
                              )}
                              {event.description && (
                                <p className="text-xs text-text-muted mt-2 leading-relaxed">{event.description}</p>
                              )}
                            </div>
                            <Badge variant={typeColors[event.type] as 'success' | 'info' | 'warning' | 'muted' || 'muted'}>
                              {event.type}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event Details Modal */}
      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} size="sm">
        {selectedEvent && (
          <>
            <ModalHeader onClose={() => setSelectedEvent(null)}>
              <h2 className="text-lg font-semibold text-text-base">Event Details</h2>
            </ModalHeader>
            <ModalBody className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-text-base mb-2">{selectedEvent.title}</h3>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Clock size={14} />
                  <span>{selectedEvent.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Tag size={14} className="text-text-muted" />
                <Badge variant={typeColors[selectedEvent.type] as 'success' | 'info' | 'warning' | 'muted' || 'muted'}>
                  {selectedEvent.type}
                </Badge>
              </div>
              {selectedEvent.description && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-base">
                    <AlignLeft size={14} className="text-text-muted" />
                    Description
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed pl-6">{selectedEvent.description}</p>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setSelectedEvent(null)}>Close</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
