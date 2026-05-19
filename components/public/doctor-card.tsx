"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatDoctorTitle, isAvailableToday, translateSpecialty } from "@/lib/doctor-display";
import type { PublicDoctor } from "@/lib/doctor-constants";
import { StarRating } from "./star-rating";
import { cn } from "@/lib/utils";

interface DoctorCardProps {
  doctor: PublicDoctor;
  className?: string;
}

export function DoctorCard({ doctor, className }: DoctorCardProps) {
  const { t, dir, lang } = useI18n();
  const availableToday = isAvailableToday(doctor.availableDays);
  const slug = doctor.qrSlug;
  if (!slug) return null;

  return (
    <Link
      href={`/doctors/${slug}`}
      className={cn(
        "group block rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm",
        "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300",
        className
      )}
    >
      <div className="flex gap-4">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border shadow-sm">
          {doctor.profilePhotoUrl ? (
            <Image
              src={doctor.profilePhotoUrl}
              alt={doctor.name}
              fill
              sizes="72px"
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-primary/60">
              {doctor.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {formatDoctorTitle(doctor.name, lang)}
              </h2>
              {doctor.specialty && (
                <p className="text-sm text-primary font-medium mt-0.5 truncate">
                  {translateSpecialty(t, doctor.specialty)}
                </p>
              )}
              {doctor.clinicName && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {doctor.clinicName}
                </p>
              )}
            </div>
            {availableToday && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
                {t("feed.availToday")}
              </span>
            )}
          </div>

          {doctor.avgRating !== null && doctor.reviewCount > 0 && (
            <StarRating
              rating={doctor.avgRating}
              count={doctor.reviewCount}
              className="mt-2"
            />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-sm text-muted-foreground">
            {(doctor.city || doctor.clinicAddress) && (
              <span className="flex items-center gap-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                <span className="truncate max-w-[200px]">
                  {doctor.clinicAddress || doctor.city}
                </span>
              </span>
            )}
            {doctor.consultationFee !== null && (
              <span className="font-semibold text-foreground">
                {doctor.consultationFee.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}{" "}
                {lang === "ar" ? "ج.م" : "EGP"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

