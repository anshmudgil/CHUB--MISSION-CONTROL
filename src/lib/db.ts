// Database layer using libsql (no native bindings — works on Node 18/20 without Python/node-gyp)
import { createClient } from '@libsql/client';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(os.homedir(), '.openclaw', 'mission-control.db');
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const client = createClient({
  url: `file:${DB_PATH}`,
});

// Initialize tables on first use
let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initialized = true;

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      agent TEXT DEFAULT 'VELO',
      description TEXT DEFAULT '',
      frequency TEXT DEFAULT 'daily',
      cron_expression TEXT,
      status TEXT DEFAULT 'active',
      color TEXT DEFAULT '#3b82f6',
      last_run_at TEXT,
      next_run_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS acp_messages_persistent (
      id TEXT PRIMARY KEY,
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL DEFAULT 'backlog',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assignee_name TEXT DEFAULT 'Ansh',
      assignee_initial TEXT DEFAULT 'A',
      assignee_color TEXT DEFAULT 'bg-emerald-500/20 text-emerald-500',
      tag_label TEXT DEFAULT '',
      tag_color TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      project TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      stage TEXT NOT NULL DEFAULT 'ideas',
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      content_type TEXT DEFAULT 'post',
      platform TEXT DEFAULT 'linkedin',
      status TEXT DEFAULT 'draft',
      scheduled_for TEXT,
      approved_at TEXT,
      approved_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kpis (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      target TEXT,
      unit TEXT DEFAULT '',
      category TEXT DEFAULT 'product',
      recorded_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      shipped TEXT DEFAULT '',
      blockers TEXT DEFAULT '',
      focus TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      company TEXT DEFAULT '',
      category TEXT DEFAULT 'Internal Team',
      handle TEXT DEFAULT '',
      timezone TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      follow_up_stage TEXT DEFAULT 'New Lead',
      last_contacted TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      time TEXT DEFAULT '',
      type TEXT DEFAULT 'Velocity OS',
      color TEXT DEFAULT '',
      event_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memory_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      tag TEXT DEFAULT 'General',
      words INTEGER DEFAULT 0,
      size TEXT DEFAULT '0 KB',
      date TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planning_objectives (
      id TEXT PRIMARY KEY,
      quarter TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT 'blue',
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planning_initiatives (
      id TEXT PRIMARY KEY,
      objective_id TEXT NOT NULL REFERENCES planning_objectives(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS planning_projects (
      id TEXT PRIMARY KEY,
      initiative_id TEXT NOT NULL REFERENCES planning_initiatives(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      task_count INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agent_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT DEFAULT '',
      agent_group TEXT DEFAULT 'Core',
      responsibilities TEXT DEFAULT '',
      tonality TEXT DEFAULT '',
      personality_traits TEXT DEFAULT '',
      resources TEXT DEFAULT '',
      reports_to TEXT DEFAULT '',
      color TEXT DEFAULT 'text-blue-500 bg-blue-500/10 border-blue-500/30',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed starter tasks if tasks table is empty
  const taskCount = await client.execute('SELECT COUNT(*) as count FROM tasks');
  const count = (taskCount.rows[0] as unknown as { count: number }).count;
  if (count === 0) {
    await client.executeMultiple(`
      INSERT INTO tasks (id, column_id, title, project, priority, position) VALUES
        ('task-1', 'backlog', 'Fix Redis nonce race condition', 'VelocityOS', 'high', 0);
      INSERT INTO tasks (id, column_id, title, project, priority, position) VALUES
        ('task-2', 'backlog', 'Complete visual editor E2E test', 'VelocityOS', 'high', 1);
      INSERT INTO tasks (id, column_id, title, project, priority, position) VALUES
        ('task-3', 'backlog', 'Write SETUP_GUIDE.md', 'VelocityOS', 'medium', 2);
    `);
  }

  // Seed contacts
  const contactCount = await client.execute('SELECT COUNT(*) as count FROM contacts');
  if ((contactCount.rows[0] as unknown as { count: number }).count === 0) {
    await client.executeMultiple(`
      INSERT INTO contacts (id, name, role, category, handle, timezone, notes, follow_up_stage) VALUES
        ('ct-1', 'Henry', 'Chief of Staff', 'Internal Team', '@henry_os', 'PST (UTC-8)', 'Primary orchestrator', 'Contacted');
      INSERT INTO contacts (id, name, role, category, handle, timezone, notes, follow_up_stage) VALUES
        ('ct-2', 'Charlie', 'Infrastructure Engineer', 'Internal Team', '@charlie_infra', 'EST (UTC-5)', 'Handles local models', 'Contacted');
      INSERT INTO contacts (id, name, role, category, handle, timezone, notes, follow_up_stage) VALUES
        ('ct-3', 'Sarah Jenkins', 'Video Editor', 'Content Team', 'sarah@example.com', 'GMT (UTC+0)', 'Prefers async communication', 'Meeting Scheduled');
      INSERT INTO contacts (id, name, role, category, handle, timezone, notes, follow_up_stage) VALUES
        ('ct-4', 'David Chen', 'Sponsorships', 'External Contacts', 'david.c@agency.com', 'PST (UTC-8)', '', 'Proposal Sent');
      INSERT INTO contacts (id, name, role, category, handle, timezone, notes, follow_up_stage) VALUES
        ('ct-5', 'Acme Corp', 'Enterprise Client', 'Clients', 'team@acme.com', 'CST (UTC-6)', 'Monthly retainer', 'Closed Won');
    `);
  }

  // Seed calendar events (event_date relative to today)
  const calCount = await client.execute('SELECT COUNT(*) as count FROM calendar_events');
  if ((calCount.rows[0] as unknown as { count: number }).count === 0) {
    const today = new Date();
    const fmt = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d.toISOString().split('T')[0];
    };
    const t0 = fmt(0), t1 = fmt(1), t2 = fmt(2);
    await client.executeMultiple(`
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-1','Trend Radar','12:00 PM','Automations','border-orange-500/50 text-orange-500 bg-orange-500/10','${t0}','Daily trend analysis across Twitter and LinkedIn.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-2','Morning Kickoff','6:55 AM','Velocity OS','border-zinc-500/50 text-zinc-400 bg-zinc-500/10','${t0}','System health check and daily priorities.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-3','YouTube Recording','7:00 AM','Content','border-red-500/50 text-red-500 bg-red-500/10','${t0}','Recording session for the new OpenClaw video.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-4','Scout Morning Research','8:00 AM','Automations','border-emerald-500/50 text-emerald-500 bg-emerald-500/10','${t0}','Scout agent gathering daily intel.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-5','Client Sync: Acme','9:00 AM','Agency','border-indigo-500/50 text-indigo-400 bg-indigo-500/10','${t0}','Weekly sync with Acme Corp.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-6','Evening Wrap Up','9:00 PM','Velocity OS','border-purple-500/50 text-purple-400 bg-purple-500/10','${t0}','End of day system state save and reporting.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-7','LinkedIn Post Draft','7:00 AM','Content','border-blue-500/50 text-blue-500 bg-blue-500/10','${t1}','Drafting the weekly LinkedIn post.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-8','Morning Kickoff','6:55 AM','Velocity OS','border-zinc-500/50 text-zinc-400 bg-zinc-500/10','${t1}','System health check and daily priorities.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-9','Client Sync: Globex','9:00 AM','Agency','border-indigo-500/50 text-indigo-400 bg-indigo-500/10','${t1}','Weekly sync with Globex.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-10','YouTube Recording','7:00 AM','Content','border-red-500/50 text-red-500 bg-red-500/10','${t2}','Recording session for the new OpenClaw video.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-11','Morning Kickoff','6:55 AM','Velocity OS','border-zinc-500/50 text-zinc-400 bg-zinc-500/10','${t2}','System health check and daily priorities.');
      INSERT INTO calendar_events (id, title, time, type, color, event_date, description) VALUES
        ('ce-12','Daily Digest','9:00 AM','Agency','border-indigo-500/50 text-indigo-400 bg-indigo-500/10','${t2}','Daily digest of agency activities.');
    `);
  }

  // Seed memory docs
  const memCount = await client.execute('SELECT COUNT(*) as count FROM memory_docs');
  if ((memCount.rows[0] as unknown as { count: number }).count === 0) {
    await client.executeMultiple(`
      INSERT INTO memory_docs (id, title, content, tag, words, size, date) VALUES
        ('md-1', '2026-02-26.md', '# 2026-02-26 — Thursday\n\n## Qwen 3.5 Medium Series Research\n\nKey findings:\n- 35B-A3B beats old 235B flagship\n- 122B-A10B matches/beats 397B on agent benchmarks\n- 27B dense gets best SWE-bench of the medium trio\n- All have MLX community ports available', 'Journal', 772, '4.8 KB', '2026-02-26');
      INSERT INTO memory_docs (id, title, content, tag, words, size, date) VALUES
        ('md-2', '2026-02-25-vibe-coding-mainstream.md', '# Newsletter Draft — Feb 25, 2026\n\nVibe coding just went mainstream. The New York Times published an opinion piece about it.\n\nA year ago, this was a niche thing. Now it has a Wikipedia page. A company called Code Metal just raised $10M.\n\nThis is the tipping point.', 'Other', 583, '3.2 KB', '2026-02-25');
    `);
  }
}

export { client, ensureInit };
