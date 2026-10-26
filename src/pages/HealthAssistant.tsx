import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  User,
  ArrowLeft,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Key,
  Sparkles,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  getBotResponse,
  validateGeminiKey,
  cleanGeminiKey,
} from '../lib/ai/healthBotEngine';
import type { ChatMessage, VitalsContext } from '../lib/ai/healthBotEngine';
import { triggerHaptic } from '../lib/utils/haptics';
import { ChatFormattedText } from '../components/chat/ChatFormattedText';

interface HealthAssistantProps {
  onBack: () => void;
  vitalsContext?: VitalsContext;
  onNavigateBreathing?: () => void;
}

export const HealthAssistant: React.FC<HealthAssistantProps> = ({
  onBack,
  vitalsContext,
  onNavigateBreathing,
}) => {
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return cleanGeminiKey(localStorage.getItem('vitallens_gemini_key') || '');
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('vitallens_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }

    const initialText = vitalsContext && vitalsContext.heartRate
      ? `I've attached your latest reading: **${vitalsContext.heartRate} BPM**, **${vitalsContext.spo2 ?? 98}% SpO2**, and **${vitalsContext.systolicBp ?? 118}/${vitalsContext.diastolicBp ?? 76} mmHg**.\n\nHow can I help you understand these vitals?`
      : `Hello! I can help explain your vital sign readings, optimal heart rate ranges, or heart rate variability (HRV). What would you like to know?`;

    return [
      {
        id: 'msg-init-1',
        sender: 'assistant',
        text: initialText,
        timestamp: Date.now(),
        triageLevel: 'info',
        suggestedActions: vitalsContext?.heartRate
          ? ['What heart rate is optimal?', 'Are my vitals normal?', 'How to improve HRV?']
          : ['What heart rate is optimal?', 'Standard normal vitals', 'How camera PPG works'],
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Key Modal States
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [modalKeyInput, setModalKeyInput] = useState('');
  const [testState, setTestState] = useState<{
    testing: boolean;
    success?: boolean;
    model?: string;
    error?: string;
    latencyMs?: number;
  }>({ testing: false });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    try {
      localStorage.setItem('vitallens_chat_history', JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  const handleOpenKeyModal = () => {
    const current = cleanGeminiKey(localStorage.getItem('vitallens_gemini_key') || geminiKey);
    setModalKeyInput(current);
    setTestState({ testing: false });
    setShowKeyModal(true);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query) return;

    triggerHaptic('light');

    if (
      query.toLowerCase().includes('open guided breathing') ||
      query.toLowerCase().includes('start coherent breathing')
    ) {
      if (onNavigateBreathing) {
        onNavigateBreathing();
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: 'msg-user-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const activeKey = cleanGeminiKey(geminiKey || localStorage.getItem('vitallens_gemini_key') || '');
      const response = await getBotResponse(query, vitalsContext, activeKey, messages);
      setMessages((prev) => [...prev, response]);
      triggerHaptic('medium');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-err-' + Date.now(),
          sender: 'assistant',
          text: 'Encountered temporary processing constraint. Please retry your query.',
          timestamp: Date.now(),
          triageLevel: 'info',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear conversation history?')) {
      localStorage.removeItem('vitallens_chat_history');
      setMessages([
        {
          id: 'msg-init-new',
          sender: 'assistant',
          text: 'Conversation reset. Ask any question regarding your heart rate, vitals, or recovery.',
          timestamp: Date.now(),
          triageLevel: 'info',
          suggestedActions: [
            'What heart rate is optimal?',
            'Analyze my latest scan',
            'What does HRV mean?',
          ],
        },
      ]);
      triggerHaptic('light');
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    // Strip markdown formatting before copying to clipboard
    const plainText = text.replace(/\*\*/g, '').replace(/^#{1,4}\s+/gm, '');
    navigator.clipboard.writeText(plainText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTestKeyConnection = async () => {
    const candidate = cleanGeminiKey(modalKeyInput);
    if (!candidate || candidate.length < 10) {
      setTestState({
        testing: false,
        success: false,
        error: 'Please enter a valid Gemini API key (starts with AIzaSy...).',
      });
      return;
    }

    setTestState({ testing: true });
    triggerHaptic('light');

    const result = await validateGeminiKey(candidate);
    setTestState({
      testing: false,
      success: result.success,
      model: result.model,
      error: result.error,
      latencyMs: result.latencyMs,
    });

    if (result.success) {
      triggerHaptic('success');
    } else {
      triggerHaptic('warning');
    }
  };

  const handleSaveGeminiKey = () => {
    const cleaned = cleanGeminiKey(modalKeyInput);
    setGeminiKey(cleaned);
    if (cleaned) {
      localStorage.setItem('vitallens_gemini_key', cleaned);
    } else {
      localStorage.removeItem('vitallens_gemini_key');
    }
    setShowKeyModal(false);
    triggerHaptic('medium');
  };

  const handleRemoveKey = () => {
    setGeminiKey('');
    setModalKeyInput('');
    localStorage.removeItem('vitallens_gemini_key');
    setShowKeyModal(false);
    triggerHaptic('light');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] space-y-3 pb-2">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="clinical-btn-secondary min-h-[34px] px-2.5 py-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[var(--text-primary)]">
                Health Assistant
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                {geminiKey ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Gemini AI Active
                  </span>
                ) : (
                  <span className="text-[var(--text-secondary)]">Clinical Q&A (Offline)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenKeyModal}
            className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs ${
              geminiKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Configure Gemini API Key"
            aria-label="API Settings"
          >
            <Key className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--status-alert)] transition-colors cursor-pointer"
            title="Clear Chat History"
            aria-label="Clear History"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        </div>
      </div>

      {/* Vitals Context Active Pill Banner */}
      {vitalsContext && vitalsContext.heartRate && (
        <div className="bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 text-[var(--teal-primary)] text-[10px] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal-primary)]" />
            <span>Latest Reading Attached</span>
          </div>
          <div className="flex items-center gap-3 text-[var(--text-secondary)] text-[11px] tabular-nums">
            <span>HR: <strong className="text-[var(--text-primary)] font-bold">{vitalsContext.heartRate}</strong> BPM</span>
            <span>SpO2: <strong className="text-[var(--text-primary)] font-bold">{vitalsContext.spo2 ?? 98}</strong>%</span>
            <span>BP: <strong className="text-[var(--text-primary)] font-bold">{vitalsContext.systolicBp ?? 118}/{vitalsContext.diastolicBp ?? 76}</strong></span>
          </div>
        </div>
      )}

      {/* Chat Messages Scrolling Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isUser
                    ? 'bg-[var(--teal-primary)] border-[var(--teal-primary)] text-white'
                    : 'bg-[var(--bg-surface-subtle)] border-[var(--border-color)] text-[var(--teal-primary)]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5 stroke-[2]" /> : <Bot className="w-3.5 h-3.5 stroke-[2]" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative max-w-[88%] sm:max-w-md p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[var(--teal-primary)] text-white rounded-2xl rounded-tr-xs shadow-xs'
                    : 'clinical-card text-[var(--text-primary)] rounded-2xl rounded-tl-xs'
                }`}
              >
                {/* Triage Badge if present */}
                {msg.triageLevel && msg.triageLevel !== 'info' && (
                  <div className="mb-2">
                    {msg.triageLevel === 'urgent' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--status-alert-bg)] text-[var(--status-alert)] border border-[var(--border-color)] text-[10px] font-mono uppercase font-bold">
                        <AlertTriangle className="w-3 h-3 stroke-[2] shrink-0" /> TRIAGE ALERT
                      </span>
                    )}
                    {msg.triageLevel === 'caution' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--status-caution-bg)] text-[var(--status-caution)] border border-[var(--border-color)] text-[10px] font-mono uppercase font-bold">
                        <Info className="w-3 h-3 stroke-[2] shrink-0" /> CLINICAL REVIEW RECOMMENDED
                      </span>
                    )}
                    {msg.triageLevel === 'normal' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--border-color)] text-[10px] font-mono uppercase font-bold">
                        <Check className="w-3 h-3 stroke-[2] shrink-0" /> OPTIMAL INTERVAL
                      </span>
                    )}
                  </div>
                )}

                {/* Formatted Text Component: renders headings, lists, bold without any raw ** or artifacts */}
                <ChatFormattedText text={msg.text} isUser={isUser} />

                {/* Context badge if present */}
                {msg.vitalsContextSnippet && !isUser && (
                  <div className="flex items-center gap-1 text-[10px] text-[var(--teal-primary)] font-mono mt-2 pt-1 border-t border-[var(--border-color)]/60">
                    <Sparkles className="w-3 h-3 stroke-[2] shrink-0" />
                    <span>{msg.vitalsContextSnippet}</span>
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-[var(--border-color)]">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(action)}
                        className="px-2 py-1 rounded-md bg-[var(--bg-surface-subtle)] hover:bg-[var(--teal-subtle)] text-[var(--teal-primary)] border border-[var(--border-color)] text-[10px] font-mono transition-colors cursor-pointer"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer time & copy button */}
                <div
                  className={`flex items-center justify-between mt-2 pt-1 text-[10px] font-mono ${
                    isUser ? 'text-white/80' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="hover:text-[var(--text-primary)] transition-colors cursor-pointer p-0.5"
                      title="Copy clean response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-[var(--status-success)]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-[var(--teal-primary)] flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="clinical-card px-3 py-2 rounded-lg text-xs text-[var(--text-secondary)] font-mono flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--teal-primary)] animate-pulse" />
              <span>{geminiKey ? 'Consulting Gemini AI clinician...' : 'Analyzing physiological telemetry...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar — Thumb Accessible */}
      <div className="shrink-0 pt-1 border-t border-[var(--border-color)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Inquire on vital signs, intervals, or optimal heart rate..."
            className="flex-1 min-h-[44px] bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] font-sans"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl font-medium transition-all flex items-center justify-center cursor-pointer ${
              inputQuery.trim() && !isTyping
                ? 'bg-[var(--teal-primary)] text-white hover:opacity-90 active:scale-95'
                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)] cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-4 h-4 stroke-[2]" />
          </button>
        </form>
      </div>

      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 space-y-3.5 shadow-card text-[var(--text-primary)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--teal-subtle)] text-[var(--teal-primary)]">
                <Key className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Google Gemini AI Integration</h3>
                <p className="text-[11px] text-[var(--text-secondary)] font-mono">Live clinical LLM reasoning engine</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Entering your Gemini API key enables conversational reasoning, personalized vitals synthesis, and contextual cardiovascular guidance.
            </p>

            <div className="space-y-2">
              <input
                type="password"
                value={modalKeyInput}
                onChange={(e) => {
                  setModalKeyInput(e.target.value);
                  setTestState({ testing: false });
                }}
                placeholder="AIzaSy..."
                className="w-full bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--teal-primary)] font-mono"
              />

              {/* Real-time Connection Test Status */}
              {testState.testing && (
                <div className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-center gap-2 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--teal-primary)]" />
                  <span>Connecting to Google Gemini API...</span>
                </div>
              )}

              {testState.success && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 flex items-start gap-2 font-mono">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Gemini API Connected!</div>
                    <div className="text-[11px] opacity-90">Model: {testState.model} ({testState.latencyMs}ms)</div>
                  </div>
                </div>
              )}

              {testState.error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-700 flex items-start gap-2 font-mono">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Connection Failed</div>
                    <div className="text-[11px] opacity-90">{testState.error}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]">
              <div>
                {geminiKey ? (
                  <button
                    onClick={handleRemoveKey}
                    className="text-xs text-[var(--status-alert)] hover:underline font-mono cursor-pointer"
                  >
                    Disconnect Key
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestKeyConnection}
                  disabled={testState.testing || !modalKeyInput.trim()}
                  className="clinical-btn-secondary min-h-[36px] px-3 text-xs font-mono"
                >
                  {testState.testing ? 'Testing...' : 'Test Key'}
                </button>
                <button
                  onClick={handleSaveGeminiKey}
                  className="clinical-btn-primary min-h-[36px] px-3.5 text-xs font-mono font-medium"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
