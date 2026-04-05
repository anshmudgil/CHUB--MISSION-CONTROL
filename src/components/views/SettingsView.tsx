'use client';

import React, { useState } from 'react';
import { Settings, Sliders, Activity, CheckCircle, XCircle, AlertCircle, Github, Slack, Globe, ShoppingBag, FileText, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';

type IntegrationStatus = 'connected' | 'disconnected' | 'error';

interface Integration {
  id: string;
  name: string;
  icon: React.ElementType;
  status: IntegrationStatus;
  lastSync?: string;
}

const INTEGRATIONS: Integration[] = [
  { id: 'shopify', name: 'Shopify', icon: ShoppingBag, status: 'connected', lastSync: '2 mins ago' },
  { id: 'notion', name: 'Notion', icon: FileText, status: 'connected', lastSync: 'Just now' },
  { id: 'ga4', name: 'Google Analytics 4', icon: BarChart, status: 'connected', lastSync: '1 hour ago' },
  { id: 'slack', name: 'Slack', icon: Slack, status: 'connected', lastSync: '5 mins ago' },
  { id: 'github', name: 'GitHub', icon: Github, status: 'connected', lastSync: '10 mins ago' },
  { id: 'vercel', name: 'Vercel', icon: Globe, status: 'error', lastSync: 'Failed 2 hours ago' },
];

const statusBadge: Record<IntegrationStatus, { variant: 'success' | 'muted' | 'error'; label: string }> = {
  connected: { variant: 'success', label: 'Connected' },
  disconnected: { variant: 'muted', label: 'Disconnected' },
  error: { variant: 'error', label: 'Error' },
};

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('ai');
  const [threshold, setThreshold] = useState(80);
  const [experimentFreq, setExperimentFreq] = useState('medium');
  const [approvalGate, setApprovalGate] = useState(true);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const { toast } = useToast();

  const handleSave = () => {
    toast('Settings saved', 'success');
  };

  const toggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newStatus: IntegrationStatus = i.status === 'connected' ? 'disconnected' : 'connected';
      return { ...i, status: newStatus, lastSync: newStatus === 'connected' ? 'Just now' : undefined };
    }));
    toast('Integration updated', 'info');
  };

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      <div className="px-6 py-5 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-500/20 text-zinc-400 flex items-center justify-center border border-zinc-500/30">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-base tracking-tight">Settings</h1>
              <p className="text-sm text-text-muted mt-0.5">Manage system configurations and integrations</p>
            </div>
          </div>
          <Button size="sm" onClick={handleSave}>Save Changes</Button>
        </div>

        <div className="mt-5">
          <Tabs
            tabs={[
              { id: 'ai', label: 'AI Configuration' },
              { id: 'integrations', label: 'Integrations' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto">
          {activeTab === 'ai' && (
            <section className="bg-bg-panel border border-border-base rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-base flex items-center gap-2">
                <Sliders size={16} className="text-blue-500" />
                <h2 className="text-sm font-medium text-text-base">VELO Agent Configuration</h2>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-text-base">Confidence Threshold</label>
                    <span className="text-sm text-text-muted font-mono">{threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50" max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <p className="text-xs text-text-muted mt-2">Minimum confidence required for VELO to execute actions autonomously.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-text-base block mb-2">Experiment Frequency</label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map((freq) => (
                      <Button
                        key={freq}
                        variant={experimentFreq === freq ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setExperimentFreq(freq)}
                        className="flex-1 capitalize"
                      >
                        {freq}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-2">How often VELO should propose new A/B tests or content variations.</p>
                </div>

                <div className="pt-4 border-t border-border-base">
                  <Toggle
                    checked={approvalGate}
                    onChange={setApprovalGate}
                    label="Require Approval Gates"
                    description="Force human review before publishing content or deploying code."
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'integrations' && (
            <section className="bg-bg-panel border border-border-base rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-base flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                <h2 className="text-sm font-medium text-text-base">Integrations Status</h2>
              </div>
              <div className="divide-y divide-border-base">
                {integrations.map((integration) => {
                  const badge = statusBadge[integration.status];
                  return (
                    <div key={integration.id} className="p-4 flex items-center justify-between hover:bg-bg-subtle transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-bg-base border border-border-base flex items-center justify-center text-text-base">
                          <integration.icon size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-text-base">{integration.name}</h3>
                          {integration.lastSync && (
                            <p className="text-xs text-text-muted">Last sync: {integration.lastSync}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={badge.variant} dot>{badge.label}</Badge>
                        <Button
                          variant={integration.status === 'connected' ? 'ghost' : 'secondary'}
                          size="sm"
                          onClick={() => toggleIntegration(integration.id)}
                        >
                          {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
