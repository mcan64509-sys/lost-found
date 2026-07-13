import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hesap Silme — Bulan Varmi",
  description: "Bulan Varmi hesabınızı ve verilerinizi nasıl sileceğinizi öğrenin.",
};

export default function HesapSilmePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-400 hover:text-white">
          ← Ana Sayfa
        </Link>
        <h1 className="mb-2 text-3xl font-bold">Hesap Silme</h1>
        <p className="mb-10 text-sm text-slate-500">Son güncelleme: Temmuz 2026</p>

        <div className="space-y-8 text-slate-300 leading-7">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Hesabınızı Nasıl Silersiniz?</h2>
            <p className="mb-3">
              <strong className="text-white">Bulan Varmi</strong> hesabınızın ve ilişkili verilerinizin
              silinmesini talep etmek için aşağıdaki yollardan birini kullanabilirsiniz:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>
                Hesabınıza kayıtlı e-posta adresinizden{" "}
                <a href="mailto:bulanvarmi1@gmail.com?subject=Hesap%20Silme%20Talebi" className="text-blue-400 hover:text-blue-300">
                  bulanvarmi1@gmail.com
                </a>{" "}
                adresine <strong className="text-slate-300">&quot;Hesap Silme Talebi&quot;</strong> konu başlığıyla e-posta gönderin.
              </li>
              <li>
                Ya da uygulama/site içinde oturum açıp{" "}
                <Link href="/destek" className="text-blue-400 hover:text-blue-300">Destek</Link>{" "}
                sayfasından &quot;Şikayet&quot; türünü seçerek hesap silme talebinizi iletin.
              </li>
            </ul>
            <p className="mt-3 text-slate-400">
              Talebi doğrulamak için sizden kayıtlı hesap e-postanızla teyit isteyebiliriz.
              Talepler en geç <strong className="text-slate-300">30 gün</strong> içinde işleme alınır ve
              sonuç kayıtlı e-posta adresinize bildirilir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Silinen Veriler</h2>
            <p className="mb-3">Hesap silme talebiniz onaylandığında aşağıdaki veriler kalıcı olarak silinir:</p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Profil bilgileri (ad, e-posta, telefon numarası, profil fotoğrafı)</li>
              <li>Hesap kimlik doğrulama bilgileri (şifre dahil)</li>
              <li>Favoriler, arama uyarıları, e-posta tercihleri</li>
              <li>Push bildirim abonelikleri</li>
              <li>Verdiğiniz/aldığınız değerlendirmeler (ratings)</li>
              <li>Referans kayıtlarınız</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Anonimleştirilerek Saklanan Veriler</h2>
            <p className="mb-3">
              Aşağıdaki veriler, başka kullanıcıların hizmetten faydalanmaya devam edebilmesi için
              hesabınızla ilişkisi kaldırılarak (anonimleştirilerek) saklanabilir:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>
                Oluşturduğunuz kayıp/bulundu ilanları — eşyanın sahibine ulaşmasına yardımcı olmaya devam
                edebilmesi için ilan içeriği kalabilir, ancak sizi tanımlayan bilgiler (ad, e-posta) kaldırılır.
                İlanın da tamamen silinmesini istiyorsanız talebinizde ayrıca belirtin.
              </li>
              <li>
                Başka kullanıcılarla yaptığınız yazışmalar — karşı tarafın konuşma geçmişini kaybetmemesi
                için mesaj içeriği kalabilir, gönderen bilginiz anonimleştirilir.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Yasal Nedenlerle Saklanan Veriler</h2>
            <p>
              Dolandırıcılık/kötüye kullanım önleme veya yasal yükümlülüklerimiz gerektirdiği ölçüde
              bazı kayıtlar (ör. ban geçmişi, şikayet kayıtları) sınırlı bir süre için saklanabilir.
              Bu veriler yalnızca yasal zorunluluk süresince tutulur ve başka bir amaçla kullanılmaz.
            </p>
          </section>

        </div>

        <div className="mt-12 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/gizlilik" className="hover:text-white transition">Gizlilik Politikası</Link>
          <Link href="/kullanim-sartlari" className="hover:text-white transition">Kullanım Şartları</Link>
          <Link href="/" className="hover:text-white transition">Ana Sayfa</Link>
        </div>
      </div>
    </main>
  );
}
