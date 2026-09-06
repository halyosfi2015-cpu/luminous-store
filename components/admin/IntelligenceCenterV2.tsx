"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------------ */
/* TYPES                                                                      */
/* ------------------------------------------------------------------------ */

interface RankedRec {
  rank: number;
  rankLabel: string;
  title: string;
  what: string;
  why: string;
  evidence: string[];
  confidence: string;
  expectedImpact: string;
  tradeOff?: string;
  recommendedAction: string;
  requiresApproval: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  intent?: string;
  confidence?: string;
  rankedRecommendations?: RankedRec[];
  facts?: Array<{ statement: string; source: string; value: number | string | null }>;
  insights?: Array<{ title: string; description: string }>;
  actions?: Array<{ type: string; description: string; requiresApproval: boolean }>;
  pipeline?: { steps: Array<{ phase: string; status: string }>; totalDurationMs?: number };
  executionId?: string;
  status?: string;
}

interface QuickQuestion {
  label: string;
  question: string;
  icon: string;
}

/* ------------------------------------------------------------------------ */
/* CONSTANTS                                                                  */
/* ------------------------------------------------------------------------ */

const QUICK_QUESTIONS: QuickQuestion[] = [
  { label: "ماذا يحتاج انتباهي؟", question: "ماذا يحتاج انتباهي اليوم؟", icon: "🚨" },
  { label: "كيف أرفع مبيعاتي؟", question: "كيف أرفع مبيعات هذا الأسبوع؟", icon: "📈" },
  { label: "ショأحسن فرصة؟", question: "ما هي أفضل فرصة تجارية حالياً؟", icon: "🎯" },
  { label: "ショأالمبيعات؟", question: "كيف حال المبيعات؟", icon: "💰" },
  { label: "ショوضع المخزون؟", question: "ما وضع المخزون؟", icon: "📦" },
  { label: "ショأ العملاء؟", question: "كيف حال العملاء؟", icon: "👥" },
  { label: "أنشئ محتوى", question: "أنشئ محتوى Instagram للبشرة الجافة", icon: "📝" },
  { label: "اعمل حملة", question: "اعمل حملة تسويقية", icon: "📣" },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-red-100 text-red-800 border-red-200",
  insufficient_data: "bg-gray-100 text-gray-600 border-gray-200",
};

const RANK_COLORS: Record<string, string> = {
  best: "bg-blue-600 text-white",
  good: "bg-blue-100 text-blue-700",
  alternative: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  success: "✓ نجاح",
  partial: "⚠ جزئي",
  insufficient_data: "⚠ بيانات غير كافية",
  error: "✕ خطأ",
  requires_approval: "⏳ بانتظار الاعتماد",
};

/* ------------------------------------------------------------------------ */
/* COMPONENT                                                                  */
/* ------------------------------------------------------------------------ */

export default function IntelligenceCenterV2() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now().toString(36)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now().toString(36)}`,
      role: "user",
      content: question.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/admin/intelligence/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), sessionId }),
      });

      const data = await res.json();

      if (data.success && data.result) {
        const r = data.result;
        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now().toString(36)}`,
          role: "assistant",
          content: r.answer || "لا توجد إجابة",
          timestamp: new Date().toISOString(),
          intent: r.intent,
          confidence: r.confidence,
          rankedRecommendations: r.rankedRecommendations,
          facts: r.facts,
          insights: r.insights,
          actions: r.actions,
          pipeline: data.pipeline,
          executionId: r.executionId,
          status: r.status,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `msg_${Date.now().toString(36)}`,
          role: "assistant",
          content: data.error?.message ?? "حدث خطأ في المعالجة",
          timestamp: new Date().toISOString(),
          status: "error",
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now().toString(36)}`,
        role: "assistant",
        content: `خطأ في الاتصال: ${(e as Error).message}`,
        timestamp: new Date().toISOString(),
        status: "error",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  }, [isProcessing, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg">
              🧠
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">مركز الذكاء الموحد</h1>
              <p className="text-xs text-gray-500">مساعد ذكاء اصطناعي استراتيجي — يفهم ويحلل ويوصي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              نشط
            </span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <WelcomeScreen onAsk={sendMessage} />
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onAsk={sendMessage} />
          ))}

          {isProcessing && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm shrink-0">
                🧠
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">يحلل البيانات ويفهم الهدف...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 px-4 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسأل عن أي شيء — المبيعات، العملاء، المخزون، الحملات، المحتوى..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              style={{ minHeight: "48px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isProcessing}
              className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* WELCOME SCREEN                                                             */
/* ------------------------------------------------------------------------ */

function WelcomeScreen({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div className="py-12 text-center space-y-8">
      <div className="space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl">
          🧠
        </div>
        <h2 className="text-xl font-bold text-gray-900">مرحباً بك في مركز الذكاء الموحد</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          مساعد ذكاء اصطناعي استراتيجي يفهم هدفك، يجمع السياق المناسب، يحلل الوضع، يقترح أفضل مسار، ثم يقدم إجراءً قابلاً للتنفيذ.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {QUICK_QUESTIONS.slice(0, 8).map((q) => (
          <button
            key={q.label}
            onClick={() => onAsk(q.question)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all text-center group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{q.icon}</span>
            <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{q.label}</span>
          </button>
        ))}
      </div>

      <div className="text-[10px] text-gray-400 space-y-1">
        <p>النظام يفهم اللغة الطبيعية — اسأل كما تتحدث</p>
        <p>يعمل على بيانات المتجر الحقيقية — لا توجد نتائج وهمية</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* MESSAGE BUBBLE                                                             */
/* ------------------------------------------------------------------------ */

function MessageBubble({ message, onAsk }: { message: ChatMessage; onAsk: (q: string) => void }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm shrink-0">
        🧠
      </div>
      <div className="flex-1 space-y-3 max-w-[85%]">
        {/* Main answer */}
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-5 py-4 shadow-sm">
          {/* Status & Intent */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {message.status && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CONFIDENCE_COLORS[message.confidence ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABELS[message.status] ?? message.status}
              </span>
            )}
            {message.intent && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                {message.intent}
              </span>
            )}
            {message.confidence && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CONFIDENCE_COLORS[message.confidence] ?? ""}`}>
                ثقة: {message.confidence === "high" ? "عالية" : message.confidence === "medium" ? "متوسطة" : "منخفضة"}
              </span>
            )}
          </div>

          {/* Answer text */}
          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Pipeline info */}
          {message.pipeline && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-400">مراحل التحليل:</span>
                {message.pipeline.steps.map((step, i) => (
                  <span
                    key={i}
                    className={`text-[9px] px-1.5 py-0.5 rounded ${
                      step.status === "completed"
                        ? "bg-green-50 text-green-600"
                        : step.status === "in_progress"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {step.phase.replace(/_/g, " ")}
                  </span>
                ))}
                {message.pipeline.totalDurationMs !== undefined && (
                  <span className="text-[9px] text-gray-400">{message.pipeline.totalDurationMs}ms</span>
                )}
              </div>
            </div>
          )}

          {/* Execution ID */}
          {message.executionId && (
            <div className="mt-2 text-[9px] text-gray-400">
              رقم التنفيذ: {message.executionId}
            </div>
          )}
        </div>

        {/* Ranked Recommendations */}
        {message.rankedRecommendations && message.rankedRecommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-600 px-1">التوصيات مرتبة:</h4>
            {message.rankedRecommendations.map((rec) => (
              <div
                key={rec.rank}
                className={`border rounded-xl px-4 py-3 ${
                  rec.rankLabel === "best"
                    ? "border-blue-200 bg-blue-50/50"
                    : rec.rankLabel === "good"
                    ? "border-gray-200 bg-white"
                    : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${RANK_COLORS[rec.rankLabel] ?? ""}`}>
                    {rec.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-semibold text-gray-900">{rec.title}</h5>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${CONFIDENCE_COLORS[rec.confidence] ?? ""}`}>
                        {rec.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1.5">{rec.why}</p>
                    {rec.evidence.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {rec.evidence.map((e, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      <span>التأثير المتوقع: {rec.expectedImpact}</span>
                      {rec.tradeOff && <span className="text-orange-600">⚠ {rec.tradeOff}</span>}
                    </div>
                    <div className="mt-2 text-xs font-medium text-blue-700">
                      الإجراء الموصى به: {rec.recommendedAction}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Facts */}
        {message.facts && message.facts.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">الحقائق:</h4>
            <div className="space-y-1">
              {message.facts.slice(0, 5).map((fact, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-700">{fact.statement}</span>
                  {fact.value !== null && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600">{String(fact.value)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {message.insights && message.insights.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">الرؤى:</h4>
            <div className="space-y-1.5">
              {message.insights.map((insight, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium text-gray-800">{insight.title}: </span>
                  <span className="text-gray-600">{insight.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((action, i) => (
              <button
                key={i}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  action.requiresApproval
                    ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                disabled={action.requiresApproval}
              >
                {action.description}
                {action.requiresApproval && " (يحتاج اعتماد)"}
              </button>
            ))}
          </div>
        )}

        {/* Follow-up suggestions */}
        {message.status === "success" && message.rankedRecommendations && message.rankedRecommendations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <FollowUpButton label="اعمل حملة لهذا" onAsk={() => onAsk("اعمل حملة بناءً على هذه التوصية")} />
            <FollowUpButton label="أنشئ محتوى" onAsk={() => onAsk("أنشئ محتوى بناءً على هذا التحليل")} />
            <FollowUpButton label="اعطني بديل" onAsk={() => onAsk("أعطني بديلاً عن هذا الاقتراح")} />
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpButton({ label, onAsk }: { label: string; onAsk: () => void }) {
  return (
    <button
      onClick={onAsk}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors"
    >
      {label}
    </button>
  );
}
