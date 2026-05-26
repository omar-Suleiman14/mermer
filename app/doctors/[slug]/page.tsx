"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/client";
import { PublicNav } from "@/components/public/public-nav";
import { Loader2, MapPin, Building2, Languages, MessageSquarePlus, ExternalLink, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDoctorTitle, translateSpecialty } from "@/lib/doctor-display";
import { BookingForm } from "@/components/public/booking-form";
import { StarRating } from "@/components/public/star-rating";

export default function DoctorProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t, dir, lang } = useI18n();

  const doctor = useQuery(api.doctors.getPublicDoctorProfile, { slug });

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
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
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
              <div className="bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
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
               <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                 <h3 className="text-sm font-bold text-foreground">
                   {dir === "rtl" ? "اترك تقييما بعد زيارتك" : "Leave feedback after your visit"}
                 </h3>
                 <p className="mt-1 text-xs text-muted-foreground">
                   {dir === "rtl" ? "يساعد هذا المرضى الآخرين على الاختيار بثقة." : "Help other patients choose with confidence."}
                 </p>
                 <Link
                   href={`/feedback/${slug}`}
                   prefetch={true}
                   className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-background px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
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
