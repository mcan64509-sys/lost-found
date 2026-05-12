import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — Bulan Varmi",
  description: "Bulan Varmi platformunun kişisel veri işleme ve gizlilik politikası.",
};

export default function GizlilikPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-400 hover:text-white">
          ← Ana Sayfa
        </Link>
        <h1 className="mb-2 text-3xl font-bold">Gizlilik Politikası</h1>
        <p className="mb-10 text-sm text-slate-500">Son güncelleme: Mayıs 2026</p>

        <div className="space-y-8 text-slate-300 leading-7">

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Veri Sorumlusu</h2>
            <p>
              Bu gizlilik politikası, <strong className="text-white">Bulan Varmi</strong> platformu
              (<strong className="text-white">bulanvarmi.vercel.app</strong>) tarafından hazırlanmıştır.
              Kişisel verilerinizin işlenmesine ilişkin sorularınız için{" "}
              <a href="mailto:bulanvarmi1@gmail.com" className="text-blue-400 hover:text-blue-300">
                bulanvarmi1@gmail.com
              </a>{" "}
              adresinden iletişime geçebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Topladığımız Veriler</h2>
            <p className="mb-3">Platformu kullandığınızda aşağıdaki kişisel veriler işlenebilir:</p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li><strong className="text-slate-300">Hesap verileri:</strong> E-posta adresi, şifre (şifreli olarak saklanır), kayıt tarihi.</li>
              <li><strong className="text-slate-300">İlan içerikleri:</strong> Başlık, açıklama, kategori, konum (koordinat ve adres), yüklenen fotoğraflar, evcil hayvan bilgileri (tür, renk, mikro çip numarası).</li>
              <li><strong className="text-slate-300">İletişim verileri:</strong> Diğer kullanıcılara gönderdiğiniz mesajlar ve talep geçmişiniz.</li>
              <li><strong className="text-slate-300">Ödeme verileri:</strong> Ödeme işlemleri Stripe altyapısı üzerinden gerçekleştirilir. Kart numarası gibi hassas finansal bilgiler platformumuzda <strong className="text-slate-300">saklanmaz</strong>. Yalnızca Stripe tarafından sağlanan işlem kimliği ve abonelik durumu kaydedilir.</li>
              <li><strong className="text-slate-300">Bildirim aboneliği:</strong> Tarayıcı push bildirimleri için cihaz abonelik anahtarı (isteğe bağlı, izninizle).</li>
              <li><strong className="text-slate-300">Teknik veriler:</strong> IP adresi, tarayıcı türü, platform kullanım istatistikleri.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Verilerin İşlenme Amaçları</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Kayıp eşya ve evcil hayvanları sahiplerine kavuşturmak (platformun temel hizmeti)</li>
              <li>Hesabınızı oluşturmak, doğrulamak ve yönetmek</li>
              <li>Ödeme işlemlerini gerçekleştirmek ve abonelik durumunu takip etmek</li>
              <li>İlan eşleşmelerini size bildirmek (e-posta ve/veya push bildirim)</li>
              <li>Platform güvenliğini sağlamak ve kötüye kullanımı önlemek</li>
              <li>Yasal yükümlülükleri yerine getirmek</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Üçüncü Taraf Hizmet Sağlayıcılar</h2>
            <p className="mb-3">
              Platform, aşağıdaki güvenilir üçüncü taraf hizmetlerinden yararlanmaktadır. Bu hizmet sağlayıcılar yalnızca hizmetin gerektirdiği ölçüde veriye erişir:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>
                <strong className="text-slate-300">Supabase</strong> — Veritabanı ve kimlik doğrulama altyapısı. Veriler AB/ABD veri merkezlerinde şifreli olarak saklanır.
                (<a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Gizlilik politikası</a>)
              </li>
              <li>
                <strong className="text-slate-300">Stripe</strong> — Ödeme işlemleri ve abonelik yönetimi. PCI DSS Level 1 sertifikalıdır.
                (<a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Gizlilik politikası</a>)
              </li>
              <li>
                <strong className="text-slate-300">Resend</strong> — İşlemsel e-posta gönderimi (şifre sıfırlama, bildirimler).
                (<a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Gizlilik politikası</a>)
              </li>
              <li>
                <strong className="text-slate-300">Vercel</strong> — Platform barındırma ve CDN altyapısı.
                (<a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Gizlilik politikası</a>)
              </li>
            </ul>
            <p className="mt-3 text-slate-400">
              Kişisel verileriniz asla üçüncü taraflara satılmaz veya kiralanmaz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Çerezler ve Yerel Depolama</h2>
            <p className="mb-3">Platform yalnızca aşağıdaki amaçlarla çerez ve yerel depolama kullanır:</p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li><strong className="text-slate-300">Oturum çerezleri:</strong> Giriş durumunuzu korumak için zorunludur. Tarayıcı kapatıldığında silinir.</li>
              <li><strong className="text-slate-300">Kimlik doğrulama token'ları:</strong> Supabase tarafından yönetilen güvenli oturum bilgileri.</li>
              <li><strong className="text-slate-300">Tercih verileri:</strong> Dil ve görünüm tercihleriniz (varsa) yerel depoda saklanır.</li>
            </ul>
            <p className="mt-3 text-slate-400">
              Analitik veya pazarlama çerezi kullanılmamaktadır.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Veri Saklama Süreleri</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Hesap verileri, hesabınızı silene kadar saklanır.</li>
              <li>İlanlar, siz silene veya 1 yıl boyunca hareketsiz kalana kadar saklanır.</li>
              <li>Ödeme kayıtları, finansal ve yasal yükümlülükler nedeniyle 7 yıl boyunca saklanır.</li>
              <li>Push bildirim abonelikleri, siz iptal edene veya cihaz geçersiz hale gelene kadar saklanır.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. KVKK ve GDPR Kapsamındaki Haklarınız</h2>
            <p className="mb-3">
              6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve AB Genel Veri Koruma Yönetmeliği (GDPR) kapsamında aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme hakkı</li>
              <li>İşlenen verilerinize erişme ve kopyasını talep etme hakkı</li>
              <li>Yanlış veya eksik verilerin düzeltilmesini talep etme hakkı</li>
              <li>Belirli koşullarda verilerinizin silinmesini talep etme hakkı ("unutulma hakkı")</li>
              <li>Veri işlemeye itiraz etme hakkı</li>
              <li>Veri taşınabilirliği hakkı (verilerinizi makine okunabilir formatta alma)</li>
              <li>Rızanızı geri çekme hakkı (rızaya dayalı işlemler için)</li>
            </ul>
            <p className="mt-3 text-slate-400">
              Bu haklarınızı kullanmak için{" "}
              <a href="mailto:bulanvarmi1@gmail.com" className="text-blue-400 hover:text-blue-300">
                bulanvarmi1@gmail.com
              </a>{" "}
              adresine e-posta gönderebilir veya hesap ayarlarınızdan işlem yapabilirsiniz. Talepleriniz 30 gün içinde yanıtlanır.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Veri Güvenliği</h2>
            <ul className="list-disc space-y-2 pl-5 text-slate-400">
              <li>Tüm veriler HTTPS/TLS şifreli bağlantı üzerinden iletilir.</li>
              <li>Şifreler bcrypt algoritmasıyla hashlenerek saklanır; düz metin şifre hiçbir zaman saklanmaz.</li>
              <li>Veritabanı erişimi Row Level Security (RLS) politikalarıyla korunmaktadır.</li>
              <li>Ödeme bilgileri PCI DSS uyumlu Stripe altyapısında işlenir.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Çocukların Gizliliği</h2>
            <p>
              Platform, 13 yaşın altındaki çocuklara yönelik değildir ve bu yaş grubundan bilerek
              kişisel veri toplamaz. 13–18 yaş arası kullanıcıların ebeveyn onayı alması gerekir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Politika Değişiklikleri</h2>
            <p>
              Bu politika önceden bildirim yapılmaksızın güncellenebilir. Önemli değişiklikler
              kayıtlı e-posta adresinize bildirilir. Güncel politikayı bu sayfadan takip edebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. İletişim</h2>
            <p>
              Gizlilik politikasıyla ilgili sorularınız için:{" "}
              <a href="mailto:bulanvarmi1@gmail.com" className="text-blue-400 hover:text-blue-300">
                bulanvarmi1@gmail.com
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/kullanim-sartlari" className="hover:text-white transition">Kullanım Şartları</Link>
          <Link href="/iade-politikasi" className="hover:text-white transition">İade Politikası</Link>
          <Link href="/" className="hover:text-white transition">Ana Sayfa</Link>
        </div>
      </div>
    </main>
  );
}
