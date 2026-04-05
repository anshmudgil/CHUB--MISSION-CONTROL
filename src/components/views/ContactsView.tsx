'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Mail, Clock, Plus, X } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { staggerContainer, staggerItem } from '@/lib/motion';

type Contact = {
  id: string;
  name: string;
  role: string;
  category: string;
  handle: string;
  timezone: string;
  notes?: string;
};

const DEFAULT_CONTACTS: Contact[] = [
  { id: '1', name: 'Henry', role: 'Chief of Staff', category: 'Internal Team', handle: '@henry_os', timezone: 'PST (UTC-8)', notes: 'Primary orchestrator' },
  { id: '2', name: 'Charlie', role: 'Infrastructure Engineer', category: 'Internal Team', handle: '@charlie_infra', timezone: 'EST (UTC-5)', notes: 'Handles local models' },
  { id: '3', name: 'Sarah Jenkins', role: 'Video Editor', category: 'Content Team', handle: 'sarah@example.com', timezone: 'GMT (UTC+0)', notes: 'Prefers async communication' },
  { id: '4', name: 'David Chen', role: 'Sponsorships', category: 'External Contacts', handle: 'david.c@agency.com', timezone: 'PST (UTC-8)' },
  { id: '5', name: 'Acme Corp', role: 'Enterprise Client', category: 'Clients', handle: 'team@acme.com', timezone: 'CST (UTC-6)', notes: 'Monthly retainer' },
];

const CATEGORIES = ['Internal Team', 'Content Team', 'External Contacts', 'Clients'];

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  // New contact form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCategory, setNewCategory] = useState('Internal Team');
  const [newHandle, setNewHandle] = useState('');
  const [newTimezone, setNewTimezone] = useState('');
  const [newNotes, setNewNotes] = useState('');

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

  const handleAddContact = () => {
    if (!newName.trim()) return;
    const contact: Contact = {
      id: Date.now().toString(),
      name: newName,
      role: newRole,
      category: newCategory,
      handle: newHandle,
      timezone: newTimezone,
      notes: newNotes || undefined,
    };
    setContacts(prev => [...prev, contact]);
    setShowAddModal(false);
    setNewName(''); setNewRole(''); setNewHandle(''); setNewTimezone(''); setNewNotes('');
    toast('Contact added', 'success');
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
          <Button onClick={() => setShowAddModal(true)} size="sm"><Plus size={14} /> Add Contact</Button>
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
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {filteredAndSortedContacts.length === 0 ? (
          <EmptyState
            icon={<Search size={32} />}
            title="No contacts found"
            description="Try adjusting your search or add a new contact."
            action={<Button size="sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Contact</Button>}
          />
        ) : (
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
                onClick={() => setSelectedContact(contact)}
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

      {/* Contact Detail Modal */}
      <Modal open={!!selectedContact} onClose={() => setSelectedContact(null)} size="sm">
        {selectedContact && (
          <>
            <ModalHeader onClose={() => setSelectedContact(null)}>
              <div className="flex items-center gap-3">
                <Avatar name={selectedContact.name} size="lg" />
                <div>
                  <h2 className="text-lg font-semibold text-text-base">{selectedContact.name}</h2>
                  <p className="text-sm text-text-muted">{selectedContact.role}</p>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Category</p>
                  <Badge variant="muted">{selectedContact.category}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Timezone</p>
                  <p className="text-sm text-text-base">{selectedContact.timezone}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Handle</p>
                <p className="text-sm text-text-base">{selectedContact.handle}</p>
              </div>
              {selectedContact.notes && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-text-muted">{selectedContact.notes}</p>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setSelectedContact(null)}>Close</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
