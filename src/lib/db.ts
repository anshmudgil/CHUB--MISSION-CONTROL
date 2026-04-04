import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Store in ~/.openclaw on Railway (matches the existing production app)
const DB_DIR = path.join(os.homedir(), '.openclaw');
const DB_PATH = path.join(DB_DIR, 'mission-control.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
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
`);

export default db;
