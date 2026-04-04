// Database layer using libsql (no native bindings — works on Node 18/20 without Python/node-gyp)
import { createClient } from '@libsql/client';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_DIR = path.join(os.homedir(), '.openclaw');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'mission-control.db');

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
}

export { client, ensureInit };
