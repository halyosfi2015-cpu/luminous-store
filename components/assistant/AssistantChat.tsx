'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Loader2, MessageSquare, Bot, User, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  intent?: string
  confidence?: number
  groundedFactsCount?: number
  fallback?: boolean
}

interface AssistantChatProps {
  isOpen?: boolean
  onClose?: () => void
  initialPathname?: string
  cartItemCount?: number
  cartValue?: number
}

const SuggestionChip = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
  >
    {children}
  </button>
)

export function AssistantChat({
  isOpen = false,
  onClose,
  initialPathname = '/',
  cartItemCount = 0,
  cartValue = 0
}: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const conversationHistory = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    conversationHistory.current.push({ role: 'user', content: input.trim() })
    const currentInput = input
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          conversationHistory: conversationHistory.current.slice(0, -1),
          options: {
            pathname: initialPathname,
            cartItemCount,
            cartValue,
            userAgent: navigator.userAgent
          }
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'فشل في إرسال الرسالة')
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        intent: data.intent,
        confidence: data.confidence,
        groundedFactsCount: data.groundedFactsCount,
        fallback: data.fallback
      }

      setMessages(prev => [...prev, assistantMessage])
      conversationHistory.current.push({ role: 'assistant', content: data.response })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع'
      setError(errorMessage)
      
      const errorMsg: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        timestamp: new Date(),
        fallback: true
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearConversation = () => {
    setMessages([])
    conversationHistory.current = []
    setError(null)
  }

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      setMessages(prev => prev.filter(m => m.id !== lastUserMessage.id))
      conversationHistory.current = conversationHistory.current.filter(m => m.content !== lastUserMessage.content)
      setInput(lastUserMessage.content)
      sendMessage()
    }
  }

  const welcomeMessage = messages.length === 0 ? (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      <MessageSquare className="mx-auto mb-3 text-4xl opacity-50" />
      <p className="text-lg font-medium mb-1" dir="auto">
        مرحباً! أنا مساعد لومينوس الذكي
      </p>
      <p className="text-sm" dir="auto">
        كيف يمكنني مساعدتك اليوم؟
      </p>
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <SuggestionChip onClick={() => setInput('أريد روتين للعناية بالبشرة الجافة')}>روتين للبشرة الجافة</SuggestionChip>
        <SuggestionChip onClick={() => setInput('ما أفضل سيروم للتفتيح؟')}>أفضل سيروم للتفتيح</SuggestionChip>
        <SuggestionChip onClick={() => setInput('كم سعر الشحن إلى صنعاء؟')}>شحن إلى صنعاء</SuggestionChip>
        <SuggestionChip onClick={() => setInput('ما الباقات المتاحة للعرائس؟')}>باقات العرائس</SuggestionChip>
      </div>
    </div>
  ) : null

  if (!isOpen && !onClose) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 transition-all duration-300" dir="rtl">
      {!isOpen && onClose && (
        <button
          onClick={() => setShowHistory(true)}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="فتح مساعد لومينوس"
        >
          <MessageSquare className="w-7 h-7" />
        </button>
      )}

      {isOpen && (
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-[600px] md:h-[700px] animate-slide-up">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">مساعد لومينوس</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">مساعد ذكي للعناية بالجمال</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearConversation}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="مسح المحادثة"
                aria-label="مسح المحادثة"
              >
                <RotateCcw className="w-5 h-5 text-gray-500" />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="إغلاق"
                  aria-label="إغلاق"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4" dir="rtl">
            {welcomeMessage}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                dir={msg.role === 'user' ? 'ltr' : 'rtl'}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed" dir="auto">{msg.content}</p>
                    {(msg.intent || msg.groundedFactsCount !== undefined || msg.fallback) && (
                      <div className="mt-2 flex items-center gap-2 text-xs opacity-70">
                        {msg.intent && (
                          <span className="px-2 py-0.5 rounded bg-white/20 dark:bg-black/20">
                            {msg.intent}
                          </span>
                        )}
                        {msg.groundedFactsCount !== undefined && msg.groundedFactsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {msg.groundedFactsCount} مصدر موثوق
                          </span>
                        )}
                        {msg.fallback && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                            وضع الاحتياط
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 px-1">{msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/30 flex items-center justify-between gap-2">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={retryLastMessage}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب سؤالك هنا... (اضغط Enter للإرسال، Shift+Enter لسطر جديد)"
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none disabled:opacity-50"
                aria-label="رسالتك"
                dir="auto"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="absolute left-3 bottom-3 p-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="إرسال الرسالة"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              يستند الرد على بيانات المتجر الموثقة • لا يتم تخزين معلومات شخصية
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function AssistantTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 left-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform animate-pulse"
      aria-label="فتح مساعد لومينوس"
    >
      <MessageSquare className="w-7 h-7" />
    </button>
  )
}