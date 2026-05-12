import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İade Politikası — Bulan Varmi",
  description: "Bulan Varmi platformunun ödeme iade ve iptal politikası.",
};

export default function IadePolitikasiPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-400 hover:text-white">
          ← Ana Sayfa
        </Link>
        <h1 className="mb-2 text-3xl font-bold">İade Politikası</h1>
        <p className="mb-10 text-sm text-slate-500">Son güncelleme: Mayıs 2026</p>

        <div className="space-y-8 text-slate-300 leading-7">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Genel Kural</h2>
            <p>
              Bulan Varmi platformunda sunulan ücretli hizmetler (öncelikli ilan ve aylık abonelik),
              dijital hizmet niteliğinde olup hizmet aktive edildiği anda kullanıma açılmaktadır.
              Bu nedenle Mesafeli Sözleşmeler Yönetmeliği'nin 15/ğ maddesi uyarınca,{" "}
              <strong className="text-white">hizmet aktive edildikten sonra cayma hakkı kullanılamaz
              ve iade yapılmaz.</strong>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Tek Seferlik Satın Alımlar</h2>
            <p className="mb-3">
              Bronz, Gümüş ve Altın Öncelik paketleri tek seferlik ödeme ile satın alınan dijital
              hizmetlerdir.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Satın alma tamamlandıktan ve ilanınıza öncelik uygulandıktan sonra iade yapılmaz.</li>
              <li>Hizmet, belirtilen süre (30 gün) boyunca aktif kalır; süre sonunda otomatik sona erer.</li>
              <li>Süre dolmadan iptal veya ara iade mümkün değildir.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Aylık Abonelik</h2>
            <p className="mb-3">
              Aylık abonelik, her ay otomatik olarak yenilenen bir hizmettir.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Aboneliği <strong className="text-white">istediğiniz zaman iptal</strong> edebilirsiniz.</li>
              <li>İptal işlemi mevcut ödeme döneminin sonunda geçerli olur; kalan süre boyunca hizmetten yararlanmaya devam edersiniz.</li>
              <li>İptal ettiğiniz dönem için ücret iadesi yapılmaz.</li>
              <li>Abonelik iptalini hesap ayarlarınızdan veya{" "}
                <a href="mailto:bulanvarmi1@gmail.com" className="text-blue-400 hover:text-blue-300">
                  bulanvarmi1@gmail.com
                </a>{" "}
                adresine e-posta göndererek yapabilirsiniz.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. İade Yapılabilecek Durumlar</h2>
            <p className="mb-3">
              Aşağıdaki istisnai durumlarda iade veya yeniden hizmet sağlanabilir:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>
                <strong className="text-slate-300">Teknik arıza:</strong> Ödeme başarılı olmasına rağmen
                öncelik ilanınıza uygulanmamışsa, 7 gün içinde bildirmeniz halinde hizmet etkinleştirilir
                veya iade değerlendirilir.
              </li>
              <li>
                <strong className="text-slate-300">Mükerrer ödeme:</strong> Aynı hizmet için birden fazla
                ödeme alınmışsa, fazla ödeme iade edilir.
              </li>
              <li>
                <strong className="text-slate-300">Platform kaynaklı sorun:</strong> Hizmetin platform
                tarafında kesintisiz sunulamaması durumunda orantılı iade yapılabilir.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. İade Süreci</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>İade talebi için{" "}
                <a href="mailto:bulanvarmi1@gmail.com" className="text-blue-400 hover:text-blue-300">
                  bulanvarmi1@gmail.com
                </a>{" "}
                adresine e-posta gönderin; sipariş numaranızı ve talebinizin nedenini belirtin.
              </li>
              <li>Talepler 5 iş günü içinde değerlendirilir ve sonuç e-posta ile bildirilir.</li>
              <li>Onaylanan iadeler, orijinal ödeme yönteminize (kart) 5–10 iş günü içinde yansır.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Ödeme Güvenliği</h2>
            <p>
              Tüm ödemeler <strong className="text-white">Stripe</strong> altyapısı üzerinden işlenir.
              Kart bilgileriniz platformumuzda saklanmaz; Stripe PCI DSS Level 1 sertifikalıdır.
              Ödeme anlaşmazlıklarında Stripe'ın dispute süreci de geçerlidir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. İletişim</h2>
            <p>
              İade ve abonelik işlemleri hakkında sorularınız için:{" "}
              <a href="mailto:bulanvarmi1@gmail.com" className="text-blue-400 hover:text-blue-300">
                bulanvarmi1@gmail.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/kullanim-sartlari" className="hover:text-white transition">Kullanım Şartları</Link>
          <Link href="/gizlilik" className="hover:text-white transition">Gizlilik Politikası</Link>
          <Link href="/" className="hover:text-white transition">Ana Sayfa</Link>
        </div>
      </div>
    </main>
  );
}
