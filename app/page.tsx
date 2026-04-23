"use client";

import { useState, useRef, useEffect } from "react";
import {
  createNewChat,
  addMessageToChat,
  getUserChatRooms,
  getChatMessages,
} from "@/lib/firestoreData";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatRoom = {
  id: string;
  title: string;
};

export default function PeakChatInterface() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Load sidebar chat rooms on initial mount
  useEffect(() => {
    loadSidebar();
  }, []);

  const loadSidebar = async () => {
    const rooms = await getUserChatRooms();
    setChatRooms(rooms);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 2. Handle starting a fresh chat
  const handleNewAnalysis = () => {
    setCurrentRoomId(null);
    setMessages([]);
    setInput("");
  };

  // 3. Handle clicking a room in the sidebar
  const handleSelectRoom = async (roomId: string) => {
    setCurrentRoomId(roomId);
    setMessages([]); // Clear current UI while loading
    setIsLoading(true);

    const loadedMessages = await getChatMessages(roomId);
    setMessages(loadedMessages);
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let activeRoomId = currentRoomId;

      // 4. If there is no active room, create one in Firebase first
      if (!activeRoomId) {
        const newRoom = await createNewChat(userMessage.content);
        if (newRoom) {
          activeRoomId = newRoom.id;
          setCurrentRoomId(activeRoomId);
          loadSidebar(); // Refresh sidebar to show the new room
        }
      }

      // Save user message to Firebase
      if (activeRoomId) {
        await addMessageToChat(activeRoomId, "user", userMessage.content);
      }

      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: JSON.stringify(data),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save AI response to Firebase
      if (activeRoomId) {
        await addMessageToChat(activeRoomId, "assistant", aiMessage.content);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const AiResponseRenderer = ({ content }: { content: string }) => {
    try {
      const data = JSON.parse(content);
      return (
        <div className="space-y-4 text-sm text-bombon-textMain">
          {data.errors && data.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <h4 className="text-red-400 font-bold mb-2">Grammar & Syntax</h4>
              <ul className="list-disc pl-4 space-y-2">
                {data.errors.map((err: any, i: number) => (
                  <li key={i}>
                    <span className="font-semibold text-white">
                      "{err.phrase}"
                    </span>{" "}
                    - {err.explanation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.showDontTell && data.showDontTell.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
              <h4 className="text-blue-400 font-bold mb-2">Show, Don't Tell</h4>
              {data.showDontTell.map((item: any, i: number) => (
                <div key={i} className="mb-2">
                  <p className="line-through text-bombon-textMuted">
                    {item.telling}
                  </p>
                  <p className="text-bombon-accent mt-1">
                    Try: {item.suggestions.join(" OR ")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add this new block for the corrected paragraph */}
          {data.correctedParagraph && (
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl mt-4">
              <h4 className="text-green-400 font-bold mb-2">Revised Version</h4>
              <p className="text-white leading-relaxed">
                {data.correctedParagraph}
              </p>
            </div>
          )}
          {data.varianceSummary && (
            <div className="bg-bombon-panel p-4 rounded-xl border border-white/5">
              <p className="text-bombon-textMuted italic">
                {data.varianceSummary}
              </p>
            </div>
          )}
        </div>
      );
    } catch (e) {
      return <p>{content}</p>;
    }
  };

  return (
    <div className="flex h-screen bg-bombon-dark text-bombon-textMain font-sans selection:bg-[#D4FF00] selection:text-black">
      {/* Sidebar Layout */}
      <aside className="w-64 bg-bombon-dark border-r border-white/5 p-4 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-bombon-accent to-green-400 flex items-center justify-center">
            <span className="text-black font-bold text-xl">P</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Peak.</h1>
        </div>

        <button
          onClick={handleNewAnalysis}
          className="w-full bg-bombon-panel hover:bg-white/5 text-left px-4 py-3 rounded-xl border border-white/5 transition-all mb-6 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-bombon-accent">+</span> New Analysis
        </button>

        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-bombon-textMuted mb-3 px-2 uppercase tracking-wider">
            Recent Checks
          </p>
          <div className="space-y-1">
            {/* 5. Dynamically Map Chat Rooms from Firebase */}
            {chatRooms.length === 0 && (
              <p className="text-xs text-bombon-textMuted px-2">
                No past sessions.
              </p>
            )}
            {chatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleSelectRoom(room.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all truncate ${
                  currentRoomId === room.id
                    ? "bg-bombon-panel text-white border border-white/5"
                    : "text-bombon-textMuted hover:bg-bombon-panel hover:text-white"
                }`}
              >
                {room.title}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 mt-auto flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-bombon-panel"></div>
          <div className="text-sm">
            <p className="font-medium">Student Account</p>
            <p className="text-xs text-bombon-textMuted">English 101</p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-white/5 flex items-center px-6 bg-bombon-dark/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-lg font-medium">Writing Assistant</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto mt-20">
              <h3 className="text-6xl font-bold mb-4 font-instrument text-bombon-accent">
                Refine your writing.
              </h3>
              <p className="text-bombon-textMuted">
                Paste your paragraph below. I'll analyze grammar, highlight
                'telling' vs 'showing', and improve your sentence structures.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`flex gap-4 max-w-3xl mx-auto ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-md bg-bombon-panel flex items-center justify-center shrink-0 border border-white/5">
                    <span className="text-bombon-accent text-xs font-bold">
                      AI
                    </span>
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-bombon-panel border border-white/5 text-white rounded-tr-sm"
                      : "bg-transparent text-gray-200"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  ) : (
                    <AiResponseRenderer content={msg.content} />
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-4 max-w-3xl mx-auto">
              <div className="w-8 h-8 rounded-md bg-bombon-panel flex items-center justify-center shrink-0 animate-pulse border border-white/5"></div>
              <div className="p-4 rounded-2xl bg-transparent flex items-center">
                <span className="text-bombon-textMuted text-sm animate-pulse">
                  Analyzing text...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-gradient-to-t from-bombon-dark via-bombon-dark to-transparent">
          <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-bombon-panel border border-white/10 rounded-2xl focus-within:border-bombon-accent/50 transition-colors shadow-2xl overflow-hidden p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Paste your essay paragraph here..."
              className="w-full bg-transparent text-white placeholder-bombon-textMuted resize-none outline-none p-3 max-h-48 min-h-[56px] text-sm"
              rows={2}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="mb-1 mr-1 p-3 rounded-xl bg-bombon-accent text-black font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-bombon-textMuted mt-3">
            Peak AI can make mistakes. Review suggestions carefully.
          </p>
        </div>
      </main>
    </div>
  );
}
