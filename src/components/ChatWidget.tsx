"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Bot, HeadphonesIcon, Clock, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

type Message = { role: "user" | "assistant"; content: string };
type SupportMessage = {
  id: string;
  session_id?: string;
  sender_type: "user" | "admin";
  sender_email: string;
  content: string;
  created_at: string;
};
type SupportMode = "idle" | "waiting" | "active" | "closed";

const QUICK_QUESTIONS = [
  "İlan nasıl veririm?",
  "Eşyamı kaybettim, ne yapmalıyım?",
  "AI eşleştirme nasıl çalışır?",
  "Talep nasıl gönderilir?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);

  // Canlı destek
  const [supportMode, setSupportMode] = useState<SupportMode>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [startingSupport, setStartingSupport] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supportInputRef = useRef<HTMLInputElement>(null);

  // Auth token + email al, mevcut destek oturumunu kontrol et (auto-resume)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAccessToken(session?.access_token || "");
      const email = session?.user?.email || "";
      setUserEmail(email);

      if (!email) return;
      // Aktif veya bekleyen oturum var mı?
      const { data: existing } = await supabase
        .from("support_sessions")
        .select("id, status, admin_name")
        .eq("user_email", email)
        .in("status", ["waiting", "active"])
        .maybeSingle();

      if (existing) {
        setSessionId(existing.id);
        setSupportMode(existing.status as SupportMode);
        setAdminName(existing.admin_name || "");
        if (existing.status === "active") {
          const { data: msgs } = await supabase
            .from("support_messages")
            .select("*")
            .eq("session_id", existing.id)
            .order("created_at", { ascending: true });
          setSupportMessages(msgs || []);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => {
        if (supportMode === "active") supportInputRef.current?.focus();
        else inputRef.current?.focus();
      }, 100);
    }
  }, [open, supportMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, supportMessages]);

  // Session realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const sessionChannel = supabase
      .channel(`support-session-${sessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "support_sessions",
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        const updated = payload.new as { status: string; admin_name?: string };
        if (updated.status === "active") {
          setSupportMode("active");
          setAdminName(updated.admin_name || "");
          setUnread(true);
        } else if (updated.status === "closed") {
          setSupportMode("closed");
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage;
        setSupportMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          // Optimistic temp mesajını gerçeğiyle değiştir
          const withoutTemp = prev.filter(
            (m) => !(m.id.startsWith("tmp-") && m.sender_type === msg.sender_type && m.content === msg.content)
          );
          return [...withoutTemp, msg];
        });
        if (!open) setUnread(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(sessionChannel); };
  }, [sessionId, open]);

  async function startSupport() {
    setStartingSupport(true);
    try {
      const res = await fetch("/api/support/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        const mode: SupportMode = data.status === "active" ? "active" : "waiting";
        setSupportMode(mode);
        if (data.admin_name) setAdminName(data.admin_name);
        if (mode === "active") loadSupportMessages(data.sessionId);
      }
    } catch {
    } finally {
      setStartingSupport(false);
    }
  }

  async function loadSupportMessages(sid: string) {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("session_id", sid)
      .order("created_at", { ascending: true });
    setSupportMessages(data || []);
  }

  async function sendSupportMessage() {
    if (!supportInput.trim() || !sessionId || sendingSupport) return;
    const text = supportInput.trim();
    setSupportInput("");

    // Optimistic: hemen göster
    const tempId = `tmp-${Date.now()}`;
    const tempMsg: SupportMessage = {
      id: tempId,
      session_id: sessionId,
      sender_type: "user",
      sender_email: userEmail || "anonim",
      content: text,
      created_at: new Date().toISOString(),
    };
    setSupportMessages((prev) => [...prev, tempMsg]);

    try {
      const { error } = await supabase.from("support_messages").insert({
        session_id: sessionId,
        sender_type: "user",
        sender_email: userEmail || "anonim",
        content: text,
      });
      if (error) setSupportMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch {
      setSupportMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  async function closeSupport() {
    if (!sessionId || !accessToken) return;
    await fetch("/api/support/close", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    setSupportMode("closed");
  }

  function exitSupport() {
    setSupportMode("idle");
    setSessionId(null);
    setSupportMessages([]);
  }

  async function sendAiMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Bir hata oluştu." }]);
      if (!open) setUnread(true);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Bağlantı hatası. Lütfen tekrar deneyin." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleAiSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendAiMessage(input);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105"
        aria-label="Yardım asistanı"
      >
        {open ? <X className="w-6 h-6" /> : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unread && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-600" />}
          </>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[60] w-80 sm:w-96 flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-8rem)]">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${supportMode !== "idle" ? "bg-green-600" : "bg-blue-600"}`}>
              {supportMode !== "idle" ? <HeadphonesIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {supportMode !== "idle" ? "Canlı Destek" : "BulanVarMı? Asistan"}
              </p>
              <p className="text-xs text-slate-400">
                {supportMode === "waiting" && "Destek temsilcisi bekleniyor..."}
                {supportMode === "active" && (adminName ? `${adminName} (ADMİN) bağlandı` : "Destek temsilcisi bağlandı")}
                {supportMode === "closed" && "Oturum sonlandı"}
                {supportMode === "idle" && "Yardıma hazırım"}
              </p>
            </div>
            {supportMode !== "idle" && (
              <button
                onClick={supportMode === "closed" ? exitSupport : closeSupport}
                className="text-xs text-slate-400 hover:text-red-400 transition flex-shrink-0"
              >
                {supportMode === "closed" ? "Kapat" : "Sonlandır"}
              </button>
            )}
          </div>

          {/* === BEKLEYEN EKRANI === */}
          {supportMode === "waiting" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-8 h-8 text-yellow-400 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-white">Sıradasınız</p>
                <p className="text-sm text-slate-400 mt-1">Destek temsilcisi en kısa sürede bağlanacak.</p>
              </div>
              <button
                onClick={closeSupport}
                className="text-xs text-slate-500 hover:text-red-400 transition"
              >
                İptal et
              </button>
            </div>
          )}

          {/* === KAPALI EKRANI === */}
          {supportMode === "closed" && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Oturum sonlandı</p>
                <p className="text-sm text-slate-400 mt-1">Destek talebiniz tamamlandı. Tekrar yardım almak isterseniz yeni bir oturum başlatabilirsiniz.</p>
              </div>
              <button
                onClick={exitSupport}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition"
              >
                Yeni oturum
              </button>
            </div>
          )}

          {/* === AKTİF DESTEK CHAT === */}
          {supportMode === "active" && (
            <>
              <div className="overflow-y-auto p-4 space-y-3 max-h-72">
                {supportMessages.length === 0 && (
                  <p className="text-xs text-slate-500 text-center">
                    {adminName ? `${adminName} (ADMİN) bağlandı. Mesajınızı yazın.` : "Destek temsilcisi bağlandı. Mesajınızı yazın."}
                  </p>
                )}
                {supportMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      m.sender_type === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"
                    }`}>
                      {m.sender_type === "admin" && (
                        <p className="text-[10px] text-green-400 font-semibold mb-1">
                          {adminName ? `${adminName} (ADMİN)` : "Destek Temsilcisi"}
                        </p>
                      )}
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex items-center gap-2 px-3 py-3 border-t border-slate-700 bg-slate-800">
                <input
                  ref={supportInputRef}
                  type="text"
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendSupportMessage()}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 bg-slate-900 text-slate-200 placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none border border-slate-700 focus:border-blue-500"
                  disabled={sendingSupport}
                />
                <button
                  onClick={sendSupportMessage}
                  disabled={!supportInput.trim() || sendingSupport}
                  className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          )}

          {/* === AI CHAT (normal mod) === */}
          {supportMode === "idle" && (
            <>
              <div className="overflow-y-auto p-4 space-y-3 max-h-60">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400 text-center">Merhaba! Kayıp eşya konusunda nasıl yardımcı olabilirim?</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_QUESTIONS.map((q) => (
                        <button key={q} onClick={() => sendAiMessage(q)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"
                    }`}>{m.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 rounded-xl px-3 py-2">
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Canlı destek butonu */}
              <div className="px-3 py-2 border-t border-slate-800">
                <button
                  onClick={startSupport}
                  disabled={startingSupport}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-green-600/40 bg-green-600/10 hover:bg-green-600/20 text-green-400 text-xs font-medium py-2 transition disabled:opacity-50"
                >
                  {startingSupport ? <Loader2 className="w-3 h-3 animate-spin" /> : <HeadphonesIcon className="w-3 h-3" />}
                  Canlı Destek Talebi Oluştur
                </button>
              </div>

              <form onSubmit={handleAiSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-slate-700 bg-slate-800">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 bg-slate-900 text-slate-200 placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none border border-slate-700 focus:border-blue-500"
                  disabled={loading}
                />
                <button type="submit" disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition flex-shrink-0">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
