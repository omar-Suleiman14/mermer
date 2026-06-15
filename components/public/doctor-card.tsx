"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Building2, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatDoctorTitle, translateSpecialty } from "@/lib/doctor-display";
import type { PublicDoctor } from "@/lib/doctor-constants";
import { StarRating } from "./star-rating";
import { cn } from "@/lib/utils";

interface DoctorCardProps {
  doctor: PublicDoctor;
  className?: string;
}

export function DoctorCard({ doctor, className }: DoctorCardProps) {
  const { t, lang, dir } = useI18n();
  const slug = doctor.qrSlug;
  if (!slug) return null;

  return (
    <Link
      href={`/doctors/${slug}`}
      prefetch={true}
      className={cn(
        "group block rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm border border-slate-200/60 dark:border-white/5",
        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300",
        className
      )}
    >
      <div className="flex gap-3 sm:gap-5">
        {/* Avatar */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-2">
          {doctor.profilePhotoUrl ? (
            <Image
              src={doctor.profilePhotoUrl}
              alt={doctor.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-400 dark:text-zinc-500">
              {doctor.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                  {formatDoctorTitle(doctor.name, lang)}
                </h2>
                {doctor.specialty && (
                  <p className="text-sm text-primary font-medium mt-0.5 truncate">
                    {translateSpecialty(t, doctor.specialty)}
                  </p>
                )}
              </div>
              <ChevronRight className={cn(
                "w-5 h-5 text-slate-400 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 shrink-0",
                dir === "rtl" && "rotate-180 translate-x-2 group-hover:translate-x-0"
              )} />
            </div>

            {doctor.avgRating !== null && doctor.reviewCount > 0 && (
              <StarRating
                rating={doctor.avgRating}
                count={doctor.reviewCount}
                className="mt-2"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-slate-500 dark:text-zinc-400">
            {doctor.clinicName && (
              <span className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[150px]">
                  {doctor.clinicName}
                </span>
              </span>
            )}
            {(doctor.city || doctor.clinicAddress) && (
              <span className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[150px]">
                  {doctor.clinicAddress || doctor.city}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer bar for price and availability */}
      <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap gap-3 items-center justify-between">
        {doctor.consultationFee !== null ? (
          <span className="font-semibold text-slate-900 dark:text-white">
            {doctor.consultationFee.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
            <span className="text-sm font-normal text-slate-500">{lang === "ar" ? "ج.م" : "EGP"}</span>
          </span>
        ) : (
          <span /> // spacer
        )}
        
          <span className="text-xs text-slate-400">
            {lang === "ar" ? "عرض المواعيد المتاحة" : "View available slots"}
          </span>
      </div>
    </Link>
  );
}
