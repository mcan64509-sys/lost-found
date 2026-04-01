import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Lost & Found platformunun kullanım şartları ve koşulları.",
};

export default function KullanimSartlariPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-400 hover:text-white">
          ← Ana Sayfa
        </Link>
        <h1 className="mb-2 text-3xl font-bold">Kullanım Şartları</h1>
        <p className="mb-10 text-sm text-slate-500">Son güncelleme: Mart 2026</p>

        <div className="space-y-8 text-slate-300 leading-7">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Kabul</h2>
            <p>
              Lost & Found platformunu kullanarak bu şartları kabul etmiş sayılırsınız. Şartları
              kabul etmiyorsanız platformu kullanmayınız.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Platform Amacı</h2>
            <p>
              Lost & Found, kayıp eşyaların sahiplerine kavuşturulmasını kolaylaştırmak amacıyla
              tasarlanmış bir platformdur. Platform yalnızca bu amaçla kullanılabilir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Kullanıcı Sorumlulukları</h2>
            <ul className="list-disc space-y-1 pl-5 text-slate-400">
              <li>Gerçeğe aykırı, yanıltıcı veya sahte ilan oluşturmak yasaktır.</li>
              <li>Başkalarına ait eşyayı kendinizmiş gibi talep etmek yasaktır.</li>
              <li>Platform üzerinden spam, reklam veya zararlı içerik paylaşmak yasaktır.</li>
              <li>Diğer kullanıcılara yönelik taciz veya tehdit içerikli mesaj göndermek yasaktır.</li>
              <li>Hesabınızı başkasına devredemez veya kiralayamazsınız.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. İçerik</h2>
            <p>
              Platforma yüklediğiniz içerikler (fotoğraf, metin, konum) için tüm sorumluluk size
              aittir. Platform, kullanıcı tarafından oluşturulan içeriklerden sorumlu değildir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Hesap Askıya Alma</h2>
            <p>
              Platform yönetimi, şartları ihlal eden hesapları önceden bildirim yapmaksızın
              askıya alma veya silme hakkını saklı tutar.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Sorumluluk Sınırı</h2>
            <p>
              Platform, kullanıcılar arasındaki iletişim ve anlaşmazlıklardan, eşya teslim süreçlerinden
              veya üçüncü taraf hizmetlerinden kaynaklanan zararlardan sorumlu değildir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Değişiklikler</h2>
            <p>
              Platform yönetimi bu şartları değiştirme hakkını saklı tutar. Güncel şartlar her zaman
              bu sayfada yayımlanır.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
