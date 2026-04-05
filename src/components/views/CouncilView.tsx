'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, Terminal, BarChart2, PenTool, Settings, Crown, Hash, Loader2, Copy, Check, Sparkles, AlertTriangle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { ACPMessage } from '@/types';

const AGENT_ICONS: Record<string, React.ElementType> = {
  VELO: Bot,
  Charlie: Terminal,
  Scout: BarChart2,
  Quill: PenTool,
  Ralph: Settings,
};

const AGENT_COLORS: Record<string, string> = {
  VELO: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  Charlie: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  Scout: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  Quill: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  Ralph: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30',
};

const SUGGESTED_PROMPTS = [
  "What's the status of my content pipeline?",
  "Summarize today's agent activity",
  "Help me plan my week",
];

// ---------------------------------------------------------------------------
// Simple markdown parser -- no external deps
// ---------------------------------------------------------------------------

function parseMarkdown(text: string): React.ReactNode[] {
  // Split into blocks by double newlines (or triple+ newlines)
  const blocks = text.split(/\n{2,}/);
  const result: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Fenced code block (could span multiple "blocks" but we handle the common single-block case)
    if (block.startsWith('```')) {
      const lines = block.split('\n');
      // Remove opening ``` (possibly with language) and closing ```
      const openLine = lines[0];
      const lang = openLine.slice(3).trim();
      const closingIdx = lines.lastIndexOf('```');
      const codeLines =
        closingIdx > 0 ? lines.slice(1, closingIdx) : lines.slice(1);
      const code = codeLines.join('\n');

      result.push(
        <pre
          key={`block-${i}`}
          className="bg-bg-subtle border border-border-base rounded-lg px-4 py-3 overflow-x-auto my-1"
        >
          {lang && (
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2 block">
              {lang}
            </span>
          )}
          <code className="text-xs font-mono text-text-base">{code}</code>
        </pre>
      );
      continue;
    }

    // Unordered list block: every line starts with - or *
    const listLines = block.split('\n');
    if (listLines.every((l) => /^\s*[-*]\s/.test(l))) {
      result.push(
        <ul key={`block-${i}`} className="list-disc list-inside space-y-1 my-1">
          {listLines.map((l, li) => (
            <li key={li} className="text-sm leading-relaxed">
              {renderInline(l.replace(/^\s*[-*]\s+/, ''))}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Regular paragraph -- handle line breaks within the block
    const lines = block.split('\n');
    result.push(
      <span key={`block-${i}`} className="block my-1">
        {lines.map((line, li) => (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            {renderInline(line)}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return result;
}

/** Render inline markdown: bold, inline code */
function renderInline(text: string): React.ReactNode[] {
  // Regex matches: **bold**, `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined) {
      // Bold
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-text-base">
          {match[2]}
        </strong>
      );
    } else if (match[3] !== undefined) {
      // Inline code
      parts.push(
        <code
          key={`c-${match.index}`}
          className="bg-bg-subtle border border-border-base rounded px-1.5 py-0.5 text-xs font-mono text-text-base"
        >
          {match[3]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// ---------------------------------------------------------------------------
// MessageContent -- renders parsed markdown for assistant, plain for user
// ---------------------------------------------------------------------------

function MessageContent({ text, isUser }: { text: string; isUser: boolean }) {
  if (isUser) {
    return <>{text}</>;
  }
  return <>{parseMarkdown(text)}</>;
}

// ---------------------------------------------------------------------------
// TypingDots -- animated ellipsis
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1 align-middle">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('Failed to copy', 'error');
    }
  }, [text, toast]);

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-bg-subtle text-text-muted hover:text-text-base"
      aria-label="Copy message"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ACP Activity Feed (fallback)
// ---------------------------------------------------------------------------

function ACPFeedItem({ msg }: { msg: ACPMessage }) {
  const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-base last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-text-base">{msg.from}</span>
          <span className="text-[10px] text-text-muted">→</span>
          <span className="text-xs font-medium text-text-muted">{msg.to}</span>
          <span className="text-[10px] text-text-muted ml-auto">{timeStr}</span>
        </div>
        <p className="text-xs text-text-muted line-clamp-2">{msg.content}</p>
      </div>
    </div>
  );
}

function ACPFallbackFeed() {
  const [messages, setMessages] = useState<ACPMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const res = await fetch('/api/acp?limit=10');
        if (!res.ok) throw new Error('fetch failed');
        const data: ACPMessage[] = await res.json();
        if (!cancelled) setMessages(data);
      } catch {
        // silently fail — this is already in an error state
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchFeed();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-bg-panel border border-border-base rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-blue-500" />
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent Agent Activity</h3>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-text-muted py-2">
          <Loader2 size={12} className="animate-spin" />
          Loading activity feed...
        </div>
      ) : messages.length === 0 ? (
        <p className="text-xs text-text-muted py-2 italic">No recent agent activity.</p>
      ) : (
        <div>
          {messages.map((msg) => (
            <ACPFeedItem key={msg.id} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CouncilView
// ---------------------------------------------------------------------------

export function CouncilView() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const [input, setInput] = React.useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/council' }),
    onError: (error) => {
      toast(`Council error: ${error.message}`, 'error');
      setApiError(error.message);
    },
  });

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    // Clear any previous error on new attempt
    setApiError(null);
    sendMessage({ text: input });
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow up to 4 lines (~96px)
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`;
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (isStreaming) return;
    setApiError(null);
    sendMessage({ text: prompt });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border-base bg-bg-panel/50 backdrop-blur-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-500 flex items-center justify-center border border-yellow-500/30">
            <Crown size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-base tracking-tight">The Council</h1>
            <p className="text-sm text-text-muted mt-1">Multi-agent deliberation and group chat</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-subtle border border-border-base rounded-md text-xs font-medium text-text-muted">
            <Hash size={14} />
            general-ops
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isStreaming
              ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30'
              : apiError
              ? 'text-red-400 bg-red-500/10 border border-red-500/30'
              : 'text-text-muted border border-transparent'
          }`}>
            {isStreaming && <Loader2 size={12} className="animate-spin" />}
            {apiError && <AlertTriangle size={12} />}
            {isStreaming ? 'VELO is responding...' : apiError ? 'Offline' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Chat Feed */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar flex flex-col gap-6">
        {/* Error banner */}
        {apiError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-300">Council AI is currently offline</p>
                <p className="text-xs text-red-400/80 mt-1">
                  Check your AI Gateway credentials (<code className="font-mono bg-red-500/10 rounded px-1">VERCEL_OIDC_TOKEN</code> or{' '}
                  <code className="font-mono bg-red-500/10 rounded px-1">ANTHROPIC_API_KEY</code> in your{' '}
                  <code className="font-mono bg-red-500/10 rounded px-1">.env.local</code> file).
                </p>
                <p className="text-xs text-red-400/60 mt-1.5 font-mono">{apiError}</p>
              </div>
            </div>
          </motion.div>
        )}

        {messages.length === 0 && !apiError && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Crown size={28} className="text-yellow-500" />
              </div>
              <p className="text-text-base font-medium text-lg">The Council is ready</p>
              <p className="text-text-muted text-sm mt-2 mb-8">Start a conversation with VELO and the agent team.</p>

              <div className="flex flex-col gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="group/prompt flex items-center gap-3 text-left w-full px-4 py-3 rounded-xl border border-border-base bg-bg-panel hover:bg-bg-subtle hover:border-border-strong transition-all text-sm text-text-muted hover:text-text-base"
                  >
                    <Sparkles size={14} className="text-blue-500 shrink-0 opacity-60 group-hover/prompt:opacity-100 transition-opacity" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACP fallback feed shown when there's an error and no messages */}
        {apiError && messages.length === 0 && (
          <ACPFallbackFeed />
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const agentName = isUser ? 'You' : 'VELO';
            const Icon = AGENT_ICONS[agentName] ?? Bot;
            const colorClass = isUser
              ? 'text-zinc-300 bg-zinc-700/50 border-zinc-600/50'
              : (AGENT_COLORS[agentName] ?? AGENT_COLORS.VELO);

            const textContent = msg.parts
              .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map(p => p.text)
              .join('');

            const isLastAssistant = !isUser && idx === messages.length - 1;
            const showTypingDots = isLastAssistant && isStreaming;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`flex gap-4 group ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 mt-1 ${colorClass}`}>
                  {isUser
                    ? <span className="text-[10px] font-bold uppercase">You</span>
                    : <Icon size={20} />
                  }
                </div>
                <div className={`flex flex-col gap-1 min-w-0 max-w-[75%] ${isUser ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-base">{agentName}</span>
                    {!isUser && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-subtle border border-border-base text-text-muted uppercase tracking-wider">
                        Core
                      </span>
                    )}
                    <CopyButton text={textContent} />
                  </div>
                  <div className={cn(
                    'text-sm leading-relaxed break-words',
                    isUser
                      ? 'text-text-base bg-bg-panel border border-border-base rounded-xl px-4 py-3 whitespace-pre-wrap'
                      : 'text-text-muted'
                  )}>
                    <MessageContent text={textContent} isUser={isUser} />
                    {showTypingDots && <TypingDots />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ACP fallback feed shown below messages when there's an error */}
        {apiError && messages.length > 0 && (
          <div className="mt-4">
            <ACPFallbackFeed />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-bg-base border-t border-border-base shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Message The Council (or type / to assign a specific agent)..."
            rows={1}
            className="w-full bg-bg-panel border border-border-base rounded-xl pl-4 pr-12 py-4 text-sm text-text-base placeholder:text-text-muted focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong transition-all shadow-elevation-card-rest disabled:opacity-50 resize-none overflow-hidden"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="absolute right-3 bottom-3 p-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </form>
        <p className="text-center text-[11px] text-text-muted mt-2">
          Press <kbd className="px-1 py-0.5 rounded bg-bg-subtle border border-border-base text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-bg-subtle border border-border-base text-[10px] font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
