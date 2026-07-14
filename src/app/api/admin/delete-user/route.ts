import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPermission } from "../../../../lib/adminAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const callerEmail = await verifyPermission(req, "delete_users");
  if (!callerEmail) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { targetUserId, targetEmail } = await req.json();

  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId gerekli" }, { status: 400 });
  }
  if (targetEmail && targetEmail.toLowerCase() === callerEmail) {
    return NextResponse.json({ error: "Kendinizi silemezsiniz" }, { status: 400 });
  }

  // Delete from auth.users — cascades to profiles via FK
  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also delete profile row (in case FK cascade isn't set)
  await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);

  return NextResponse.json({ success: true });
}
