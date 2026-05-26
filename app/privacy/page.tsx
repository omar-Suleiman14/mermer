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
                <p>
                  في <strong>مرمر</strong>، نأخذ خصوصيتك على محمل الجد. تشرح سياسة الخصوصية هذه كيفية جمع بياناتك الشخصية واستخدامها وحمايتها، وفقاً لقانون حماية البيانات الشخصية المصري رقم <strong>151 لسنة 2020</strong> وإصلاحاته، وأي لوائح أخرى معمول بها.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">1. مسؤول البيانات</h2>
                <p>
                  مرمر (mermereg.com) هي الجهة المسؤولة عن معالجة بياناتك الشخصية. للتواصل بشأن الخصوصية: <strong>privacy@mermereg.com</strong>.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">2. البيانات التي نجمعها</h2>
                <p>نجمع البيانات التالية:</p>
                <ul>
                  <li><strong>بيانات المرضى:</strong> الاسم، رقم الهاتف (واتساب)، العمر، المواعيد، السجلات الطبية المُدخلة من قِبَل الطبيب.</li>
                  <li><strong>بيانات الأطباء:</strong> الاسم، رقم الهاتف، بيانات العيادة، أوقات العمل، الشهادات، الصورة الشخصية.</li>
                  <li><strong>بيانات الاستخدام:</strong> معلومات الجلسة، عنوان IP، ملفات تعريف الارتباط اللازمة للتشغيل.</li>
                </ul>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">3. الأساس القانوني للمعالجة</h2>
                <p>نستند في معالجة بياناتك إلى:</p>
                <ul>
                  <li><strong>موافقتك الصريحة</strong> عند الحجز أو تسجيل الحساب (المادة 4 من القانون 151/2020).</li>
                  <li><strong>المصلحة المشروعة</strong> في تشغيل المنصة وتحسين الخدمات.</li>
                  <li><strong>الالتزام القانوني</strong> عند الاقتضاء.</li>
                </ul>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">4. كيف نستخدم بياناتك</h2>
                <p>نستخدم البيانات لـ: تنسيق المواعيد، إرسال التذكيرات، تقديم وظائف إدارة العيادات، تحسين المنصة، والامتثال للالتزامات القانونية.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">5. مشاركة البيانات</h2>
                <p>
                  لا نبيع بياناتك الشخصية لأي طرف ثالث. يتم مشاركة المعلومات بين المريض والطبيب المعالج فقط لأغراض الرعاية الطبية. قد يتعامل مزودو الخدمات (مثل Convex لتخزين البيانات، وClerk للمصادقة) مع البيانات باعتبارهم معالجين من الباطن ملتزمين بنفس مستوى الحماية.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">6. النقل العابر للحدود</h2>
                <p>
                  قد تُخزَّن بعض البيانات على خوادم خارج مصر (مزودو البنية التحتية السحابية). نحرص على أن يتم ذلك وفق ضمانات كافية، وبما يتوافق مع المادة 12 من القانون 151/2020 المتعلقة بنقل البيانات عبر الحدود.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">7. مدة الاحتفاظ بالبيانات</h2>
                <p>
                  نحتفظ ببياناتك طوال مدة نشاط حسابك، ولمدة لا تزيد على <strong>5 سنوات</strong> بعد إغلاق الحساب أو آخر تفاعل، ما لم يقتضِ القانون خلاف ذلك. يمكنك طلب الحذف في أي وقت.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">8. سجلات المرضى والبيانات الصحية</h2>
                <p>
                  تُعدّ السجلات الطبية وملاحظات الاستشارة من الفئات الخاصة للبيانات وفق القانون 151/2020، وتخضع لحماية مشددة. لا يمكن الوصول إليها إلا من قِبَل الطبيب المعالج المصرّح له.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">9. ملفات تعريف الارتباط</h2>
                <p>نستخدم ملفات تعريف الارتباط الضرورية لإدارة الجلسات والمصادقة فقط. لا نستخدم ملفات التتبع الإعلاني.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">10. حقوقك</h2>
                <p>وفقاً للقانون 151/2020، يحق لك:</p>
                <ul>
                  <li>الاطلاع على بياناتك الشخصية وتصحيحها.</li>
                  <li>طلب حذف بياناتك ("الحق في النسيان").</li>
                  <li>الاعتراض على معالجة بياناتك أو تقييدها.</li>
                  <li>طلب نقل بياناتك (قابلية التنقل).</li>
                  <li>سحب موافقتك في أي وقت دون التأثير على مشروعية المعالجة السابقة.</li>
                </ul>
                <p>لممارسة هذه الحقوق، راسلنا على: <strong>privacy@mermereg.com</strong></p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">11. تقديم شكوى</h2>
                <p>
                  يحق لك تقديم شكوى إلى <strong>جهاز حماية البيانات الشخصية</strong> التابع لوزارة الاتصالات المصرية إذا رأيت أن حقوقك قد انتُهكت.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">12. اتصل بنا</h2>
                <p>لأي أسئلة تتعلق بالخصوصية: <strong>privacy@mermereg.com</strong></p>
              </>
            ) : (
              <>
                <p>
                  At <strong>mermer</strong>, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal and medical information, in compliance with <strong>Egypt's Personal Data Protection Law No. 151 of 2020</strong> and its executive regulations, as well as any other applicable legislation.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">1. Data Controller</h2>
                <p>
                  mermer (mermereg.com) is the data controller responsible for processing your personal data. For privacy matters, contact us at: <strong>privacy@mermereg.com</strong>.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">2. Data We Collect</h2>
                <p>We collect the following categories of data:</p>
                <ul>
                  <li><strong>Patient Data:</strong> Name, phone number (WhatsApp), age, appointments, and medical records entered by the treating physician.</li>
                  <li><strong>Doctor Data:</strong> Name, phone number, clinic details, working hours, credentials, and profile photo.</li>
                  <li><strong>Usage Data:</strong> Session information, IP address, and essential cookies required for platform operation.</li>
                </ul>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">3. Legal Basis for Processing</h2>
                <p>We process your data on the following legal bases:</p>
                <ul>
                  <li><strong>Consent</strong> — when you book an appointment or register an account (Article 4, Law 151/2020).</li>
                  <li><strong>Legitimate interests</strong> — to operate and improve the platform.</li>
                  <li><strong>Legal obligation</strong> — where required by applicable law.</li>
                </ul>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">4. How We Use Your Data</h2>
                <p>We use your data to: facilitate appointment scheduling, send reminders and notifications, provide clinic management features, improve the platform, and comply with legal obligations.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">5. Data Sharing</h2>
                <p>
                  We do not sell your personal data to any third party. Data is shared between a patient and their treating physician solely for medical care purposes. Sub-processors (such as Convex for data storage and Clerk for authentication) handle data as sub-processors bound by equivalent protection standards.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">6. Cross-Border Data Transfers</h2>
                <p>
                  Some data may be stored on servers outside Egypt (cloud infrastructure providers). We ensure such transfers occur with adequate safeguards in compliance with Article 12 of Law 151/2020 governing cross-border data transfers.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">7. Data Retention</h2>
                <p>
                  We retain your data for the duration of your active account and for a period not exceeding <strong>5 years</strong> after account closure or last interaction, unless otherwise required by law. You may request deletion at any time.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">8. Patient Records & Special Category Data</h2>
                <p>
                  Medical records and consultation notes constitute special category data under Law 151/2020 and are subject to enhanced protection. They are accessible only by the authorised treating physician.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">9. Cookies</h2>
                <p>We use only essential cookies for session management and authentication. We do not use advertising trackers.</p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">10. Your Rights</h2>
                <p>Under Law 151/2020, you have the right to:</p>
                <ul>
                  <li>Access and rectify your personal data.</li>
                  <li>Request erasure of your data ("right to be forgotten").</li>
                  <li>Object to or restrict processing of your data.</li>
                  <li>Request data portability.</li>
                  <li>Withdraw consent at any time without affecting the lawfulness of prior processing.</li>
                </ul>
                <p>To exercise these rights, email us at: <strong>privacy@mermereg.com</strong></p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">11. Right to Lodge a Complaint</h2>
                <p>
                  You have the right to lodge a complaint with the <strong>Egyptian Data Protection Authority (EDPA)</strong>, operating under the Ministry of Communications and Information Technology, if you believe your rights have been violated.
                </p>

                <h2 className="text-[#1a1916] dark:text-[#f0efea] font-semibold mt-8 mb-2">12. Contact Us</h2>
                <p>For any privacy-related questions: <strong>privacy@mermereg.com</strong></p>
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
