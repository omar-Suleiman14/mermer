import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import { getServerI18n } from "@/lib/i18n/server";
import { PublicNav } from "@/components/public/public-nav";
import { formatDoctorTitle, translateSpecialty } from "@/lib/doctor-display";
import { FeedbackForm } from "@/components/feedback-form";

// We can pre-generate these pages if we want, but for now we fetch dynamically on the server
export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { dir, lang, t } = await getServerI18n();

  // Fetch data on the server
  const convexUrl = (process.env.NEXT_PUBLIC_CONVEX_URL || "").replace(/\/$/, "");
  const client = new ConvexHttpClient(convexUrl);
  const doctor = await client.query(api.feedback.getDoctorInfoBySlug, { slug });

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={dir}>
        <PublicNav backHref="/" backLabel={lang === "ar" ? "الرئيسية" : "Home"} />
        <p className="flex-1 flex items-center justify-center text-muted-foreground">
          {lang === "ar" ? "صفحة التقييم غير موجودة." : "Rating page not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 pb-12" dir={dir}>
      <PublicNav
        backHref="/"
        backLabel={lang === "ar" ? "الرئيسية" : "Home"}
      />

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-start sm:justify-center">
        {/* Doctor Info Subheader */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-4 sm:p-5 rounded-3xl flex items-center gap-4 sm:gap-5 shadow-sm mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 relative">
            {doctor.profilePhotoUrl ? (
              <Image src={doctor.profilePhotoUrl} alt={doctor.name} fill className="object-cover" sizes="(max-width: 640px) 56px, 64px" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-primary">
                {doctor.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {formatDoctorTitle(doctor.name, lang)}
              </h2>
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-primary border border-blue-100 dark:border-blue-900/30">
                <ShieldCheck className="w-3 h-3" />
                {lang === "ar" ? "موثّق" : "Verified"}
              </span>
            </div>
            {doctor.specialty && (
              <p className="text-xs text-primary font-semibold mt-0.5">
                {translateSpecialty(t, doctor.specialty)}
              </p>
            )}
            {doctor.clinicName && (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">{doctor.clinicName}</p>
            )}
          </div>
        </div>

        {/* The Interactive Form Client Component */}
        <FeedbackForm slug={slug} doctorName={doctor.name} />
      </main>
    </div>
  );
}
