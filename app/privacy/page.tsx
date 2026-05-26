import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";

export default async function PrivacyPage() {
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
              {lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
            </h1>
            <p className="text-sm text-[#6b6a63] dark:text-[#8e8d86]">
              {lang === "ar" ? "آخر تحديث:" : "Last updated:"} {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-[#6b6a63] dark:text-[#8e8d86]">
            {lang === "ar" ? (
              <>
                <p>في مرمر، نأخذ خصوصيتك على محمل الجد. تشرح سياسة الخصوصية هذه كيف نجمع، نستخدم، ونحمي معلوماتك الشخصية والطبية.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">1. المعلومات التي نجمعها</h2>
                <p>نجمع المعلومات التي تقدمها مباشرة، مثل اسمك، تفاصيل الاتصال، وتاريخ مواعيدك. بالنسبة للأطباء، نجمع المؤهلات المهنية، تفاصيل العيادة، وساعات العمل.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">2. كيف نستخدم معلوماتك</h2>
                <p>نستخدم معلوماتك لتسهيل حجز المواعيد، إرسال الإشعارات والتذكيرات، وتقديم الوظائف الأساسية لمنصة إدارة العيادات.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">3. مشاركة البيانات والأمان</h2>
                <p>نحن لا نبيع بياناتك الشخصية. يتم مشاركة المعلومات بين المرضى وأطبائهم فقط لغرض الرعاية الطبية. نحن نستخدم تدابير أمنية قياسية في الصناعة لحماية بياناتك من الوصول غير المصرح به.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">4. سجلات المرضى</h2>
                <p>السجلات الطبية وملاحظات الاستشارة سرية للغاية ولا يمكن الوصول إليها إلا من قبل الطبيب المعالج والمريض.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">5. ملفات تعريف الارتباط والتتبع</h2>
                <p>قد تستخدم منصتنا ملفات تعريف الارتباط لتعزيز تجربة المستخدم، إدارة الجلسات، وتحليل استخدام المنصة.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">6. حقوقك</h2>
                <p>لديك الحق في الوصول إلى معلوماتك الشخصية، تحديثها، أو حذفها. إذا كنت ترغب في ممارسة هذه الحقوق، يرجى الاتصال بفريق الدعم لدينا.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">7. اتصل بنا</h2>
                <p>لأي أسئلة أو استفسارات تتعلق بخصوصيتك، يرجى الاتصال بنا على privacy@mermereg.com.</p>
              </>
            ) : (
              <>
                <p>At mermer, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal and medical information.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">1. Information We Collect</h2>
                <p>We collect information you provide directly, such as your name, contact details, and appointment history. For doctors, we collect professional credentials, clinic details, and working hours.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">2. How We Use Your Information</h2>
                <p>We use your information to facilitate appointment scheduling, send notifications and reminders, and provide the core functionalities of the clinic management platform.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">3. Data Sharing and Security</h2>
                <p>We do not sell your personal data. Information is shared between patients and their respective doctors solely for the purpose of medical care. We employ industry-standard security measures to protect your data from unauthorized access.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">4. Patient Records</h2>
                <p>Medical records and consultation notes are strictly confidential and are only accessible by the treating physician and the patient.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">5. Cookies and Tracking</h2>
                <p>Our platform may use cookies to enhance user experience, manage sessions, and analyze platform usage.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">6. Your Rights</h2>
                <p>You have the right to access, update, or delete your personal information. If you wish to exercise these rights, please contact our support team.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">7. Contact Us</h2>
                <p>For any questions or concerns regarding your privacy, please contact us at privacy@mermereg.com.</p>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-black/6 dark:border-white/6 py-6 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#6b6a63] dark:text-[#8e8d86]">
          <p>© 2026 mermer. {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-[#007AFF] transition-colors">
              {lang === "ar" ? "الشروط والأحكام" : "Terms and Conditions"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
