'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Mail, Clock, Plus, X, Edit2 } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

type Contact = {
  id: string;
  name: string;
  role: string;
  company?: string;
  category: string;
  handle: string;
  timezone: string;
  notes?: string;
  followUpStage?: string;
  lastContacted?: string;
};

const CATEGORIES = ['Internal Team', 'Content Team', 'External Contacts', 'Clients'];
const FOLLOW_UP_STAGES = ['New Lead', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Closed Won', 'Closed Lost'];

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/contacts')
      .then(r => r.json())
      .then((data: Record<string, string>[]) => setContacts(data.map(c => ({
        ...c,
        followUpStage: c.follow_up_stage || 'New Lead',
        lastContacted: c.last_contacted,
      })) as Contact[]))
      .catch(() => toast('Failed to load contacts', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // New contact form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCategory, setNewCategory] = useState('Internal Team');
  const [newHandle, setNewHandle] = useState('');
  const [newTimezone, setNewTimezone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Edit contact state
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editCategory, setEditCategory] = useState('Internal Team');
  const [editHandle, setEditHandle] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFollowUpStage, setEditFollowUpStage] = useState('New Lead');

  const filteredAndSortedContacts = useMemo(() => {
    let result = contacts;
    if (activeCategory) result = result.filter(c => c.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) =>
      sortBy === 'name' ? a.name.localeCompare(b.name) : a.role.localeCompare(b.role)
    );
  }, [contacts, searchQuery, activeCategory, sortBy]);

  const handleAddContact = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, role: newRole, category: newCategory, handle: newHandle, timezone: newTimezone, notes: newNotes || undefined, follow_up_stage: 'New Lead' }),
      });
      const data = await res.json();
      const contact: Contact = {
        id: data.id,
        name: newName,
        role: newRole,
        category: newCategory,
        handle: newHandle,
        timezone: newTimezone,
        notes: newNotes || undefined,
        followUpStage: 'New Lead',
      };
      setContacts(prev => [...prev, contact]);
      setShowAddModal(false);
      setNewName(''); setNewRole(''); setNewHandle(''); setNewTimezone(''); setNewNotes('');
      toast('Contact added', 'success');
    } catch {
      toast('Failed to add contact', 'error');
    }
  };

  const openEditModal = (c: Contact) => {
    setEditingContact(c);
    setEditName(c.name);
    setEditRole(c.role);
    setEditCategory(c.category);
    setEditHandle(c.handle);
    setEditTimezone(c.timezone);
    setEditNotes(c.notes || '');
    setEditFollowUpStage(c.followUpStage || 'New Lead');
  };

  const handleSaveContact = async () => {
    if (!editingContact) return;
    try {
      await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, role: editRole, category: editCategory, handle: editHandle, timezone: editTimezone, notes: editNotes, follow_up_stage: editFollowUpStage }),
      });
      setContacts(prev => prev.map(c =>
        c.id === editingContact.id
          ? {
              ...c,
              name: editName,
              role: editRole,
              category: editCategory,
              handle: editHandle,
              timezone: editTimezone,
              notes: editNotes || undefined,
              followUpStage: editFollowUpStage,
            }
          : c
      ));
      setEditingContact(null);
      toast('Contact updated', 'success');
    } catch {
      toast('Failed to update contact', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center border border-blue-500/30">
              <Mail size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-base tracking-tight">Contacts & CRM</h1>
              <p className="text-sm text-text-muted mt-0.5">Manage your network and team directory</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddModal(true)} size="sm"><Plus size={14} /> Add Contact</Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search contacts..."
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
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-bg-panel border border-border-base rounded-lg px-3 py-2 text-sm text-text-base cursor-pointer focus:outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="role">Sort by Role</option>
          </select>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-bg-subtle border border-border-base rounded-lg p-0.5">
            {(['grid', 'list', 'kanban'] as const).map((mode) => {
              const label = mode === 'grid' ? 'Grid' : mode === 'list' ? 'List' : 'Pipeline';
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    viewMode === mode
                      ? 'bg-bg-panel text-text-base shadow-sm'
                      : 'text-text-muted hover:text-text-base'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn('flex-1 overflow-hidden', viewMode !== 'kanban' && 'overflow-y-auto')}>
        {filteredAndSortedContacts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Search size={32} />}
              title="No contacts found"
              description="Try adjusting your search or add a new contact."
              action={<Button size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Contact</Button>}
            />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 overflow-y-auto h-full custom-scrollbar">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredAndSortedContacts.map(contact => (
                <motion.div
                  key={contact.id}
                  variants={staggerItem}
                  onClick={() => openEditModal(contact)}
                  className="bg-bg-panel border border-border-base rounded-xl p-5 flex flex-col shadow-elevation-card-rest hover:shadow-elevation-card-hover hover:border-border-strong transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={contact.name} size="lg" />
                      <div>
                        <h3 className="text-sm font-medium text-text-base">{contact.name}</h3>
                        <p className="text-xs text-text-muted">{contact.role}</p>
                      </div>
                    </div>
                    <Badge variant="muted">{contact.category}</Badge>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Mail size={12} />
                      <span className="truncate">{contact.handle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Clock size={12} />
                      <span>{contact.timezone}</span>
                    </div>
                    {contact.notes && (
                      <div className="mt-3 pt-3 border-t border-border-base">
                        <p className="text-xs text-text-muted line-clamp-2 italic">&ldquo;{contact.notes}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="flex flex-col overflow-y-auto h-full custom-scrollbar">
            {/* Header row */}
            <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-4 px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b border-border-base">
              <span>Name</span>
              <span>Role / Company</span>
              <span>Handle</span>
              <span>Category</span>
              <span></span>
            </div>
            {filteredAndSortedContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => openEditModal(contact)}
                className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-4 px-4 py-3 hover:bg-bg-panel/50 border-b border-border-base cursor-pointer items-center transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={contact.name} size="sm" />
                  <span className="text-sm text-text-base">{contact.name}</span>
                </div>
                <span className="text-xs text-text-muted">{contact.role}</span>
                <span className="text-xs text-text-muted truncate">{contact.handle}</span>
                <Badge variant="muted">{contact.category}</Badge>
                <button
                  className="p-1 text-text-muted hover:text-text-base rounded-md"
                  onClick={e => { e.stopPropagation(); openEditModal(contact); }}
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Kanban / Pipeline view */
          <div className="flex gap-4 overflow-x-auto p-6 h-full custom-scrollbar">
            {FOLLOW_UP_STAGES.map(stage => {
              const stageContacts = filteredAndSortedContacts.filter(c => (c.followUpStage || 'New Lead') === stage);
              return (
                <div key={stage} className="flex-shrink-0 w-60 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{stage}</span>
                    <Badge variant="muted">{stageContacts.length}</Badge>
                  </div>
                  {stageContacts.map(c => (
                    <div
                      key={c.id}
                      onClick={() => openEditModal(c)}
                      className="bg-bg-panel border border-border-base rounded-lg p-3 cursor-pointer hover:border-border-strong transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={c.name} size="xs" />
                        <span className="text-sm font-medium text-text-base">{c.name}</span>
                      </div>
                      <p className="text-xs text-text-muted">{c.role}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader onClose={() => setShowAddModal(false)}>
          <h2 className="text-lg font-semibold text-text-base">Add Contact</h2>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Input label="Name" placeholder="Contact name" value={newName} onChange={e => setNewName(e.target.value)} />
          <Input label="Role" placeholder="Role or title" value={newRole} onChange={e => setNewRole(e.target.value)} />
          <Select
            label="Category"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
          />
          <Input label="Handle / Email" placeholder="@handle or email" value={newHandle} onChange={e => setNewHandle(e.target.value)} />
          <Input label="Timezone" placeholder="PST (UTC-8)" value={newTimezone} onChange={e => setNewTimezone(e.target.value)} />
          <Textarea label="Notes" placeholder="Optional notes..." value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={2} />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
          <Button onClick={handleAddContact} disabled={!newName.trim()}>Add Contact</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal open={!!editingContact} onClose={() => setEditingContact(null)} size="md">
        {editingContact && (
          <>
            <ModalHeader onClose={() => setEditingContact(null)}>
              <h2 className="text-lg font-semibold">Edit Contact</h2>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <Input label="Name" value={editName} onChange={e => setEditName(e.target.value)} />
              <Input label="Role" value={editRole} onChange={e => setEditRole(e.target.value)} />
              <Select
                label="Category"
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                options={CATEGORIES.map(c => ({ value: c, label: c }))}
              />
              <Input label="Handle / Email" value={editHandle} onChange={e => setEditHandle(e.target.value)} />
              <Input label="Timezone" value={editTimezone} onChange={e => setEditTimezone(e.target.value)} />
              <Select
                label="Follow-up Stage"
                value={editFollowUpStage}
                onChange={e => setEditFollowUpStage(e.target.value)}
                options={FOLLOW_UP_STAGES.map(s => ({ value: s, label: s }))}
              />
              <Textarea label="Notes" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setEditingContact(null)}>Cancel</Button>
              <Button onClick={handleSaveContact}>Save Changes</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
