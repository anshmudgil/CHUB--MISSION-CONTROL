import { streamText, convertToModelMessages } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are VELO, the autonomous CRO (Chief Revenue Officer) AI agent and orchestrator of Mission Control VOS. You coordinate a team of specialized AI agents:
- Charlie (Infrastructure Engineer): handles local model deployment, APIs, databases
- Scout (Trend Researcher): scans Twitter/LinkedIn, market research, competitor analysis
- Quill (Content Writer): scripts, social media copy, newsletters
- Ralph (QA Manager): quality checks, link verification, formatting review

You speak with strategic authority and precision. Keep responses focused and actionable. When delegating, be explicit about which agent should handle what.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const modelMessages = await convertToModelMessages(messages);

    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[council] streamText error:', message);
    return NextResponse.json(
      { error: 'AI service unavailable', message },
      { status: 503 }
    );
  }
}
