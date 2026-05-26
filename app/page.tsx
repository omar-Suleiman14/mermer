import Link from "next/link";
import { ArrowRight, Search, Stethoscope } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
import dynamic from "next/dynamic";

// Lazily load PublicNav to reduce initial blocking JS on landing page
const PublicNav = dynamic(() => import("@/components/public/public-nav").then((m) => m.PublicNav));

export default async function PatientLandingPage() {
  const { dir } = await getServerI18n();

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.12),transparent_45%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.1),transparent_45%)]">
        <div className="max-w-5xl w-full mx-auto text-center space-y-8">
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {dir === "rtl" ? (
              <>احجز مع أفضل الأطباء <span className="text-primary block">بكل سهولة.</span></>
            ) : (
              <>Book the Best Doctors <span className="text-primary block">with Ease.</span></>
            )}
          </h1>
          
          <p className="text-base sm:text-xl md:text-2xl text-slate-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed font-medium">
            {dir === "rtl" ? (
              "اختر طبيبك، حدد موعدك، وانطلق نحو صحة أفضل بخطوات بسيطة."
            ) : (
              "Choose your doctor, book your appointment, and start your journey to better health."
            )}
          </p>

          <div className="pt-4 flex flex-wrap gap-3 justify-center">
            <Link
              prefetch={true}
              href="/doctors"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Search className="w-5 h-5" />
              {dir === "rtl" ? "ابحث عن طبيب الآن" : "Find a Doctor Now"}
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
            </Link>
            <Link
              prefetch={true}
              href="/fordoctors"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 hover:bg-white dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-semibold text-lg transition-colors"
            >
              <Stethoscope className="w-5 h-5 text-primary" />
              {dir === "rtl" ? "للأطباء" : "For Doctors"}
            </Link>
          </div>
          
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-slate-200/80 dark:border-zinc-900 py-8 text-center">
         <div className="text-sm font-semibold text-slate-500">
           © {new Date().getFullYear()} {dir === "rtl" ? "مرمر" : "mermer"}. All rights reserved.
         </div>
      </footer>
    </div>
  );
}
