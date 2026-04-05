'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, Database, BrainCircuit, Hash, Clock, X, Save, CheckCircle2 } from 'lucide-react';
import { DOCS } from '@/data/initial';
import { Doc } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { staggerContainer, staggerItem } from '@/lib/motion';

export function MemoryView() {
  const [docs, setDocs] = useState<Doc[]>(DOCS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size'>('date');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('All Time');
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const categories = useMemo(() => Array.from(new Set(docs.map(doc => doc.tag))), [docs]);
  const timeframes = ['7D', '30D', '90D', 'All Time'];

  const filteredAndSortedDocs = useMemo(() => {
    let result = docs;

    if (activeCategory) {
      result = result.filter(doc => doc.tag === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        doc.tag.toLowerCase().includes(query)
      );
    }

    // Timeframe filtering
    if (activeTimeframe !== 'All Time') {
      const days = parseInt(activeTimeframe);
      if (!isNaN(days)) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        result = result.filter(doc => {
          const docDate = new Date(doc.date);
          return !isNaN(docDate.getTime()) ? docDate >= cutoff : true;
        });
      }
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return parseInt(b.size) - parseInt(a.size);
      return b.date.localeCompare(a.date);
    });
  }, [docs, searchQuery, activeCategory, sortBy, activeTimeframe]);

  const saveDocument = () => {
    if (!editingDoc) return;
    setIsSaving(true);
    setDocs(prevDocs => prevDocs.map(doc =>
      doc.id === editingDoc.id
        ? { ...doc, title: editTitle, content: editContent, words: editContent.split(/\s+/).filter(w => w.length > 0).length }
        : doc
    ));
    setLastSaved(new Date());
    setTimeout(() => setIsSaving(false), 500);
  };

  useEffect(() => {
    if (!editingDoc) return;
    const timer = setInterval(saveDocument, 30000);
    return () => clearInterval(timer);
  }, [editingDoc, editContent, editTitle]);

  const handleOpenEditor = (doc: Doc) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content);
    setLastSaved(null);
  };

  const handleCloseEditor = () => {
    saveDocument();
    setEditingDoc(null);
    toast('Document saved', 'success');
  };

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center border border-purple-500/30">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-base tracking-tight">Memory Bank</h1>
            <p className="text-sm text-text-muted mt-0.5">Global knowledge base and context storage</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search across all documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-subtle border border-border-base rounded-lg pl-9 pr-4 py-2 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong transition-all"
              />
            </div>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base cursor-pointer focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'size')}
              className="bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base cursor-pointer focus:outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>

          {/* Timeframe Filters */}
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-text-muted" />
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mr-1">Timeframe:</span>
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeTimeframe === tf
                    ? 'bg-text-base text-bg-base'
                    : 'text-text-muted hover:text-text-base hover:bg-bg-panel'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {filteredAndSortedDocs.length === 0 ? (
          <EmptyState
            icon={<Search size={32} />}
            title="No documents found"
            description="Try adjusting your search or timeframe filter."
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredAndSortedDocs.map(doc => (
              <motion.div
                key={doc.id}
                variants={staggerItem}
                onClick={() => handleOpenEditor(doc)}
                className="bg-bg-panel border border-border-base rounded-xl p-5 flex flex-col gap-3 shadow-elevation-card-rest hover:shadow-elevation-card-hover hover:border-border-strong transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-bg-subtle border border-border-base flex items-center justify-center text-text-muted group-hover:text-accent transition-colors shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text-base truncate">{doc.title}</h3>
                    <p className="text-[10px] text-text-muted">{doc.date}</p>
                  </div>
                </div>

                <p className="text-xs text-text-muted line-clamp-3 leading-relaxed flex-1">
                  {doc.content.replace(/#/g, '').trim()}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-border-base">
                  <div className="flex items-center gap-3 text-[10px] text-text-muted">
                    <span className="flex items-center gap-1"><Database size={10} /> {doc.size}</span>
                    <span className="flex items-center gap-1"><Hash size={10} /> {doc.words}w</span>
                  </div>
                  <Badge variant="muted">{doc.tag}</Badge>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {editingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-bg-panel border border-border-strong rounded-xl shadow-elevation-modal w-full max-w-4xl h-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Editor Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-border-base bg-bg-subtle shrink-0">
                <div className="flex items-center gap-3 flex-1">
                  <FileText size={18} className="text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-transparent text-lg font-semibold text-text-base focus:outline-none flex-1"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-text-muted">
                    {isSaving ? (
                      <span className="text-amber-500">Saving...</span>
                    ) : lastSaved ? (
                      <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</span>
                    ) : null}
                  </div>
                  <Button variant="secondary" size="sm" onClick={saveDocument}><Save size={14} /> Save</Button>
                  <button onClick={handleCloseEditor} className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-base rounded-md transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Editor Body */}
              <div className="flex-1 overflow-hidden">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full p-8 bg-bg-base text-text-base text-sm leading-relaxed resize-none focus:outline-none custom-scrollbar font-mono"
                  placeholder="Start typing..."
                />
              </div>

              {/* Word count */}
              <div className="px-6 py-2 border-t border-border-base bg-bg-subtle text-xs text-text-muted">
                {editContent.split(/\s+/).filter(w => w.length > 0).length} words
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
