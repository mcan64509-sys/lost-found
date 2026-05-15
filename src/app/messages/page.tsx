"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { supabase } from "../../lib/supabase";
import { getUserConversations } from "../../lib/chat";
import type { Conversation } from "../../types/chat";
import { toast } from "sonner";
import { normalizeEmail } from "../../lib/utils";

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function MessagesPage() {
  const [userEmail, setUserEmail] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasConversations = useMemo(
    () => conversations.length > 0,
    [conversations]
  );

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        const sessionUser = sessionData.session?.user;

        if (!sessionUser?.email) {
          setUserEmail("");
          setConversations([]);
          setUnreadMap({});
          setLoading(false);
          return;
        }

        const currentUserEmail = normalizeEmail(sessionUser.email);
        setUserEmail(currentUserEmail);

        const data = await getUserConversations(currentUserEmail);
        setConversations(data);

        const { data: unreadMessages, error: unreadError } = await supabase
          .from("messages")
          .select("conversation_id")
          .eq("is_read", false)
          .neq("sender_email", currentUserEmail);

        if (unreadError) {
          setUnreadMap({});
        } else {
          const nextMap: Record<string, number> = {};

          (unreadMessages || []).forEach((msg: { conversation_id: string }) => {
            nextMap[msg.conversation_id] = (nextMap[msg.conversation_id] || 0) + 1;
          });

          setUnreadMap(nextMap);
        }
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Mesajlar yüklenirken bir hata oluştu.");
        }

        setConversations([]);
        setUnreadMap({});
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  // Realtime: yeni mesaj → okunmamış sayacı güncelle, yeni konuşma → listeye ekle
  useEffect(() => {
    if (!userEmail) return;

    const channel = supabase
      .channel("messages-page-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { conversation_id: string; sender_email: string };
          if (normalizeEmail(msg.sender_email) !== normalizeEmail(userEmail)) {
            setUnreadMap((prev) => ({
              ...prev,
              [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1,
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        async (payload) => {
          const conv = payload.new as { owner_email: string; claimant_email: string };
          if (
            normalizeEmail(conv.owner_email) === normalizeEmail(userEmail) ||
            normalizeEmail(conv.claimant_email) === normalizeEmail(userEmail)
          ) {
            const data = await getUserConversations(userEmail);
            setConversations(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail]);

  async function handleDeleteConversation(conversationId: string) {
    try {
      setDeletingId(conversationId);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/conversations/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ conversationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Sohbet silinemedi.");
        return;
      }

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      toast.success("Sohbet silindi.");
    } catch {
      toast.error("Sohbet silinirken bir hata oluştu.");
    } finally {
      setDeletingId(null);
    }
  }

  function getOtherUserEmail(conversation: Conversation) {
    return normalizeEmail(conversation.owner_email) === normalizeEmail(userEmail)
      ? conversation.claimant_email
      : conversation.owner_email;
  }

  return (
    <>
      <AppHeader />

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        message="Sohbeti silmek istediğine emin misin?"
        description="Tüm mesajlar kalıcı olarak silinir, bu işlem geri alınamaz."
        confirmLabel="Evet, sil"
        danger
        onConfirm={() => { const id = confirmDeleteId!; setConfirmDeleteId(null); handleDeleteConversation(id); }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black md:text-4xl">Mesajlar</h1>
              <p className="mt-2 text-slate-400">
                Onaylanan talepler sonrası başlayan sohbetler burada listelenir.
              </p>
            </div>

            <Link
              href="/"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900"
            >
              ← Ana Sayfa
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="h-5 w-36 animate-pulse rounded bg-slate-800" />
                  <div className="mt-3 h-4 w-52 animate-pulse rounded bg-slate-800" />
                  <div className="mt-4 h-4 w-24 animate-pulse rounded bg-slate-800" />
                </div>
              ))}
            </div>
          ) : !userEmail ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="text-2xl font-bold">Giriş yapman gerekiyor</h2>
              <p className="mt-2 text-slate-400">
                Mesajlarını görmek için önce hesabına giriş yap.
              </p>

              <div className="mt-6 flex gap-3">
                <Link
                  href="/auth/login"
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Giriş Yap
                </Link>

                <Link
                  href="/auth/register"
                  className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>
          ) : !hasConversations ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
              <h2 className="text-2xl font-bold">Henüz sohbet yok</h2>
              <p className="mt-3 text-slate-400">
                Bir claim onaylandığında burada yeni sohbet görünür.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => {
                const unreadCount = unreadMap[conversation.id] || 0;

                return (
                  <div
                    key={conversation.id}
                    className="group flex items-stretch rounded-3xl border border-slate-800 bg-slate-900 transition hover:border-slate-700"
                  >
                    {/* Tıklanabilir alan */}
                    <Link
                      href={`/messages/${conversation.id}`}
                      className="min-w-0 flex-1 p-5"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                          Claim sohbeti
                        </span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount} yeni
                          </span>
                        )}
                        <span className="ml-auto text-xs text-slate-500">
                          {formatDate(conversation.created_at)}
                        </span>
                      </div>
                      <h2 className="truncate text-lg font-semibold text-white">
                        {conversation.item_title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Karşı taraf: {getOtherUserEmail(conversation)}
                      </p>
                    </Link>

                    {/* Sil butonu — sağda ayrı alan */}
                    <div className="flex items-center border-l border-slate-800 px-3">
                      <button
                        onClick={() => setConfirmDeleteId(conversation.id)}
                        disabled={deletingId === conversation.id}
                        className="rounded-xl p-2 text-slate-600 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 disabled:opacity-40"
                        title="Sohbeti sil"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}