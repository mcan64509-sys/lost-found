// Server-side admin email list.
// Prefer private ADMIN_EMAILS env var; fall back to NEXT_PUBLIC_ADMIN_EMAILS
// so existing deployments keep working without a re-deploy.
export const ADMIN_EMAILS_LIST = (
  process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || ""
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
