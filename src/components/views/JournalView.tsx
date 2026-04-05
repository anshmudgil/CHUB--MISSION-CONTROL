'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ChevronDown, ChevronUp, BookOpen, X, Trash2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { staggerContainer, staggerItem } from '@/lib/motion';

interface JournalEntry {
  id: string;
  date: string;
  shipped: string;
  blockers: string;
  focus: string;
  notes: string;
}

export function JournalView() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntry | null>(null);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const [formDate, setFormDate] = useState(today);
  const [formShipped, setFormShipped] = useState('');
  const [formBlockers, setFormBlockers] = useState('');
  const [formFocus, setFormFocus] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/journal');
      if (res.ok) setEntries(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleSubmit = async () => {
    if (!formDate) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: formDate, shipped: formShipped, blockers: formBlockers, focus: formFocus, notes: formNotes }),
      });
      if (res.ok) {
        setFormDate(today); setFormShipped(''); setFormBlockers(''); setFormFocus(''); setFormNotes('');
        setShowForm(false);
        await fetchEntries();
        toast('Entry saved', 'success');
      }
    } catch { toast('Failed to save', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/journal/${deleteTarget.id}`, { method: 'DELETE' });
      await fetchEntries();
      toast('Entry deleted', 'success');
    } catch { toast('Failed to delete', 'error'); }
    finally { setDeleteTarget(null); }
  };

  const sections = [
    { key: 'shipped', label: 'Shipped', color: 'text-emerald-400' },
    { key: 'blockers', label: 'Blockers', color: 'text-red-400' },
    { key: 'focus', label: 'Focus', color: 'text-blue-400' },
    { key: 'notes', label: 'Notes', color: 'text-text-muted' },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base flex items-center justify-between shrink-0 bg-bg-panel/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center border border-accent/30">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-base tracking-tight">Journal</h1>
            <p className="text-sm text-text-muted mt-0.5">Daily shipped, blockers, and focus log</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Entry</>}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {/* New Entry Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-bg-panel border border-border-base rounded-xl p-6 shadow-elevation-card-rest">
                <h2 className="text-base font-semibold text-text-base mb-4">New Journal Entry</h2>
                <div className="flex flex-col gap-4">
                  <Input label="Date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="[color-scheme:dark]" />
                  <Textarea label="Shipped" placeholder="Features, tasks, content delivered..." value={formShipped} onChange={e => setFormShipped(e.target.value)} rows={3} />
                  <Textarea label="Blockers" placeholder="What's slowing you down?" value={formBlockers} onChange={e => setFormBlockers(e.target.value)} rows={2} />
                  <Textarea label="Tomorrow's Focus" placeholder="Top priority for next session..." value={formFocus} onChange={e => setFormFocus(e.target.value)} rows={2} />
                  <Textarea label="Notes" placeholder="Anything else..." value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
                  <div className="flex justify-end">
                    <Button onClick={handleSubmit} loading={submitting} disabled={!formDate}>Save Entry</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entries List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={40} />}
            title="No journal entries yet"
            description="Add your first daily entry to start tracking progress."
            action={<Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} /> New Entry</Button>}
          />
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {entries.map(entry => (
              <motion.div
                key={entry.id}
                variants={staggerItem}
                className="bg-bg-panel border border-border-base rounded-xl overflow-hidden shadow-elevation-card-rest hover:shadow-elevation-card-hover transition-shadow"
              >
                <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span className="text-sm font-semibold text-text-base">{entry.date}</span>
                    {entry.shipped && (
                      <span className="text-xs text-text-muted truncate max-w-xs hidden sm:inline">
                        {entry.shipped.split('\n')[0].slice(0, 60)}{entry.shipped.length > 60 ? '...' : ''}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteTarget(entry)}
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expandedId === entry.id ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === entry.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border-base pt-4">
                        {sections.map(({ key, label, color }) => {
                          const value = entry[key];
                          if (!value) return null;
                          return (
                            <div key={key}>
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
                                <p className={`text-xs font-medium uppercase tracking-wider ${color}`}>{label}</p>
                              </div>
                              <p className="text-sm text-text-muted whitespace-pre-wrap pl-3.5">{value}</p>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        <ModalHeader onClose={() => setDeleteTarget(null)}>
          <h2 className="text-lg font-semibold text-text-base">Delete Entry</h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-text-muted">Are you sure you want to delete the entry for <strong className="text-text-base">{deleteTarget?.date}</strong>? This cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
