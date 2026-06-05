import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, CheckCircle2, MessageCircle, CalendarCheck, ShieldCheck } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
import dynamic from "next/dynamic";
import { AnimatedReveal } from "@/components/public/animated-reveal";

const PublicNav = dynamic(() => import("@/components/public/public-nav").then((m) => m.PublicNav));

export default async function PatientLandingPage() {
  const { dir } = await getServerI18n();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white dark:bg-black text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1 w-full max-w-[1400px] mx-auto overflow-hidden">
        
        {/* 1. Hero Section (Asymmetric Split) */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 lg:pt-16 pb-16 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Col: Copy & CTAs */}
            <div className="max-w-2xl">
              <AnimatedReveal>
                <h1 className="text-5xl md:text-6xl lg:text-[5rem] font-medium tracking-tighter leading-[1.05] text-slate-900 dark:text-white">
                  {dir === "rtl" ? (
                    <>الرعاية الصحية، <br /><span className="text-primary">أعيد تصميمها.</span></>
                  ) : (
                    <>Healthcare, <br /><span className="text-primary">redesigned.</span></>
                  )}
                </h1>
              </AnimatedReveal>

              <AnimatedReveal delay={0.1}>
                <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-[45ch] leading-relaxed">
                  {dir === "rtl" ? (
                    "اعثر على الطبيب المناسب، واحجز موعدك، وتلقَّ تحديثات دورك مباشرة على واتساب. لا مزيد من غرف الانتظار."
                  ) : (
                    "Find the right doctor, book instantly, and get live queue updates via WhatsApp. No more waiting rooms."
                  )}
                </p>
              </AnimatedReveal>

              <AnimatedReveal delay={0.2}>
                <div className="mt-8 flex flex-wrap gap-4 items-center">
                  <Link
                    href="/doctors"
                    prefetch={true}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-white transition-all hover:bg-primary/90 hover:scale-[0.98] active:scale-95"
                  >
                    <Search className="w-4 h-4" />
                    {dir === "rtl" ? "ابحث عن طبيب" : "Find a Doctor"}
                  </Link>
                  <Link
                    href="/fordoctors"
                    prefetch={true}
                    className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-100 dark:bg-zinc-900 px-8 text-base font-medium text-slate-900 dark:text-white transition-all hover:bg-slate-200 dark:hover:bg-zinc-800 hover:scale-[0.98] active:scale-95"
                  >
                    {dir === "rtl" ? "للأطباء" : "For Doctors"}
                    <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
                  </Link>
                </div>
              </AnimatedReveal>
            </div>

            {/* Right Col: UI Mock (Abstract Cozy Aesthetic) */}
            <AnimatedReveal delay={0.3} direction="left" className="relative lg:h-[600px] flex items-center justify-center">
              {/* Soft abstract background blob */}
              <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] w-3/4 h-3/4 m-auto" />
              
              <div className="relative w-full max-w-md bg-white/60 dark:bg-zinc-950/60 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-6 shadow-2xl shadow-primary/5">
                
                {/* Mock Queue Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-100 dark:border-white/5 shadow-sm mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                      د.م
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Dr. Sarah Mansour</div>
                      <div className="text-sm text-slate-500 dark:text-zinc-400">Cardiology Specialist</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-100 dark:border-white/5">
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Queue Status</div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Next in line
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Est. Time</div>
                      <div className="font-semibold text-primary">5 mins</div>
                    </div>
                  </div>
                </div>

                {/* Mock WhatsApp Notification */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-100 dark:border-white/5 shadow-sm flex items-start gap-4 transform translate-x-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-1">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-white mb-1">WhatsApp Update</div>
                    <div className="text-sm text-slate-500 dark:text-zinc-400 leading-snug">
                      Your turn is approaching! Please head to examination room #2.
                    </div>
                  </div>
                </div>

              </div>
            </AnimatedReveal>
          </div>
        </section>

        {/* 2. Secure, Fast, Reliable */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 border-y border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/20">
          <div className="flex flex-wrap justify-center gap-12 md:gap-24">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  {dir === "rtl" ? "آمن وموثوق" : "Secure & Reliable"}
                </div>
                <div className="text-sm text-slate-500 dark:text-zinc-400">
                  {dir === "rtl" ? "تشفير تام للبيانات" : "End-to-end encryption"}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  {dir === "rtl" ? "موثق وسريع" : "Verified & Fast"}
                </div>
                <div className="text-sm text-slate-500 dark:text-zinc-400">
                  {dir === "rtl" ? "حجوزات فورية مؤكدة" : "Instant confirmed bookings"}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                  {dir === "rtl" ? "متابعة لحظية" : "Live Updates"}
                </div>
                <div className="text-sm text-slate-500 dark:text-zinc-400">
                  {dir === "rtl" ? "عبر منصة واتساب" : "Via WhatsApp platform"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Bento Grid Features */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="mb-16 max-w-2xl">
            <AnimatedReveal>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white">
                {dir === "rtl" ? "تجربة مبنية حولك." : "Built around your experience."}
              </h2>
            </AnimatedReveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Cell 1: WhatsApp (Spans 2 cols on md) */}
            <AnimatedReveal delay={0.1} className="md:col-span-2 relative rounded-3xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 overflow-hidden group p-8 md:p-10 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <MessageCircle className="w-48 h-48 text-green-500" />
              </div>
              <div className="relative z-10 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                  <MessageCircle className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "تحديثات ذكية عبر واتساب" : "Smart WhatsApp Updates"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400">
                  {dir === "rtl" 
                    ? "تلقَّ إشعارات فورية عند تأكيد الحجز، وتحديثات حية لدورك في العيادة." 
                    : "Receive instant booking confirmations and live queue status directly to your phone."}
                </p>
              </div>
            </AnimatedReveal>

            {/* Cell 2: Search */}
            <AnimatedReveal delay={0.2} className="relative rounded-3xl bg-primary/5 dark:bg-primary/10 border border-primary/10 overflow-hidden group p-8 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "بحث دقيق" : "Precise Search"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400">
                  {dir === "rtl" 
                    ? "ابحث عن الأطباء حسب التخصص والموقع والتقييمات بسهولة." 
                    : "Find doctors by specialty, location, and authentic patient reviews."}
                </p>
              </div>
            </AnimatedReveal>

            {/* Cell 3: Calendar */}
            <AnimatedReveal delay={0.3} className="relative rounded-3xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 overflow-hidden p-8 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center mb-6">
                  <CalendarCheck className="w-6 h-6 text-slate-700 dark:text-zinc-300" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "حجز فوري" : "Instant Booking"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400">
                  {dir === "rtl" 
                    ? "اختر الموعد المناسب لك واحجز بضغطة زر واحدة." 
                    : "Select your preferred slot and secure it with a single tap."}
                </p>
              </div>
            </AnimatedReveal>

            {/* Cell 4: Security (Spans 2 cols on md) */}
            <AnimatedReveal delay={0.4} className="md:col-span-2 relative rounded-3xl bg-slate-900 dark:bg-zinc-950 border border-slate-800 dark:border-white/10 overflow-hidden p-8 md:p-10 flex flex-col justify-between text-white">
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">
                  {dir === "rtl" ? "خصوصية تامة للبيانات" : "Complete Data Privacy"}
                </h3>
                <p className="text-slate-400">
                  {dir === "rtl" 
                    ? "نحن نضع خصوصيتك في المقام الأول. بياناتك الطبية مشفرة ومحمية بالكامل." 
                    : "We put your privacy first. Your medical data is end-to-end encrypted and fully protected."}
                </p>
              </div>
            </AnimatedReveal>
          </div>
        </section>

        {/* 4. Final CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 mb-12">
          <AnimatedReveal className="max-w-4xl mx-auto text-center bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-white/5 rounded-[3rem] p-12 md:p-24">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white mb-6">
              {dir === "rtl" ? "مستعد لتحسين صحتك؟" : "Ready for better health?"}
            </h2>
            <Link
              href="/doctors"
              prefetch={true}
              className="inline-flex h-14 items-center justify-center rounded-full bg-slate-900 dark:bg-white px-10 text-base font-medium text-white dark:text-black transition-transform hover:scale-[0.98] active:scale-95"
            >
              {dir === "rtl" ? "ابدأ الآن" : "Get Started"}
            </Link>
          </AnimatedReveal>
        </section>
        
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-white/5 bg-white dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" alt="mermer" width={24} height={24} className="w-6 h-6" priority />
            <span className="font-semibold text-lg tracking-tight">mermer</span>
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-zinc-500">
            © {new Date().getFullYear()} {dir === "rtl" ? "جميع الحقوق محفوظة." : "All rights reserved."}
          </div>
        </div>
      </footer>
    </div>
  );
}
