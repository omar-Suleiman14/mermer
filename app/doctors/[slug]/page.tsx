import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getServerI18n } from "@/lib/i18n/server";
import { PublicNav } from "@/components/public/public-nav";
import { Loader2, MapPin, Building2, Languages, MessageSquarePlus, ExternalLink, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDoctorTitle, translateSpecialty } from "@/lib/doctor-display";
import { BookingForm } from "@/components/public/booking-form";
import { StarRating } from "@/components/public/star-rating";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doctor = await fetchQuery(api.doctors.getPublicDoctorProfile, { slug });
  
  if (!doctor) return { title: "Doctor Not Found" };
  
  return {
    title: `Dr. ${doctor.name} - ${doctor.specialty ?? "Doctor"} | mermer`,
    description: doctor.bio ?? `Book an appointment with Dr. ${doctor.name} on mermer.`,
    openGraph: {
      title: `Dr. ${doctor.name} | mermer`,
      description: doctor.bio ?? `Book an appointment with Dr. ${doctor.name} on mermer.`,
      url: `https://mermereg.com/doctors/${slug}`,
      siteName: "mermer",
      locale: "ar_EG",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `Dr. ${doctor.name} | mermer`,
      description: doctor.bio ?? `Book an appointment with Dr. ${doctor.name} on mermer.`,
    },
  };
}

export default async function DoctorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t, dir, lang } = await getServerI18n();

  const doctor = await fetchQuery(api.doctors.getPublicDoctorProfile, { slug });

  if (doctor === undefined) {
    return (
      <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
        <PublicNav />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
        </main>
      </div>
    );
  }

  if (doctor === null) {
    return (
      <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
        <PublicNav />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              {dir === "rtl" ? "الطبيب غير موجود" : "Doctor Not Found"}
            </h1>
            <p className="text-muted-foreground">
              {dir === "rtl" ? "ربما تم إخفاء هذا الملف الشخصي أو حذفه." : "This profile may be hidden or removed."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
      <PublicNav />
      
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Physician",
              "name": doctor.name,
              "medicalSpecialty": doctor.specialty,
              "address": { "@type": "PostalAddress", "addressLocality": doctor.city ?? doctor.clinicAddress },
              "aggregateRating": doctor.avgRating !== null && doctor.reviewCount > 0 ? { "@type": "AggregateRating", "ratingValue": doctor.avgRating, "reviewCount": doctor.reviewCount } : undefined
            },
            {
              "@type": "MedicalClinic",
              "name": doctor.clinicName ?? `${doctor.name} Clinic`,
              "address": { "@type": "PostalAddress", "addressLocality": doctor.city ?? doctor.clinicAddress },
            }
          ]
        })}} />
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-6 sm:p-8 rounded-[2.5rem] shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-3xl overflow-hidden bg-muted shrink-0 shadow-md">
                  {doctor.profilePhotoUrl ? (
                    <Image
                      src={doctor.profilePhotoUrl}
                      alt={doctor.name}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-primary/60">
                      {doctor.name.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-start space-y-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {formatDoctorTitle(doctor.name, lang)}
                    </h1>
                    {doctor.specialty && (
                      <p className="text-lg text-primary font-medium mt-1">
                        {translateSpecialty(t, doctor.specialty)}
                      </p>
                    )}
                  </div>
                  
                  {doctor.avgRating !== null && doctor.reviewCount > 0 && (
                    <div className="flex justify-center sm:justify-start">
                      <StarRating rating={doctor.avgRating} count={doctor.reviewCount} />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 text-sm text-muted-foreground">
                    {doctor.clinicName && (
                      <span className="flex items-center gap-2 justify-center sm:justify-start">
                        <Building2 className="w-4 h-4 shrink-0 text-primary/70" />
                        {doctor.clinicName}
                      </span>
                    )}
                    {(doctor.city || doctor.clinicAddress) && (
                      <span className="flex items-center gap-2 justify-center sm:justify-start">
                        <MapPin className="w-4 h-4 shrink-0 text-primary/70" />
                        {doctor.clinicAddress || doctor.city}
                      </span>
                    )}
                    {doctor.clinicAddressLink && (
                      <a
                        href={doctor.clinicAddressLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 justify-center sm:justify-start text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        {dir === "rtl" ? "فتح الموقع على الخريطة" : "Open on Maps"}
                      </a>
                    )}
                    {doctor.languages.length > 0 && (
                      <span className="flex items-center gap-2 justify-center sm:justify-start">
                        <Languages className="w-4 h-4 shrink-0 text-primary/70" />
                        {doctor.languages.join(" • ")}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Bio & Credentials */}
            {(doctor.bio || doctor.credentials) && (
              <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-6 sm:p-8 rounded-[2.5rem] shadow-sm space-y-8">
                {doctor.bio && (
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-3">
                      {dir === "rtl" ? "نبذة عن الطبيب" : "About Doctor"}
                    </h2>
                    <p className="text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {doctor.bio}
                    </p>
                  </div>
                )}
                {doctor.credentials && (
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-3">
                      {dir === "rtl" ? "الشهادات والخبرات" : "Credentials"}
                    </h2>
                    <p className="text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {doctor.credentials}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <BookingForm doctor={doctor} />
            
          </div>

          {/* Sidebar Booking Column */}
          <div className="lg:col-span-1 space-y-6">
             <div className="sticky top-24 space-y-4">
               <div className="rounded-3xl border border-primary/10 bg-primary/5 dark:bg-primary/10 p-6 shadow-sm">
                 <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                   {dir === "rtl" ? "اترك تقييما بعد زيارتك" : "Leave feedback after your visit"}
                 </h3>
                 <p className="mt-1 text-xs text-muted-foreground">
                   {dir === "rtl" ? "يساعد هذا المرضى الآخرين على الاختيار بثقة." : "Help other patients choose with confidence."}
                 </p>
                 <Link
                   href={`/feedback/${slug}`}
                   prefetch={true}
                   className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 border border-primary/20 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                 >
                   <MessageSquarePlus className="w-4 h-4" />
                   {dir === "rtl" ? "أضف تقييمك" : "Leave Feedback"}
                 </Link>
               </div>

             </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
