import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "Lost & Found <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function baseTemplate(content: string): string {
  return `
    <div style="font-family:sans-serif;max-width:580px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:28px 24px;border-radius:16px;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:800;color:#fff;">Lost &amp; Found</p>
      ${content}
      <p style="margin-top:32px;font-size:11px;color:#475569;">Bu e-posta Lost &amp; Found platformu tarafından gönderilmiştir. <a href="${APP_URL}" style="color:#60a5fa;text-decoration:none;">Platforma git →</a></p>
    </div>
  `;
}

function itemButton(itemId: string, label = "İlanı Görüntüle"): string {
  return `<a href="${APP_URL}/items/${itemId}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;margin-top:20px;">${label}</a>`;
}

export async function sendClaimReceivedEmail({
  ownerEmail,
  claimantName,
  itemTitle,
  itemId,
}: {
  ownerEmail: string;
  claimantName: string;
  itemTitle: string;
  itemId: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: ownerEmail,
    subject: `Yeni Sahiplik Talebi — ${itemTitle}`,
    html: baseTemplate(`
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;">"${itemTitle}" ilanına yeni talep</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0;"><strong style="color:#e2e8f0;">${claimantName}</strong> eşyanın kendisine ait olduğunu iddia ederek sahiplik talebinde bulundu.</p>
      <p style="color:#94a3b8;line-height:1.6;margin:12px 0 0;">Profil sayfanızdan talebi inceleyebilir, onaylayabilir veya reddedebilirsiniz.</p>
      ${itemButton(itemId, "Talebi İncele")}
    `),
  });
}

export async function sendClaimApprovedEmail({
  claimerEmail,
  itemTitle,
  itemId,
}: {
  claimerEmail: string;
  itemTitle: string;
  itemId: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: claimerEmail,
    subject: `✅ Sahiplik Talebiniz Onaylandı — ${itemTitle}`,
    html: baseTemplate(`
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;color:#4ade80;">Talebiniz onaylandı!</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0;">"<strong style="color:#e2e8f0;">${itemTitle}</strong>" ilanı için gönderdiğiniz sahiplik talebi ilan sahibi tarafından onaylandı.</p>
      <p style="color:#94a3b8;line-height:1.6;margin:12px 0 0;">İlan sahibiyle mesajlaşma ekranından iletişime geçebilirsiniz.</p>
      ${itemButton(itemId)}
    `),
  });
}

export async function sendClaimRejectedEmail({
  claimerEmail,
  itemTitle,
  itemId,
}: {
  claimerEmail: string;
  itemTitle: string;
  itemId: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: claimerEmail,
    subject: `❌ Sahiplik Talebiniz Reddedildi — ${itemTitle}`,
    html: baseTemplate(`
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;color:#f87171;">Talebiniz reddedildi</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0;">"<strong style="color:#e2e8f0;">${itemTitle}</strong>" ilanı için gönderdiğiniz sahiplik talebi maalesef reddedildi.</p>
      <p style="color:#94a3b8;line-height:1.6;margin:12px 0 0;">Daha ayrıntılı bilgi için ilan sahibiyle mesajlaşabilirsiniz.</p>
      ${itemButton(itemId)}
    `),
  });
}

export async function sendNewMessageEmail({
  recipientEmail,
  senderName,
  messagePreview,
  conversationId,
}: {
  recipientEmail: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}) {
  const convUrl = `${APP_URL}/messages/${conversationId}`;
  return resend.emails.send({
    from: FROM,
    to: recipientEmail,
    subject: `Yeni mesaj — ${senderName}`,
    html: baseTemplate(`
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;">Yeni bir mesajınız var</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0;"><strong style="color:#e2e8f0;">${senderName}</strong> size mesaj gönderdi:</p>
      <blockquote style="border-left:3px solid #334155;margin:14px 0;padding:10px 14px;color:#cbd5e1;font-style:italic;">${messagePreview}</blockquote>
      <a href="${convUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:11px 22px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Yanıtla →</a>
    `),
  });
}

export async function sendItemMatchEmail({
  userEmail,
  matchedTitle,
  originalTitle,
  matchedItemId,
}: {
  userEmail: string;
  matchedTitle: string;
  originalTitle: string;
  matchedItemId: string;
}) {
  return resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `🔍 Eşleşme bulundu — ${originalTitle}`,
    html: baseTemplate(`
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;color:#60a5fa;">Yeni eşleşme!</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0;">
        "<strong style="color:#e2e8f0;">${originalTitle}</strong>" ilanınızla eşleşen yeni bir ilan bulundu:
      </p>
      <p style="margin:14px 0;padding:12px 16px;background:#1e293b;border-radius:10px;color:#e2e8f0;font-weight:600;">${matchedTitle}</p>
      <p style="color:#94a3b8;font-size:13px;">Bu eşleşme yapay zeka tarafından oluşturulmuştur. Yanıltıcı olabilir.</p>
      ${itemButton(matchedItemId, "Eşleşmeyi Gör")}
    `),
  });
}
