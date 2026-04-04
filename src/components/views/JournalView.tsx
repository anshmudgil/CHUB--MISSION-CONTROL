'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, BookOpen, X } from 'lucide-react';

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
      if (res.ok) {
        const data = await res.json();
        setEntries(data as JournalEntry[]);
      }
    } catch (e) {
      console.error('Failed to fetch journal entries', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async () => {
    if (!formDate) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          shipped: formShipped,
          blockers: formBlockers,
          focus: formFocus,
          notes: formNotes,
        }),
      });
      if (res.ok) {
        setFormDate(today);
        setFormShipped('');
        setFormBlockers('');
        setFormFocus('');
        setFormNotes('');
        setShowForm(false);
        await fetchEntries();
      }
    } catch (e) {
      console.error('Failed to submit journal entry', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base flex items-center justify-between shrink-0 bg-bg-panel/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-semibold text-text-base tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-accent" />
            Journal
          </h1>
          <p className="text-sm text-text-muted mt-1">Daily shipped, blockers, and focus log</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent/90 transition-colors shadow-elevation-card-rest"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Entry'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {/* New Entry Form */}
        {showForm && (
          <div className="mb-6 bg-bg-panel border border-border-base rounded-xl p-6 shadow-elevation-card-rest">
            <h2 className="text-base font-semibold text-text-base mb-4">New Journal Entry</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-bg-base border border-border-base rounded-lg px-3 py-2 text-sm text-text-base focus:outline-none focus:border-border-strong"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                  ✅ What shipped today?
                </label>
                <textarea
                  value={formShipped}
                  onChange={(e) => setFormShipped(e.target.value)}
                  placeholder="Features, tasks, content delivered..."
                  rows={3}
                  className="w-full bg-bg-base border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                  🚧 Blockers
                </label>
                <textarea
                  value={formBlockers}
                  onChange={(e) => setFormBlockers(e.target.value)}
                  placeholder="What's slowing you down?"
                  rows={2}
                  className="w-full bg-bg-base border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                  🎯 Tomorrow's Focus
                </label>
                <textarea
                  value={formFocus}
                  onChange={(e) => setFormFocus(e.target.value)}
                  placeholder="Top priority for next session..."
                  rows={2}
                  className="w-full bg-bg-base border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                  📝 Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Anything else..."
                  rows={2}
                  className="w-full bg-bg-base border border-border-base rounded-lg px-3 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formDate}
                  className="bg-accent hover:bg-accent/90 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entries List */}
        {loading ? (
          <div className="text-text-muted text-sm p-4">Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-text-muted text-sm">No journal entries yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-bg-panel border border-border-base rounded-xl overflow-hidden shadow-elevation-card-rest hover:shadow-elevation-card-hover transition-shadow"
              >
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span className="text-sm font-semibold text-text-base">{entry.date}</span>
                    {entry.shipped && (
                      <span className="text-xs text-text-muted truncate max-w-xs">
                        {entry.shipped.split('\n')[0].slice(0, 60)}{entry.shipped.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </div>
                  {expandedId === entry.id ? (
                    <ChevronUp size={16} className="text-text-muted shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-text-muted shrink-0" />
                  )}
                </button>

                {expandedId === entry.id && (
                  <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border-base pt-4">
                    {entry.shipped && (
                      <div>
                        <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">✅ Shipped</p>
                        <p className="text-sm text-text-muted whitespace-pre-wrap">{entry.shipped}</p>
                      </div>
                    )}
                    {entry.blockers && (
                      <div>
                        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">🚧 Blockers</p>
                        <p className="text-sm text-text-muted whitespace-pre-wrap">{entry.blockers}</p>
                      </div>
                    )}
                    {entry.focus && (
                      <div>
                        <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-1">🎯 Focus</p>
                        <p className="text-sm text-text-muted whitespace-pre-wrap">{entry.focus}</p>
                      </div>
                    )}
                    {entry.notes && (
                      <div>
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">📝 Notes</p>
                        <p className="text-sm text-text-muted whitespace-pre-wrap">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
