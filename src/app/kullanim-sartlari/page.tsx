import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Şartları — Bulan Varmi",
  description: "Bulan Varmi platformunun kullanım şartları ve koşulları.",
};

export default function KullanimSartlariPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-400 hover:text-white">
          ← Ana Sayfa
        </Link>
        <h1 className="mb-2 text-3xl font-bold">Kullanım Şartları</h1>
        <p className="mb-10 text-sm text-slate-500">Son güncelleme: Mayıs 2026</p>

        <div className="space-y-8 text-slate-300 leading-7">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Taraflar ve Kabul</h2>
            <p>
              Bu kullanım şartları, <strong className="text-white">Bulan Varmi</strong> platformu
              (<strong className="text-white">bulanvarmi.vercel.app</strong>) ile platformu kullanan
              gerçek kişiler arasındaki ilişkiyi düzenler. Platformu kullanmaya devam ederek bu
              şartları okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Platform Amacı</h2>
            <p>
              Bulan Varmi, kayıp eşyaların ve evcil hayvanların sahiplerine kavuşturulmasını
              kolaylaştırmak amacıyla tasarlanmış bir ilan ve eşleştirme platformudur. Platform
              yalnızca bu amaçla kullanılabilir; ticari satış, reklam veya başka amaçlarla
              kullanılması yasaktır.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Kullanıcı Hesabı</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Hesap oluşturmak için geçerli bir e-posta adresi zorunludur.</li>
              <li>Hesap bilgilerinizin gizliliğinden ve güvenliğinden siz sorumlusunuzdur.</li>
              <li>Hesabınızı başkasına devredemez, kiralayamaz veya satamazsınız.</li>
              <li>18 yaşından küçük kullanıcıların platformu kullanması için ebeveyn izni gereklidir.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. İlan Kuralları</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Gerçeğe aykırı, yanıltıcı veya sahte ilan oluşturmak kesinlikle yasaktır.</li>
              <li>Başkalarına ait eşyayı kendinizmiş gibi talep etmek yasaktır ve hukuki sonuçlar doğurabilir.</li>
              <li>İlan içeriğinin tüm yasal sorumluluğu ilan sahibine aittir.</li>
              <li>Telif hakkı ihlali içeren veya başkasının gizliliğini zedeleyen görseller yüklenemez.</li>
              <li>Platform yönetimi kurallara aykırı ilanları önceden bildirim yapmaksızın kaldırabilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Ücretli Hizmetler ve Ödeme</h2>
            <p className="mb-3">
              Platform bazı özellikleri (öncelikli ilan, öne çıkarma, abonelik) ücretli olarak sunmaktadır.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Tüm ödemeler <strong className="text-white">Stripe</strong> altyapısı üzerinden güvenli şekilde işlenir. Kart bilgileriniz platformumuzda saklanmaz.</li>
              <li>Fiyatlar Euro (€) cinsinden belirtilmiş olup KDV dahil değildir.</li>
              <li>Tek seferlik satın alımlar (Bronz, Gümüş, Altın öncelik) belirtilen süre için geçerlidir ve süre sonunda otomatik olarak sona erer.</li>
              <li>Aylık abonelikler her ay otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz; iptal işlemi mevcut dönem sonunda geçerli olur.</li>
              <li>Dijital hizmet niteliğinde olduğundan, hizmet aktive edildikten sonra iade yapılmaz. Ayrıntılar için <Link href="/iade-politikasi" className="text-blue-400 hover:text-blue-300">İade Politikası</Link> sayfamızı inceleyin.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Yasaklı İçerik ve Davranışlar</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Spam, reklam veya zararlı bağlantı paylaşmak yasaktır.</li>
              <li>Diğer kullanıcılara yönelik taciz, tehdit veya hakaret içerikli mesaj göndermek yasaktır.</li>
              <li>Platformun teknik altyapısına zarar vermeye yönelik girişimler yasaktır.</li>
              <li>Otomatik araçlarla toplu ilan veya hesap oluşturmak yasaktır.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Hesap Askıya Alma ve Sonlandırma</h2>
            <p>
              Platform yönetimi, bu şartları ihlal eden hesapları önceden bildirim yapmaksızın
              askıya alma veya kalıcı olarak silme hakkını saklı tutar. Askıya alınan hesaplar
              için ödenmiş ücretler iade edilmez.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Sorumluluk Sınırı</h2>
            <p>
              Platform; kullanıcılar arasındaki iletişim, anlaşmazlıklar, eşya teslim süreçleri
              veya üçüncü taraf hizmetlerinden kaynaklanan doğrudan ya da dolaylı zararlardan
              sorumlu değildir. Platform bir aracı konumundadır ve eşyanın bulunacağını garanti etmez.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Fikri Mülkiyet</h2>
            <p>
              Platformun tasarımı, kodu ve içerikleri Bulan Varmi'ye aittir. Kullanıcılar
              platforma yükledikleri içeriklerin lisansını platform ile paylaşmış sayılır;
              bu içerikler platformun işleyişi için kullanılabilir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Değişiklikler</h2>
            <p>
              Bu şartlar önceden bildirim yapılmaksızın güncellenebilir. Değişiklikler bu sayfada
              yayımlandığı tarihten itibaren geçerli olur. Platformu kullanmaya devam etmek
              güncel şartları kabul ettiğiniz anlamına gelir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. İletişim</h2>
            <p>
              Kullanım şartlarıyla ilgili sorularınız için:
              <a href="mailto:bulanvarmi1@gmail.com" className="ml-1 text-blue-400 hover:text-blue-300">
                bulanvarmi1@gmail.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/gizlilik" className="hover:text-white transition">Gizlilik Politikası</Link>
          <Link href="/iade-politikasi" className="hover:text-white transition">İade Politikası</Link>
          <Link href="/" className="hover:text-white transition">Ana Sayfa</Link>
        </div>
      </div>
    </main>
  );
}
