import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
import { PublicNav } from "@/components/public/public-nav";

export default async function PatientLandingPage() {
  const { dir } = await getServerI18n();

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full mx-auto text-center space-y-10 py-20 mt-10">
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {dir === "rtl" ? (
              <>احجز مع أفضل الأطباء <span className="text-primary block">بكل سهولة.</span></>
            ) : (
              <>Book the Best Doctors <span className="text-primary block">with Ease.</span></>
            )}
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium">
            {dir === "rtl" ? (
              "اختر طبيبك، حدد موعدك، وانطلق نحو صحة أفضل بخطوات بسيطة."
            ) : (
              "Choose your doctor, book your appointment, and start your journey to better health."
            )}
          </p>

          <div className="pt-10 flex justify-center">
            <Link
              href="/doctors"
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-primary hover:bg-primary/90 text-white font-black text-2xl shadow-2xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-primary/40 active:scale-95"
            >
              <Search className="w-7 h-7" />
              {dir === "rtl" ? "ابحث عن طبيب الآن" : "Find a Doctor Now"}
              <ArrowRight className={`w-7 h-7 transition-transform group-hover:translate-x-1 ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
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
