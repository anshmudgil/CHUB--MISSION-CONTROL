'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Key, Link2, Link2Off, Plus, Eye, EyeOff, Copy, Trash2, BookOpen, Check } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

// ---- Types ----------------------------------------------------------------

interface Service {
  id: string;
  name: string;
  description: string;
  color: string;
  textColor: string;
  initial: string;
}

interface Secret {
  id: string;
  name: string;
  value: string;
}

// ---- Static data ----------------------------------------------------------

const SERVICES: Service[] = [
  { id: 'slack', name: 'Slack', description: 'Team messaging and notifications', color: 'bg-violet-500/20 border-violet-500/30', textColor: 'text-violet-400', initial: 'SL' },
  { id: 'github', name: 'GitHub', description: 'Source control and CI/CD', color: 'bg-zinc-100/10 border-zinc-100/20', textColor: 'text-zinc-100', initial: 'GH' },
  { id: 'notion', name: 'Notion', description: 'Docs, wikis and databases', color: 'bg-bg-subtle border-border-base', textColor: 'text-text-base', initial: 'NO' },
  { id: 'airtable', name: 'Airtable', description: 'Spreadsheet-database hybrid', color: 'bg-green-500/20 border-green-500/30', textColor: 'text-green-400', initial: 'AT' },
  { id: 'twitter', name: 'Twitter / X', description: 'Social media publishing', color: 'bg-sky-500/20 border-sky-500/30', textColor: 'text-sky-400', initial: 'TW' },
  { id: 'youtube', name: 'YouTube', description: 'Video publishing and analytics', color: 'bg-red-500/20 border-red-500/30', textColor: 'text-red-400', initial: 'YT' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Professional network publishing', color: 'bg-blue-500/20 border-blue-500/30', textColor: 'text-blue-400', initial: 'LI' },
  { id: 'zapier', name: 'Zapier', description: 'Workflow automation platform', color: 'bg-orange-500/20 border-orange-500/30', textColor: 'text-orange-400', initial: 'ZP' },
];

const LOCAL_INTEGRATIONS_KEY = 'mc-integrations';
const LOCAL_SECRETS_KEY = 'mc-secrets';
const LOCAL_DOCS_KEY = 'mc-docs';

// ---- Component ------------------------------------------------------------

export function IntegrationsView() {
  const [activeTab, setActiveTab] = useState('integrations');
  const [connectedServices, setConnectedServices] = useState<string[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [agentDocs, setAgentDocs] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);
  const [addSecretOpen, setAddSecretOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const { toast } = useToast();

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedIntegrations = localStorage.getItem(LOCAL_INTEGRATIONS_KEY);
      if (savedIntegrations) setConnectedServices(JSON.parse(savedIntegrations));
      const savedSecrets = localStorage.getItem(LOCAL_SECRETS_KEY);
      if (savedSecrets) setSecrets(JSON.parse(savedSecrets));
      const savedDocs = localStorage.getItem(LOCAL_DOCS_KEY);
      if (savedDocs) setAgentDocs(savedDocs);
    } catch {
      // ignore parse errors
    }
  }, []);

  // ---- Integrations handlers ----------------------------------------------

  const handleConnect = (serviceId: string) => {
    const updated = [...connectedServices, serviceId];
    setConnectedServices(updated);
    localStorage.setItem(LOCAL_INTEGRATIONS_KEY, JSON.stringify(updated));
    const service = SERVICES.find((s) => s.id === serviceId);
    toast(`${service?.name} connected`, 'success');
  };

  const handleDisconnect = (serviceId: string) => {
    const updated = connectedServices.filter((id) => id !== serviceId);
    setConnectedServices(updated);
    localStorage.setItem(LOCAL_INTEGRATIONS_KEY, JSON.stringify(updated));
    const service = SERVICES.find((s) => s.id === serviceId);
    toast(`${service?.name} disconnected`, 'info');
  };

  // ---- Secrets handlers ---------------------------------------------------

  const handleAddSecret = () => {
    if (!newSecretName.trim() || !newSecretValue.trim()) return;
    const newSecret: Secret = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: newSecretName.trim(),
      value: newSecretValue.trim(),
    };
    const updated = [...secrets, newSecret];
    setSecrets(updated);
    localStorage.setItem(LOCAL_SECRETS_KEY, JSON.stringify(updated));
    setNewSecretName('');
    setNewSecretValue('');
    setAddSecretOpen(false);
    toast('Secret added', 'success');
  };

  const handleDeleteSecret = (id: string) => {
    const updated = secrets.filter((s) => s.id !== id);
    setSecrets(updated);
    localStorage.setItem(LOCAL_SECRETS_KEY, JSON.stringify(updated));
    toast('Secret deleted', 'info');
  };

  const handleToggleReveal = (id: string) => {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopySecret = (secret: Secret) => {
    navigator.clipboard.writeText(secret.value).then(() => {
      setCopiedSecretId(secret.id);
      toast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedSecretId(null), 2000);
    });
  };

  // ---- Docs handler -------------------------------------------------------

  const handleDocsSave = () => {
    localStorage.setItem(LOCAL_DOCS_KEY, agentDocs);
    toast('Documentation saved', 'success');
  };

  // ---- Render -------------------------------------------------------------

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Key size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-base tracking-tight">Integrations</h1>
            <p className="text-sm text-text-muted mt-0.5">Connect services, manage API keys, and add agent documentation</p>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'integrations', label: 'Integrations', icon: <Link2 size={14} /> },
            { id: 'secrets', label: 'API Keys & Secrets', icon: <Key size={14} /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {activeTab === 'integrations' && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {SERVICES.map((service) => {
              const isConnected = connectedServices.includes(service.id);
              return (
                <motion.div
                  key={service.id}
                  variants={staggerItem}
                  className="bg-bg-panel border border-border-base rounded-xl p-5 flex flex-col gap-4 hover:border-border-strong transition-all"
                >
                  {/* Icon + name */}
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0', service.color, service.textColor)}>
                      {service.initial}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-text-base truncate">{service.name}</h3>
                      <p className="text-[10px] text-text-muted leading-snug mt-0.5">{service.description}</p>
                    </div>
                  </div>

                  {/* Status + action */}
                  <div className="flex items-center justify-between">
                    {isConnected ? (
                      <Badge variant="success" dot>Connected</Badge>
                    ) : (
                      <Badge variant="muted">Not connected</Badge>
                    )}
                    {isConnected ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(service.id)}
                        className="text-text-muted hover:text-red-400"
                      >
                        <Link2Off size={13} />
                        Disconnect
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => handleConnect(service.id)}>
                        <Link2 size={13} />
                        Connect
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'secrets' && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            {/* Secrets header */}
            <motion.div variants={staggerItem} className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-text-base">API Keys &amp; Secrets</h2>
                <p className="text-xs text-text-muted mt-0.5">Stored locally in your browser. Never sent to the server.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setAddSecretOpen(true)}>
                <Plus size={14} />
                Add Secret
              </Button>
            </motion.div>

            {/* Secrets list */}
            {secrets.length === 0 ? (
              <motion.div variants={staggerItem} className="text-center py-16 text-text-muted text-sm">
                No secrets yet. Click "Add Secret" to store an API key.
              </motion.div>
            ) : (
              <motion.div variants={staggerItem} className="flex flex-col gap-2">
                {secrets.map((secret) => {
                  const isRevealed = revealedSecrets.has(secret.id);
                  const isCopied = copiedSecretId === secret.id;
                  return (
                    <div
                      key={secret.id}
                      className="bg-bg-panel border border-border-base rounded-xl px-4 py-3 flex items-center gap-4 hover:border-border-strong transition-all"
                    >
                      {/* Name */}
                      <span className="text-sm font-medium text-text-base w-48 shrink-0 truncate font-mono">
                        {secret.name}
                      </span>

                      {/* Masked value */}
                      <span className="flex-1 text-sm text-text-muted font-mono tracking-widest truncate">
                        {isRevealed ? secret.value : '●●●●●●●●●●●●'}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleReveal(secret.id)}
                          className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-subtle rounded-md transition-colors"
                          title={isRevealed ? 'Hide' : 'Reveal'}
                        >
                          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleCopySecret(secret)}
                          className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-subtle rounded-md transition-colors"
                          title="Copy"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => handleDeleteSecret(secret.id)}
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-bg-subtle rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Documentation section — always visible */}
        <div className="mt-8 border-t border-border-base pt-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-base">Agent Documentation</h2>
            <span className="text-[10px] text-text-muted ml-2">Auto-saves on blur</span>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Paste API docs, SOPs, or reference material that agents can access during their tasks.
          </p>
          <Textarea
            value={agentDocs}
            onChange={(e) => setAgentDocs(e.target.value)}
            onBlur={handleDocsSave}
            placeholder="Paste documentation, API references, standard operating procedures..."
            className="min-h-[240px] font-mono text-xs leading-relaxed"
          />
        </div>
      </div>

      {/* Add Secret Modal */}
      <Modal open={addSecretOpen} onClose={() => setAddSecretOpen(false)} size="sm">
        <ModalHeader onClose={() => setAddSecretOpen(false)}>
          <h2 className="text-base font-semibold text-text-base">Add Secret</h2>
          <p className="text-xs text-text-muted mt-0.5">Stored only in your browser's localStorage.</p>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <Input
            label="Key Name"
            placeholder="e.g. OPENAI_API_KEY"
            value={newSecretName}
            onChange={(e) => setNewSecretName(e.target.value)}
            className="font-mono"
          />
          <Input
            label="Key Value"
            placeholder="sk-..."
            type="password"
            value={newSecretValue}
            onChange={(e) => setNewSecretValue(e.target.value)}
            className="font-mono"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAddSecretOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleAddSecret}
            disabled={!newSecretName.trim() || !newSecretValue.trim()}
          >
            Save Secret
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
