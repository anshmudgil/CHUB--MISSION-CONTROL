import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { sendACPMessage } from '@/lib/acp';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type Trigger = 'morning_briefing' | 'status_check' | 'task_dispatch';

const PROMPTS: Record<Trigger, string> = {
  morning_briefing: 'Generate a concise morning briefing for the agent team. Include top 3 priorities for today and one metric to watch. Keep it under 100 words.',
  status_check: 'Report current system status for Mission Control VOS. Mention agent health, active tasks, and any flags. Keep it under 80 words.',
  task_dispatch: 'Review the current task queue and dispatch the top 2 tasks to appropriate agents. Be specific about who handles what. Keep it under 120 words.',
};

// POST /api/opencore — trigger OpenCore autonomous workflow
// Body: { trigger: 'morning_briefing' | 'status_check' | 'task_dispatch' }
export async function POST(req: NextRequest) {
  let trigger: Trigger = 'status_check';

  try {
    const body = await req.json();
    if (body.trigger && body.trigger in PROMPTS) {
      trigger = body.trigger as Trigger;
    }
  } catch {
    // no-op: use default trigger
  }

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: 'You are OpenCore, the central orchestration engine of Mission Control VOS running as VELO. You initiate autonomous workflows and coordinate the agent team. Be direct and tactical.',
    prompt: PROMPTS[trigger],
  });

  // Broadcast to all agents
  await sendACPMessage('opencore', 'broadcast', `[${trigger.toUpperCase().replace('_', ' ')}] ${text}`);

  // Send directly to Hermes for relay and acknowledgment
  await sendACPMessage('opencore', 'hermes', text);

  return NextResponse.json({ trigger, message: text });
}

// GET /api/opencore — health check
export async function GET() {
  return NextResponse.json({
    agent: 'opencore',
    model: 'claude-sonnet-4-6',
    status: 'ready',
    triggers: Object.keys(PROMPTS),
  });
}
