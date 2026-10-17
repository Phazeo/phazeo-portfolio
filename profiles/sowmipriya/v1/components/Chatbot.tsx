import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BOT_GREETING, BOT_NAME, getReply } from "../data/chatbotKnowledge";

const FALLBACK_ANSWER =
  "I didn't catch that. Try asking about Sowmipriya's experience, skills, projects, education, publications, or how to contact her. You can also scroll through her portfolio sections above.";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: number;
}

/**
 * Chatbot Component for Sowmipriya's Portfolio
 *
 * A client-side chatbot that answers questions about Sowmipriya using
 * a knowledge base derived from her portfolio content.
 *
 * Features:
 * - No external API required (fully self-contained)
 * - Uses profile theme colors
 * - Responsive and accessible
 * - Works in both dev and production
 *
 * Note: This chatbot is for Sowmipriya profile only. Rendered only in sowmipriya/v1/index.tsx.
 * Do not add to other profiles without a profile-specific knowledge base.
 */
export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Scroll to bottom whenever new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ id: 1, text: BOT_GREETING, isBot: true, timestamp: Date.now() }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) {
      return;
    }

    const userMsg: Message = {
      id: Date.now(),
      text,
      isBot: false,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    const reply = getReply(text);
    const botText = reply || FALLBACK_ANSWER;
    const botMsg: Message = {
      id: Date.now() + 1,
      text: botText,
      isBot: true,
      timestamp: Date.now(),
    };
    setTimeout(() => {
      setMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleChat = () => {
    setIsOpen((o) => !o);
  };

  // Ensure CSS variables are available (fallback for production)
  const getColor = (varName: string, fallback: string) => {
    if (typeof window === "undefined") {
      return fallback;
    }
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || fallback;
  };

  const primaryColor = getColor("--color-primary", "#73C7C7");
  const primaryHover = getColor("--color-primary-hover", "#5fb3b3");
  const secondaryColor = getColor("--color-secondary", "#A6F1E0");
  const backgroundColor = getColor("--color-background", "#F4F8D3");

  return (
    <>
      {/* Floating chat button */}
      <button
        type="button"
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          backgroundColor: primaryColor,
          zIndex: 9999,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = primaryHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = primaryColor;
        }}
        aria-label={isOpen ? "Close chat" : "Open chat - Ask about Sowmipriya"}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <title>Close chat</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <title>Open chat</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[9998] w-full max-w-md rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden"
          style={{
            height: "min(calc(100vh - 8rem), 520px)",
            borderColor: `${primaryColor}4D`, // 30% opacity
            zIndex: 9998,
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 text-white"
            style={{
              background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
            }}
          >
            <div
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl"
              aria-hidden="true"
            >
              🤖
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-lg">{BOT_NAME}</h3>
              <p className="text-xs text-white/90">Ask me about Sowmipriya</p>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{
              backgroundColor: `${backgroundColor}4D`, // 30% opacity
            }}
          >
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isBot ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.isBot
                      ? "bg-white border text-gray-800 rounded-bl-md"
                      : "text-white rounded-br-md"
                  }`}
                  style={
                    msg.isBot
                      ? {
                          borderColor: `${primaryColor}4D`,
                        }
                      : {
                          backgroundColor: primaryColor,
                        }
                  }
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about experience, skills, projects..."
                className="flex-1 px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder-gray-500"
                style={{
                  borderColor: `${primaryColor}66`, // 40% opacity
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = primaryColor;
                  e.target.style.boxShadow = `0 0 0 2px ${primaryColor}33`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = `${primaryColor}66`;
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                className="px-4 py-2.5 text-white rounded-xl hover:opacity-90 transition-colors font-display font-semibold"
                style={{
                  backgroundColor: primaryColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = primaryHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = primaryColor;
                }}
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Open-source chatbot · No API · Answers from this portfolio
            </p>
          </div>
        </div>
      )}
    </>
  );
}
