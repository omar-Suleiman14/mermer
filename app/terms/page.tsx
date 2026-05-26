import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";

export default async function TermsPage() {
  const { lang, dir } = await getServerI18n();

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea] flex flex-col" dir={dir}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f0efea]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-[#007AFF] transition-colors">
            {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {lang === "ar" ? "العودة للرئيسية" : "Back to home"}
          </Link>
          <span className="font-bold text-lg tracking-tight text-[#007AFF]">mermer</span>
        </div>
      </nav>

      <main className="flex-1 py-24 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {lang === "ar" ? "الشروط والأحكام" : "Terms and Conditions"}
            </h1>
            <p className="text-sm text-[#6b6a63] dark:text-[#8e8d86]">
              {lang === "ar" ? "آخر تحديث:" : "Last updated:"} {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-[#6b6a63] dark:text-[#8e8d86]">
            {lang === "ar" ? (
              <>
                <p>مرحباً بك في مرمر. من خلال الوصول إلى أو استخدام خدماتنا، فإنك توافق على الالتزام بهذه الشروط والأحكام.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">1. الخدمات المقدمة</h2>
                <p>يوفر مرمر منصة لإدارة العيادات ونظام حجز عبر الإنترنت للأطباء والمرضى. نحن نسهل جدولة وإدارة المواعيد الطبية ولكن لا نقدم مشورة أو خدمات طبية بشكل مباشر.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">2. حسابات المستخدمين</h2>
                <p>لاستخدام بعض الميزات، يجب عليك التسجيل للحصول على حساب. أنت مسؤول عن الحفاظ على سرية معلومات حسابك وعن جميع الأنشطة التي تحدث تحت حسابك.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">3. الخصوصية</h2>
                <p>يخضع استخدامك لخدماتنا أيضًا لسياسة الخصوصية الخاصة بنا، والتي تفصل كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية والطبية.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">4. الإلغاء وإعادة الجدولة</h2>
                <p>يجوز للمرضى إلغاء أو إعادة جدولة المواعيد وفقاً لسياسات العيادة الفردية. الأطباء مسؤولون عن وضع هذه السياسات وإبلاغها.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">5. حدود المسؤولية</h2>
                <p>مرمر غير مسؤول عن أي أضرار مباشرة، غير مباشرة، عرضية، أو تبعية ناتجة عن استخدام أو عدم القدرة على استخدام خدماتنا، أو عن أي قرارات طبية تتخذ بناءً على المنصة.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">6. التغييرات على الشروط</h2>
                <p>يجوز لنا تعديل هذه الشروط في أي وقت. استمرار استخدام المنصة بعد التغييرات يعتبر قبولاً للشروط الجديدة.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">7. اتصل بنا</h2>
                <p>إذا كان لديك أي أسئلة حول هذه الشروط، يرجى الاتصال بنا على support@mermereg.com.</p>
              </>
            ) : (
              <>
                <p>Welcome to mermer. By accessing or using our services, you agree to be bound by these Terms and Conditions.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">1. Services Provided</h2>
                <p>mermer provides a clinic management platform and online booking system for doctors and patients. We facilitate the scheduling and management of medical appointments but do not provide medical advice or services directly.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">2. User Accounts</h2>
                <p>To use certain features, you must register for an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">3. Privacy</h2>
                <p>Your use of our services is also governed by our Privacy Policy, which details how we collect, use, and protect your personal and medical information.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">4. Cancellations and Rescheduling</h2>
                <p>Patients may cancel or reschedule appointments subject to the individual clinic&apos;s policies. Doctors are responsible for setting and communicating these policies.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">5. Limitation of Liability</h2>
                <p>mermer is not liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services, or for any medical decisions made based on the platform.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">6. Changes to Terms</h2>
                <p>We may modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the new Terms.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">7. Contact Us</h2>
                <p>If you have any questions about these Terms, please contact us at support@mermereg.com.</p>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-black/6 dark:border-white/6 py-6 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#6b6a63] dark:text-[#8e8d86]">
          <p>© 2026 mermer. {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-[#007AFF] transition-colors">
              {lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
