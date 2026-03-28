import { supabase } from "./supabase";
import type {
  Conversation,
  CreateConversationInput,
  Message,
  SendMessageInput,
} from "../types/chat";

export async function getOrCreateConversationByClaim(
  input: CreateConversationInput
): Promise<Conversation> {
  const { data: existingConversation, error: existingError } = await supabase
    .from("conversations")
    .select("*")
    .eq("claim_id", input.claimId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingConversation) {
    return existingConversation as Conversation;
  }

  const { data: newConversation, error: insertError } = await supabase
    .from("conversations")
    .insert({
      claim_id: input.claimId,
      item_id: input.itemId,
      item_title: input.itemTitle,
      owner_email: input.ownerEmail,
      claimant_email: input.claimantEmail,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return newConversation as Conversation;
}

export async function getUserConversations(
  userEmail: string
): Promise<Conversation[]> {
  const normalizedEmail = userEmail.trim().toLowerCase();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(
      `owner_email.eq.${normalizedEmail},claimant_email.eq.${normalizedEmail}`
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Conversation[];
}

export async function getConversationById(
  conversationId: string
): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Conversation | null) || null;
}

export async function getMessages(
  conversationId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Message[];
}

export async function sendMessage(
  input: SendMessageInput
): Promise<Message> {
  const trimmedContent = input.content.trim();

  if (!trimmedContent) {
    throw new Error("Mesaj boş olamaz.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_email: input.senderEmail.trim().toLowerCase(),
      content: trimmedContent,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Message;
}