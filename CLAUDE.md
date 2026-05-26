# BulanVarMı? — Proje Rehberi

## Proje Özeti
Türkiye'ye yönelik kayıp & bulundu eşya platformu. Kullanıcılar kayıp/bulundu ilanı açar, AI eşleştirme yapar, canlı destek alır. Next.js + Supabase + Anthropic Claude API.

## Stack
- **Framework:** Next.js 16 (App Router, `--webpack` flag zorunlu)
- **UI:** Tailwind CSS v4, Lucide React ikonlar, Sonner toast
- **Veritabanı:** Supabase (PostgreSQL, RLS aktif tüm tablolarda)
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) — eşleştirme, moderasyon, kategori tespiti
- **Email:** Resend
- **Ödeme:** Stripe
- **Harita:** Leaflet + react-leaflet
- **Push:** web-push (VAPID)
- **Cache/Rate limit:** Upstash Redis
- **Mobil:** Capacitor (iOS + Android)
- **PWA:** Serwist

## Komutlar
```bash
npm run dev      # Geliştirme (webpack)
npm run build    # Production build
npm run lint     # ESLint
```

## Supabase
- **Proje ID:** `uvaccwynznrtmqiklets`
- **Region:** eu-west-1
- **Host:** db.uvaccwynznrtmqiklets.supabase.co

### Tablolar (public schema, hepsi RLS aktif)
| Tablo | Açıklama |
|-------|----------|
| `items` | Kayıp/bulundu ilanları (type: "lost"\|"found") |
| `profiles` | Kullanıcı profilleri (is_banned, is_admin vb.) |
| `claims` | İlan sahiplik talepleri |
| `conversations` | Kullanıcı arası mesajlaşma konuşmaları |
| `messages` | Konuşma mesajları |
| `notifications` | Uygulama içi bildirimler |
| `favorites` | Kullanıcı favori ilanları |
| `ratings` | Kullanıcı değerlendirmeleri |
| `reports` | İlan/kullanıcı şikayetleri |
| `email_preferences` | E-posta tercih ayarları |
| `search_alerts` | Arama uyarıları (alert sistemi) |
| `push_subscriptions` | Web push abonelikleri |
| `payments` | Stripe ödeme kayıtları |
| `sightings` | "Gördüm" bildirimleri (konum + not) |
| `success_stories` | Buluşma hikayeleri (approved alanı var) |
| `referrals` | Referans sistemi |
| `blacklisted_emails` | Kara liste e-postalar |
| `user_requests` | Kullanıcı istek/şikayet formları |
| `message_templates` | Hazır mesaj şablonları |
| `support_sessions` | Canlı destek oturumları (status: waiting\|active\|closed) |
| `support_messages` | Canlı destek mesajları (sender_type: user\|admin) |

## Klasör Yapısı
```
src/
├── app/
│   ├── admin/          # Admin paneli (page.tsx — tek büyük dosya)
│   ├── api/            # Route handlers
│   │   ├── admin/      # Ban, raporlar, kullanıcı yönetimi
│   │   ├── agent/      # AI ajanları (match, moderate, resolve-reports)
│   │   ├── support/    # Canlı destek (start, send, messages, sessions, close)
│   │   ├── cron/       # Zamanlanmış görevler
│   │   └── ...
│   ├── items/[id]/     # İlan detay, düzenleme, poster, talep
│   ├── auth/           # Giriş, kayıt, şifre sıfırlama
│   └── ...
├── components/         # Paylaşılan UI bileşenleri
├── lib/
│   ├── supabase.ts     # Supabase client
│   ├── auth.ts         # getAuthenticatedUser() — API route'larda kullan
│   ├── email.ts        # Resend e-posta fonksiyonları
│   ├── stripe.ts       # Stripe client
│   └── ratelimit.ts    # Upstash rate limiting
└── types/
    └── chat.ts
```

## Önemli Kurallar

### API Route Pattern
```ts
// Her API route'da auth için:
import { getAuthenticatedUser } from "@/lib/auth";
const user = await getAuthenticatedUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Admin Kontrolü
```ts
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
```

### Supabase Client
- Client-side: `import { supabase } from "@/lib/supabase"`
- Server-side API routes: `createClient` with service role key (env var)

### Realtime
Canlı destek ve mesajlaşmada Supabase realtime `postgres_changes` kullanılıyor. Kanal isimleri: `admin-support-{sessionId}`, `support-session-{sessionId}`

## UI Kuralları
- **Dil:** Türkçe (tüm UI metinleri)
- **Tema:** Koyu arka plan `#080d1a` / `#07101f` / `#0d1a2e`
- **Border:** `border-[#1a2744]`
- **Renk sistemi:** Tailwind dark palette, mavi vurgu (`blue-600`)
- **Toast:** Sonner (`toast.success`, `toast.error`)
- **Responsive:** Mobile-first, `sm:` ve `lg:` breakpoint'ler kullan
- **Mobil layout:** Yatay flex'ler için `flex-col lg:flex-row` pattern

## Env Değişkenleri (önemli olanlar)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_ADMIN_EMAILS          # virgülle ayrılmış admin e-postalar
ANTHROPIC_API_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
```

## Deploy
- **Platform:** Vercel (otomatik deploy — master push = canlı)
- **Repo:** https://github.com/mcan64509-sys/lost-found.git
- **Branch:** master → production

## Geliştirme Notları
- `admin/page.tsx` çok büyük (~1600 satır) — tüm admin sekmeleri tek dosyada
- Optimistic UI pattern kullanılıyor (mesaj gönderme, vb.)
- Canlı destek admin tarafı: `admin/page.tsx` içinde `support` tab
- Canlı destek kullanıcı tarafı: `ChatWidget.tsx` floating widget
- Capacitor ile iOS/Android native build mevcut (`npm run cap:sync`)
