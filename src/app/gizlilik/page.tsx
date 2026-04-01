import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Lost & Found platformunun gizlilik politikası.",
};

export default function GizlilikPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-block text-sm text-slate-400 hover:text-white">
          ← Ana Sayfa
        </Link>
        <h1 className="mb-2 text-3xl font-bold">Gizlilik Politikası</h1>
        <p className="mb-10 text-sm text-slate-500">Son güncelleme: Mart 2026</p>

        <div className="space-y-8 text-slate-300 leading-7">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Topladığımız Bilgiler</h2>
            <p>Lost & Found platformunu kullandığınızda aşağıdaki bilgileri toplayabiliriz:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-400">
              <li>Kayıt sırasında verdiğiniz e-posta adresi ve ad soyad</li>
              <li>Oluşturduğunuz ilan içerikleri (başlık, açıklama, fotoğraf, konum)</li>
              <li>Mesajlaşma ve talep geçmişiniz</li>
              <li>Platform kullanım verileri (görüntüleme sayısı, arama geçmişi)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Bilgileri Nasıl Kullanırız</h2>
            <ul className="list-disc space-y-1 pl-5 text-slate-400">
              <li>Kayıp eşya ve sahibini eşleştirmek için</li>
              <li>Hesabınızı yönetmek ve güvende tutmak için</li>
              <li>Size ilan bildirimleri ve eşleşme uyarıları göndermek için</li>
              <li>Platform güvenliğini sağlamak için</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Bilgi Paylaşımı</h2>
            <p>
              Kişisel bilgilerinizi üçüncü taraflarla satmıyor veya kiralamıyoruz. Bilgileriniz yalnızca
              yasal zorunluluk durumlarında veya platformun teknik altyapısını sağlayan güvenilir
              hizmet sağlayıcılarıyla (Supabase, Resend) paylaşılabilir.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Veri Güvenliği</h2>
            <p>
              Verileriniz Supabase altyapısında şifreli olarak saklanmaktadır. Hesabınıza yetkisiz
              erişimi önlemek için güçlü bir şifre kullanmanızı öneriyoruz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Çerezler</h2>
            <p>
              Platform, oturum yönetimi için zorunlu çerezler kullanmaktadır. Bu çerezler platformun
              çalışması için gereklidir ve devre dışı bırakılamaz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Haklarınız</h2>
            <ul className="list-disc space-y-1 pl-5 text-slate-400">
              <li>Verilerinize erişme ve düzeltme hakkı</li>
              <li>Hesabınızı ve verilerinizi silme hakkı</li>
              <li>Pazarlama iletişimlerinden çıkma hakkı</li>
            </ul>
            <p className="mt-3 text-slate-400">
              Bu haklarınızı kullanmak için profil sayfanızı kullanabilir veya bizimle iletişime geçebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Değişiklikler</h2>
            <p>
              Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde kayıtlı e-posta
              adresinize bildirim göndeririz.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
