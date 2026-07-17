# BulanVarMı? — Platform Documentation (English)

---

## 1. Project Overview

**BulanVarMı?** ("Did Someone Find It?") is a lost & found item platform targeting Turkey. Users can post lost or found item listings, receive AI-powered matching suggestions, and get live support from admins. The platform supports web, PWA, and native mobile (iOS + Android) via Capacitor.

**Core Value Proposition:**
- A user who lost an item posts a "Lost" listing.
- A user who found an item posts a "Found" listing.
- The AI engine automatically matches lost items with found items.
- Matched users are notified and can contact each other via the in-app messaging system.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) — `--webpack` flag required |
| UI | Tailwind CSS v4, Lucide React icons, Sonner toast |
| Database | Supabase (PostgreSQL, RLS enabled on all tables) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — matching, moderation, category detection |
| Email | Resend |
| Payment | Stripe |
| Maps | Leaflet + react-leaflet |
| Push Notifications | web-push (VAPID) |
| Cache / Rate Limit | Upstash Redis |
| Mobile | Capacitor (iOS + Android) |
| PWA | Serwist |

---

## 3. Commands

```bash
npm run dev      # Development server (webpack)
npm run build    # Production build
npm run lint     # ESLint
npm run cap:sync # Sync Capacitor (iOS/Android)
```

---

## 4. Supabase Database

- **Project ID:** `uvaccwynznrtmqiklets`
- **Region:** eu-west-1
- **Host:** db.uvaccwynznrtmqiklets.supabase.co

### Tables (public schema — RLS enabled on all)

| Table | Description |
|-------|-------------|
| `items` | Lost/found listings (`type`: `"lost"` or `"found"`) |
| `profiles` | User profiles (`is_banned`, `is_admin`, etc.) |
| `claims` | Ownership claim requests on listings |
| `conversations` | Messaging conversations between users |
| `messages` | Messages within conversations |
| `notifications` | In-app notifications |
| `favorites` | User-favorited listings |
| `ratings` | User ratings/reviews |
| `reports` | Listing/user abuse reports |
| `email_preferences` | Per-user email preference settings |
| `search_alerts` | Saved search alerts (alert system) |
| `push_subscriptions` | Web push notification subscriptions |
| `payments` | Stripe payment records |
| `sightings` | "I saw it" reports (location + note) |
| `success_stories` | Match success stories (`approved` field) |
| `referrals` | Referral / invite system |
| `blacklisted_emails` | Email blacklist |
| `user_requests` | User request/complaint form submissions |
| `message_templates` | Pre-built message templates |
| `support_sessions` | Live support sessions (`status`: `waiting` \| `active` \| `closed`) |
| `support_messages` | Live support messages (`sender_type`: `user` \| `admin`) |

---

## 5. Folder Structure

```
src/
├── app/
│   ├── admin/            # Admin panel (page.tsx — single large file ~1600 lines)
│   ├── api/              # API route handlers
│   │   ├── admin/        # Ban, reports, user management
│   │   ├── agent/        # AI agents (match, moderate, resolve-reports)
│   │   ├── support/      # Live support (start, send, messages, sessions, close)
│   │   ├── cron/         # Scheduled/cron jobs
│   │   └── ...
│   ├── items/[id]/       # Listing detail, edit, poster, claim
│   ├── auth/             # Login, register, password reset
│   └── ...
├── components/           # Shared UI components
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── auth.ts           # getAuthenticatedUser() — use in all API routes
│   ├── email.ts          # Resend email functions
│   ├── stripe.ts         # Stripe client
│   └── ratelimit.ts      # Upstash rate limiting
└── types/
    └── chat.ts
```

---

## 6. Key Patterns & Rules

### API Route Authentication

Every API route must authenticate the user first:

```ts
import { getAuthenticatedUser } from "@/lib/auth";

const user = await getAuthenticatedUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Admin Check

```ts
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
```

### Supabase Client Usage

- **Client-side:** `import { supabase } from "@/lib/supabase"`
- **Server-side (API routes):** `createClient` with the service role key (env var)

### Realtime (Live Support & Messaging)

Supabase realtime `postgres_changes` is used for live support and messaging.

Channel naming conventions:
- Admin side: `admin-support-{sessionId}`
- User side: `support-session-{sessionId}`

---

## 7. UI / Design Rules

| Rule | Value |
|------|-------|
| Language | Turkish (all UI text) |
| Background | `#080d1a` / `#07101f` / `#0d1a2e` |
| Border color | `border-[#1a2744]` |
| Color system | Tailwind dark palette, blue accent (`blue-600`) |
| Toast notifications | Sonner (`toast.success`, `toast.error`) |
| Responsive | Mobile-first; use `sm:` and `lg:` breakpoints |
| Mobile layout | `flex-col lg:flex-row` pattern for horizontal flex layouts |

---

## 8. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

NEXT_PUBLIC_ADMIN_EMAILS          # comma-separated admin email addresses

ANTHROPIC_API_KEY

RESEND_API_KEY

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

---

## 9. Deployment

| Item | Value |
|------|-------|
| Platform | Vercel (auto-deploy on push) |
| Repository | https://github.com/mcan64509-sys/lost-found.git |
| Branch | `master` → production |
| Rule | Every push to `master` goes live immediately |

---

## 10. Feature Overview

### Listing System

- Users post **Lost** or **Found** listings with title, description, category, location (map), photos, and contact info.
- Listings have a status lifecycle: `active` → `resolved`.
- Each listing has a shareable poster page (`/items/[id]/poster`) for printing or social sharing.

### AI Matching Engine (`/api/agent/match`)

- When a new listing is created, the AI agent scans existing listings of the opposite type.
- Uses Claude (Anthropic) to compute semantic similarity and location proximity.
- Notifies both parties when a potential match is found.

### AI Moderation (`/api/agent/moderate`)

- Incoming listings are checked for inappropriate content before going live.
- Uses Claude for text classification.

### Messaging System

- Users can open a conversation from any listing.
- Real-time messaging via Supabase realtime.
- Pre-built message templates available (`message_templates` table).

### Live Support

- Floating `ChatWidget.tsx` on the user side.
- Admin manages sessions in the `support` tab inside `admin/page.tsx`.
- Sessions have three states: `waiting`, `active`, `closed`.
- Real-time via Supabase `postgres_changes`.

### Notification System

- In-app notifications stored in `notifications` table.
- Web push via VAPID (`push_subscriptions` table).
- Email notifications via Resend.

### Search Alerts

- Users save search queries in `search_alerts`.
- A cron job (`/api/cron/`) periodically checks for new matches and notifies users.

### Sightings

- Any user can submit a "I saw this item" report with a map location and note.
- Helps the original owner narrow down the search area.

### Success Stories

- When a lost item is found, users can submit a success story.
- Admin approves stories before they appear publicly.

### Referral System

- Users can invite others with a referral link.
- Tracked in the `referrals` table.

### Admin Panel (`/admin`)

Single-file panel (`admin/page.tsx`, ~1600 lines) with tabs:

- **Items:** All listings, approval, deletion
- **Users:** Ban/unban, profile management
- **Reports:** Abuse report review and resolution
- **Support:** Live support session management
- **Success Stories:** Approve/reject stories
- **User Requests:** Review form submissions

---

## 11. Mobile (Capacitor)

The app is wrapped with Capacitor for native iOS and Android distribution.

```bash
npm run cap:sync    # Sync web build to native projects
```

Native project directories:
- `android/` — Android (Gradle)
- `ios/` — iOS (Xcode)

---

## 12. Development Notes

- `admin/page.tsx` is a single large file (~1600 lines) — all admin tabs live in one file intentionally.
- **Optimistic UI** pattern is used throughout (e.g., message sending appears immediately before server confirmation).
- The app uses the `--webpack` flag for the Next.js dev server — do not switch to Turbopack.
- RLS (Row Level Security) is enabled on every Supabase table — always test queries with the correct auth context.
- Rate limiting via Upstash Redis is applied to sensitive API routes (AI agents, auth actions).
