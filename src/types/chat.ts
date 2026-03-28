export type Conversation = {
  id: string;
  claim_id: string;
  item_id: string;
  item_title: string;
  owner_email: string;
  claimant_email: string;
  created_at: string;
};

export type CreateConversationInput = {
  claimId: string;
  itemId: string;
  itemTitle: string;
  ownerEmail: string;
  claimantEmail: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_email: string;
  content: string;
  is_read: boolean;
  is_system?: boolean;
  created_at: string;
};

export type SendMessageInput = {
  conversationId: string;
  senderEmail: string;
  content: string;
};