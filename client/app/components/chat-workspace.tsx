"use client";

import { useState, useRef, useEffect } from "react";

interface Citation {
  content: string;
  pageNumber: number | string;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  sources?: Citation[];
}

export default function ChatWorkspace() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hey there! I'm your PDF assistant. Upload a document or ask me any question about your files—I'm happy to help!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || loading) return;

  const userQuery = input.trim();
  setInput("");

  // Add User Message
  setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: userQuery }]);
  setLoading(true);

  try {
    const res = await fetch(`${process.env.SERVER_URL}/chat?q=${encodeURIComponent(userQuery)}`);
    const data = await res.json();

    // Check if data.answer exists and contains text
    if (res.ok && data.answer) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: data.answer,
          sources: data.sources || [],
        },
      ]);
    } else {
      throw new Error("Invalid response format");
    }
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] w-full bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             Friendly Document Assistant
          </h2>
          <p className="text-xs text-slate-500">Bright, fast, and ready to answer your document questions</p>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-xs font-medium"
                  : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Citations Accordion */}
              {msg.sources && msg.sources.length > 0 && (
                <details className="mt-3 pt-2 border-t border-slate-200 text-xs">
                  <summary className="cursor-pointer text-blue-600 font-semibold hover:text-blue-700 select-none">
                    📚 View Source Context ({msg.sources.length} chunks)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {msg.sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px]"
                      >
                        <span className="font-semibold text-blue-600 block mb-1">
                          {typeof src.pageNumber === "number" || src.pageNumber !== "N/A"
                            ? `Page ${src.pageNumber}`
                            : "Document Context"}
                        </span>
                        <p className="italic">"{src.content}"</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-slate-600 rounded-2xl rounded-bl-xs px-4 py-3 text-sm flex items-center gap-2 border border-slate-200 shadow-sm">
              <span className="animate-spin text-blue-600">⚙️</span>
              <span>Scanning document for answers...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-4 bg-white border-t border-slate-200 flex gap-3 shadow-lg"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your PDF..."
          disabled={loading}
          className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-semibold text-sm transition shadow-sm hover:shadow active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}