'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X, Tag, AlignLeft, Plus } from 'lucide-react';
import { CalendarEvent } from '@/types';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<string>('month');

  // Fetch events from API or fall back to initial data
  useEffect(() => {
    import('@/data/initial').then(({ CALENDAR_EVENTS }) => {
      setEvents(CALENDAR_EVENTS);
    });
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: number) => {
    const today = new Date().getDate();
    const relativeDay = day - today;
    return events.filter(event => event.day === relativeDay).slice(0, 3);
  };

  const typeColors: Record<string, string> = {
    'Velocity OS': 'muted',
    'Content': 'info',
    'Agency': 'warning',
    'Automations': 'success',
  };

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
              { id: 'month', label: 'Month' },
              { id: 'week', label: 'Week' },
            ]}
            activeTab={viewMode}
            onChange={setViewMode}
          />

          <div className="flex items-center gap-1 bg-bg-subtle border border-border-base rounded-lg p-0.5">
            <button onClick={prevMonth} className="p-1.5 hover:bg-bg-panel rounded-md text-text-muted hover:text-text-base transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-text-base min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-bg-panel rounded-md text-text-muted hover:text-text-base transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={goToToday}>Today</Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="bg-bg-panel border border-border-base rounded-xl shadow-elevation-card-rest overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border-base bg-bg-subtle">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2.5 text-center text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-7 auto-rows-[minmax(100px,1fr)]"
          >
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-border-base bg-bg-base/50 p-2" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
              const dayEvents = getEventsForDay(day);

              return (
                <motion.div
                  key={day}
                  variants={staggerItem}
                  className={`border-r border-b border-border-base p-2 flex flex-col gap-1 transition-colors hover:bg-bg-subtle/50 ${isToday ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : 'text-text-muted'}`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-medium text-text-muted">{dayEvents.length}</span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                    {dayEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`text-[10px] px-1.5 py-1 rounded border bg-bg-base truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity text-left w-full ${event.color}`}
                        title={event.title}
                      >
                        <Clock size={8} className="shrink-0 opacity-70" />
                        <span className="truncate">{event.title}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            {Array.from({ length: (7 - ((firstDayOfMonth + daysInMonth) % 7)) % 7 }).map((_, i) => (
              <div key={`empty-end-${i}`} className="border-r border-b border-border-base bg-bg-base/50 p-2" />
            ))}
          </motion.div>
        </div>
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
