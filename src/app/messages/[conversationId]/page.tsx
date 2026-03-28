"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getConversationById,
  getMessages,
  sendMessage,
} from "../../../lib/chat";
import { supabase } from "../../../lib/supabase";
import type { Conversation, Message } from "../../../types/chat";
import { toast } from "sonner";
import AppHeader from "../../../components/AppHeader";
import ConfirmDialog from "../../../components/ConfirmDialog";

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = String(params.conversationId);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedOwnerEmail = useMemo(
    () => normalizeEmail(conversation?.owner_email),
    [conversation]
  );

  const normalizedClaimantEmail = useMemo(
    () => normalizeEmail(conversation?.claimant_email),
    [conversation]
  );

  const normalizedUserEmail = useMemo(
    () => normalizeEmail(userEmail),
    [userEmail]
  );

  const otherSideEmail = useMemo(() => {
    if (!conversation || !normalizedUserEmail) return "";

    if (normalizedOwnerEmail === normalizedUserEmail) {
      return normalizedClaimantEmail;
    }

    if (normalizedClaimantEmail === normalizedUserEmail) {
      return normalizedOwnerEmail;
    }

    return "";
  }, [
    conversation,
    normalizedOwnerEmail,
    normalizedClaimantEmail,
    normalizedUserEmail,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function markMessagesAsRead(currentUserEmail: string) {
    try {
      const normalizedCurrent = normalizeEmail(currentUserEmail);

      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("is_read", false)
        .neq("sender_email", normalizedCurrent);

      if (error) {
        console.error("Mark read error:", error);
      }

      setMessages((prev) =>
        prev.map((msg) =>
          normalizeEmail(msg.sender_email) !== normalizedCurrent
            ? { ...msg, is_read: true }
            : msg
        )
      );
    } catch (error) {
      console.error("markMessagesAsRead unexpected error:", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      try {
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const sessionUser = session?.user;

        if (!sessionUser?.email) {
          toast.error("Mesajları görmek için giriş yapmalısın.");
          router.push("/auth/login");
          return;
        }

        const currentUserEmail = normalizeEmail(sessionUser.email);

        const [conversationData, messageData] = await Promise.all([
          getConversationById(conversationId),
          getMessages(conversationId),
        ]);

        if (!conversationData) {
          if (isMounted) {
            setConversation(null);
            setMessages([]);
          }
          return;
        }

        const isParticipant =
          normalizeEmail(conversationData.owner_email) === currentUserEmail ||
          normalizeEmail(conversationData.claimant_email) === currentUserEmail;

        if (!isParticipant) {
          toast.error("Bu sohbeti görüntüleme yetkin yok.");
          router.push("/messages");
          return;
        }

        if (isMounted) {
          setUserEmail(currentUserEmail);
          setConversation(conversationData);
          setMessages(messageData);
        }

        await markMessagesAsRead(currentUserEmail);
      } catch (error) {
        console.error("Conversation detail load error:", error);
        toast.error("Sohbet yüklenirken bir hata oluştu.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [conversationId, router]);

  useEffect(() => {
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const incoming = payload.new as Message;

          setMessages((prev) => {
            if (prev.some((msg) => msg.id === incoming.id)) return prev;
            return [...prev, incoming];
          });

          if (
            normalizedUserEmail &&
            normalizeEmail(incoming.sender_email) !== normalizedUserEmail
          ) {
            await markMessagesAsRead(normalizedUserEmail);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("connected");
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          setRealtimeStatus("error");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, normalizedUserEmail]);

  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [loading]);

  async function handleDeleteMessage(messageId: string) {
    try {
      setDeletingMsgId(messageId);
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_email", normalizedUserEmail);

      if (error) {
        toast.error("Mesaj silinemedi.");
        return;
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      toast.error("Mesaj silinirken bir hata oluştu.");
    } finally {
      setDeletingMsgId(null);
    }
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();

    const trimmed = newMessage.trim();
    if (!trimmed || !normalizedUserEmail || !conversation) return;

    try {
      setSending(true);

      const createdMessage = await sendMessage({
        conversationId,
        senderEmail: normalizedUserEmail,
        content: trimmed,
      });

      setMessages((prev) => {
        if (prev.some((msg) => msg.id === createdMessage.id)) return prev;
        return [...prev, createdMessage];
      });

      setNewMessage("");

      const receiverEmail = normalizeEmail(otherSideEmail);

      if (
        receiverEmail &&
        receiverEmail !== normalizedUserEmail
      ) {
        const notifyRes = await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: receiverEmail,
            type: "message",
            title: "💬 Yeni mesajın var!",
            message: `${normalizedUserEmail} sana "${conversation.item_title}" ilanı hakkında mesaj gönderdi.`,
            itemId: conversation.item_id,
          }),
        });

        if (!notifyRes.ok) {
          const errorText = await notifyRes.text();
          console.error("Notify request failed:", errorText);
        }
      } else {
        console.error("Geçersiz receiverEmail:", {
          userEmail: normalizedUserEmail,
          owner_email: normalizedOwnerEmail,
          claimant_email: normalizedClaimantEmail,
          otherSideEmail,
        });
      }

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Mesaj gönderilirken bir hata oluştu.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <AppHeader />

      <ConfirmDialog
        isOpen={confirmDeleteMsgId !== null}
        message="Mesajı silmek istediğine emin misin?"
        confirmLabel="Evet, sil"
        danger
        onConfirm={() => {
          const id = confirmDeleteMsgId!;
          setConfirmDeleteMsgId(null);
          handleDeleteMessage(id);
        }}
        onCancel={() => setConfirmDeleteMsgId(null)}
      />

      {loading ? (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-400">Sohbet yükleniyor...</p>
          </div>
        </main>
      ) : !conversation ? (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <Link href="/messages" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              ← Mesajlara Dön
            </Link>
            <h1 className="mt-4 text-3xl font-bold">Sohbet bulunamadı</h1>
            <p className="mt-2 text-slate-400">
              Bu konuşma silinmiş olabilir ya da erişim yetkin olmayabilir.
            </p>
          </div>
        </main>
      ) : (
        <main className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6 md:py-10">
          <div className="mx-auto flex h-[calc(100vh-96px)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-5 py-4">
              <Link href="/messages" className="text-sm text-blue-400 hover:text-blue-300">
                ‹ Mesajlara Dön
              </Link>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{conversation.item_title}</h1>
                  <p className="mt-1 text-sm text-slate-400">
                    Sohbet edilen kişi: {otherSideEmail || "-"}
                  </p>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs ${
                    realtimeStatus === "connected"
                      ? "bg-green-900/40 text-green-300"
                      : realtimeStatus === "connecting"
                      ? "bg-yellow-900/40 text-yellow-300"
                      : "bg-red-900/40 text-red-300"
                  }`}
                >
                  {realtimeStatus === "connected" && "Canlı bağlantı aktif"}
                  {realtimeStatus === "connecting" && "Bağlanıyor"}
                  {realtimeStatus === "error" && "Canlı bağlantı hatası"}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-slate-400">
                  Henüz mesaj yok. İlk mesajı sen gönder.
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isMine =
                      normalizeEmail(message.sender_email) === normalizedUserEmail;

                    // Sistem mesajı
                    if (message.is_system || message.sender_email === "system") {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-center text-xs text-green-300">
                            {message.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id}
                        className={`group flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        {/* Sil butonu — sadece kendi mesajımda, solda görünsün */}
                        {isMine && (
                          <button
                            onClick={() => setConfirmDeleteMsgId(message.id)}
                            disabled={deletingMsgId === message.id}
                            className="mb-1 hidden rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-800 hover:text-red-400 group-hover:block disabled:opacity-40"
                            title="Mesajı sil"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        )}

                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                            isMine
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-100"
                          }`}
                        >
                          <p className="break-words text-sm">{message.content}</p>
                          <p
                            className={`mt-2 text-[11px] ${
                              isMine ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-4">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Gönderiliyor..." : "Gönder"}
                </button>
              </div>
            </form>
          </div>
        </main>
      )}
    </>
  );
}