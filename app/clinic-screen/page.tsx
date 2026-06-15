// "use client";

// import { useUser } from "@clerk/nextjs";
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { useEffect, useState } from "react";
// import QRCode from "qrcode";
// import { IOSSpinner } from "@/components/ui/spinner";
// import { motion } from "framer-motion";
// import { useI18n } from "@/lib/i18n/client";

// export default function ClinicScreen() {
//   const { user, isLoaded } = useUser();
//   const { lang } = useI18n();
  
//   const currentUser = useQuery(
//     api.users.getCurrentUser,
//     isLoaded && user ? { clerkId: user.id } : "skip"
//   );

//   const [time, setTime] = useState(new Date());
//   const [qrSrc, setQrSrc] = useState("");

//   // Update time every second
//   useEffect(() => {
//     const timer = setInterval(() => setTime(new Date()), 1000);
//     return () => clearInterval(timer);
//   }, []);

//   // Generate QR Code
//   useEffect(() => {
//     if (currentUser) {
//       const url = currentUser.qrSlug ? `${window.location.origin}/feedback/${currentUser.qrSlug}` : window.location.origin;
//       QRCode.toDataURL(url, {
//         width: 800,
//         margin: 2,
//         color: {
//           dark: "#000000",
//           light: "#ffffff",
//         },
//       }).then(setQrSrc).catch(console.error);
//     }
//   }, [currentUser]);

//   if (!isLoaded || currentUser == null) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <IOSSpinner size={48} className="text-primary" />
//       </div>
//     );
//   }

//   // Calculate working hours progress
//   const startH = currentUser.workingHoursStart ?? 9;
//   const endH = currentUser.workingHoursEnd ?? 17;
//   const isAlwaysOpen = startH === 0 && endH === 24;

//   const currentHourFloat = time.getHours() + time.getMinutes() / 60 + time.getSeconds() / 3600;
  
//   let progress = 0;
//   let isOutsideWorkingHours = false;

//   if (isAlwaysOpen) {
//     progress = 1 - (currentHourFloat / 24);
//   } else {
//     if (currentHourFloat < startH || currentHourFloat >= endH) {
//       isOutsideWorkingHours = true;
//       const elapsedSeconds = (time.getMinutes() % 5) * 60 + time.getSeconds();
//       progress = 1 - (elapsedSeconds / 300);
//     } else {
//       progress = 1 - ((currentHourFloat - startH) / (endH - startH));
//     }
//   }

//   const strokeColor = isOutsideWorkingHours ? "#ef4444" : "#22c55e";

//   const locale = lang === "ar" ? "ar-EG" : "en-US";

//   const timeString = time.toLocaleTimeString(locale, {
//     hour: "numeric",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//   });

//   const dateString = time.toLocaleDateString(locale, {
//     weekday: "long",
//     month: "long",
//     day: "numeric",
//   });

//   // A perfectly rounded rectangle path starting at top-center (12 o'clock position)
//   // width=980, height=480, rx=80, ry=80, offset x=10 y=10 -> center top is (500, 10)
//   // This fits inside a 1000x500 viewBox
//   const rectPath = "M 500 10 H 910 A 80 80 0 0 1 990 90 V 410 A 80 80 0 0 1 910 490 H 90 A 80 80 0 0 1 10 410 V 90 A 80 80 0 0 1 90 10 Z";

//   return (
//     <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 font-sans" dir={lang === "ar" ? "rtl" : "ltr"}>
//       <div className="w-full max-w-[1400px] mx-auto flex items-center justify-center">
        
//         <div className="relative w-full aspect-[2/1] max-w-full flex items-center justify-center">
//           {/* Hollow Green Squircle SVG for Progress */}
//           <svg 
//             className="absolute inset-0 w-full h-full"
//             viewBox="0 0 1000 500"
//             preserveAspectRatio="xMidYMid meet"
//           >
//             <path
//               d={rectPath}
//               fill="none"
//               stroke="currentColor"
//               strokeWidth="4"
//               className="text-muted/20"
//             />
//             <motion.path
//               d={rectPath}
//               fill="none"
//               stroke={strokeColor}
//               strokeWidth="12"
//               strokeLinecap="round"
//               initial={{ pathLength: 0 }}
//               animate={{ pathLength: progress }}
//               transition={{ duration: 1, ease: "linear" }}
//             />
//           </svg>

//           {/* Content inside the squircle */}
//           <div className="relative z-10 flex flex-row items-stretch justify-between w-full h-full p-12 lg:p-16">
            
//             {/* LEFT SIDE: Clinic Name & Time */}
//             <div className="flex-1 flex flex-col items-center justify-center text-center pr-8 border-r border-border/20">
//               <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight mb-8">
//                 {currentUser.clinicName}
//               </h2>
              
//               <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground tabular-nums whitespace-nowrap">
//                 {timeString}
//               </h1>
              
//               <p className="mt-6 text-xl md:text-2xl lg:text-3xl font-medium text-muted-foreground">
//                 {dateString}
//               </p>
              
//               {!isAlwaysOpen && (
//                 <div className="mt-10 flex items-center justify-center gap-3 text-sm md:text-lg lg:text-xl text-muted-foreground/80 font-medium">
//                   <span className="bg-muted px-4 py-2 rounded-full border border-border">
//                     {startH === 0 ? "12 AM" : startH === 12 ? "12 PM" : startH > 12 ? `${startH - 12} PM` : `${startH} AM`}
//                   </span>
//                   <span>{lang === "ar" ? "إلى" : "to"}</span>
//                   <span className="bg-muted px-4 py-2 rounded-full border border-border">
//                     {endH === 0 ? "12 AM" : endH === 12 ? "12 PM" : endH > 12 ? `${endH - 12} PM` : `${endH} AM`}
//                   </span>
//                 </div>
//               )}
//             </div>

//             {/* RIGHT SIDE: QR Code */}
//             <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center pl-8">
//               <p className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold max-w-[80%] leading-relaxed">
//                 {lang === "ar" ? "امسح الرمز لترك تقييمك" : "Scan to leave feedback"}
//               </p>

//               <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-border/50">
//                 {qrSrc ? (
//                   <img src={qrSrc} alt="Clinic QR Code" className="w-[200px] h-[200px] md:w-[250px] md:h-[250px] lg:w-[320px] lg:h-[320px] object-contain" />
//                 ) : (
//                   <div className="w-[200px] h-[200px] md:w-[250px] md:h-[250px] lg:w-[320px] lg:h-[320px] flex items-center justify-center bg-muted rounded-[1.5rem] animate-pulse">
//                     <IOSSpinner size={32} />
//                   </div>
//                 )}
//               </div>
//             </div>

//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }
"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { IOSSpinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/client";
import Image from "next/image";
import { startOfDay } from "@/lib/scheduling";

export default function ClinicScreen() {
  const { user, isLoaded } = useUser();
  const { lang } = useI18n();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    isLoaded && user ? { clerkId: user.id } : "skip"
  );

  const [time, setTime] = useState(new Date());
  const [qrSrc, setQrSrc] = useState("");

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clinicScreenShowNames = (currentUser as any)?.clinicScreenShowNames ?? false;

  const todayTs = startOfDay(Date.now());
  const todayAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    isLoaded && user ? { clerkId: user.id, dayStart: todayTs } : "skip"
  );

  const todayVisits = todayAppointments?.filter((a) => a.status !== "cancelled").sort((a, b) => a.date - b.date) || [];
  
  // Calculate based on time
  const now = time.getTime();
  const slotDurationMs = (currentUser?.slotDurationMinutes || 30) * 60000;

  const currentPatientIdx = todayVisits.findIndex(a => a.date <= now && a.date + slotDurationMs > now && a.status !== "completed");
  const currentPatient = currentPatientIdx !== -1
    ? todayVisits[currentPatientIdx]
    : (() => { const i = todayVisits.findIndex(a => a.date <= now && a.date + slotDurationMs > now); return i !== -1 ? todayVisits[i] : undefined; })();
  const currentPatientNumber = currentPatient ? (todayVisits.indexOf(currentPatient) + 1) : null;

  const nextPatientIdx = todayVisits.findIndex(a => a.date > now && a.status !== "completed");
  const nextPatient = nextPatientIdx !== -1
    ? todayVisits[nextPatientIdx]
    : (() => { const i = todayVisits.findIndex(a => a.date > now); return i !== -1 ? todayVisits[i] : undefined; })();
  const nextPatientNumber = nextPatient ? (todayVisits.indexOf(nextPatient) + 1) : null;

  // Generate QR Code
  useEffect(() => {
    if (currentUser) {
      const url = currentUser.qrSlug
        ? `${window.location.origin}/feedback/${currentUser.qrSlug}`
        : window.location.origin;
      QRCode.toDataURL(url, {
        width: 800,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then(setQrSrc)
        .catch(console.error);
    }
  }, [currentUser]);

  if (!isLoaded || currentUser === undefined || currentUser === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <IOSSpinner size={48} className="text-primary" />
      </div>
    );
  }

  // Calculate working hours progress
  const startH = currentUser?.workingHoursStart ?? 9;
  const endH = currentUser?.workingHoursEnd ?? 17;
  const isAlwaysOpen = startH === 0 && endH === 24;

  const currentHourFloat =
    time.getHours() + time.getMinutes() / 60 + time.getSeconds() / 3600;

  let progress = 0;
  let isOutsideWorkingHours = false;

  if (isAlwaysOpen) {
    progress = 1 - currentHourFloat / 24;
  } else {
    if (currentHourFloat < startH || currentHourFloat >= endH) {
      isOutsideWorkingHours = true;
      const elapsedSeconds = (time.getMinutes() % 5) * 60 + time.getSeconds();
      progress = 1 - elapsedSeconds / 300;
    } else {
      progress = 1 - (currentHourFloat - startH) / (endH - startH);
    }
  }

  const strokeColor = isOutsideWorkingHours ? "#ef4444" : "#22c55e";

  const locale = lang === "ar" ? "ar-EG" : "en-US";

  // Manually split the localized time into fixed blocks to prevent jittering
  const h12 = time.getHours() % 12 || 12;
  const hStr = h12.toLocaleString(locale, { minimumIntegerDigits: 2 });
  const mStr = time.getMinutes().toLocaleString(locale, { minimumIntegerDigits: 2 });
  const sStr = time.getSeconds().toLocaleString(locale, { minimumIntegerDigits: 2 });
  const ampmStr = time.getHours() >= 12 ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");

  const dateString = time.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // A perfectly rounded rectangle path starting at top-center (12 o'clock position)
  // width=980, height=480, rx=80, ry=80, offset x=10 y=10 -> center top is (500, 10)
  // This fits inside a 1000x500 viewBox
  const rectPath =
    "M 500 10 H 910 A 80 80 0 0 1 990 90 V 410 A 80 80 0 0 1 910 490 H 90 A 80 80 0 0 1 10 410 V 90 A 80 80 0 0 1 90 10 Z";

  return (
    <div
      className="h-dvh overflow-hidden bg-background text-foreground flex items-center justify-center p-8 md:p-14 lg:p-20 font-sans"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="w-full h-full max-w-350 mx-auto flex items-center justify-center">
        <div className="relative w-full aspect-2/1 max-w-full flex items-center justify-center">
          {/* Hollow Green Squircle SVG for Progress */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d={rectPath}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-200 dark:text-zinc-800"
            />
            <motion.path
              d={rectPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="20"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </svg>

          {/* Content inside the squircle */}
          <div className="relative z-10 flex flex-row items-stretch justify-between w-full h-full p-12 lg:p-16">
            {/* LEFT SIDE: Clinic Name & Time */}
            <div className="flex-1 flex flex-col items-center justify-center text-center pe-8 border-e border-slate-200 dark:border-zinc-700 overflow-hidden">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight mb-8 break-words leading-tight line-clamp-2 max-w-full text-center">
                {currentPatient ? (
                  clinicScreenShowNames ? (
                    <span className="text-[#007AFF]">{currentPatient.patientName}</span>
                  ) : (
                    <span className="text-[#007AFF]">
                      {lang === "ar" ? "رقم" : "#"}{currentPatientNumber}
                    </span>
                  )
                ) : (
                  currentUser.clinicName
                )}
              </h2>

              <div className="w-full flex items-center justify-center" style={{ height: '1.2em', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
                <div className="flex items-baseline justify-center" dir="ltr">
                  <span className="font-bold text-foreground text-center inline-block w-[1.2em]">{hStr}</span>
                  <span className="font-bold text-foreground text-center inline-block w-[0.4em] opacity-80">:</span>
                  <span className="font-bold text-foreground text-center inline-block w-[1.2em]">{mStr}</span>
                  <span className="font-bold text-foreground text-center inline-block w-[0.4em] opacity-80">:</span>
                  <span className="font-bold text-foreground text-center inline-block w-[1.2em]">{sStr}</span>
                  <span className="font-bold text-muted-foreground text-center inline-block w-[2em] text-[0.6em] mx-1 sm:mx-2">
                    {ampmStr}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xl md:text-2xl lg:text-3xl font-medium text-muted-foreground whitespace-nowrap">
                {dateString}
              </p>

              {nextPatient && (
                <div className="mt-8 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                  <span className="text-sm md:text-base font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    {lang === "ar" ? "التالي" : "Up Next"}
                  </span>
                  <p className="text-2xl md:text-3xl font-bold text-foreground truncate max-w-[90%]">
                    {clinicScreenShowNames
                      ? nextPatient.patientName
                      : `${lang === "ar" ? "رقم" : "#"}${nextPatientNumber}`}
                  </p>
                </div>
              )}

              {!isAlwaysOpen && (
                <div className="mt-10 flex items-center justify-center gap-3 text-sm md:text-lg lg:text-xl text-muted-foreground/80 font-medium">
                  <span className="bg-muted px-4 py-2 rounded-full border border-border">
                    {startH === 0
                      ? "12 AM"
                      : startH === 12
                        ? "12 PM"
                        : startH > 12
                          ? `${startH - 12} PM`
                          : `${startH} AM`}
                  </span>
                  <span>{lang === "ar" ? "إلى" : "to"}</span>
                  <span className="bg-muted px-4 py-2 rounded-full border border-border">
                    {endH === 0
                      ? "12 AM"
                      : endH === 12
                        ? "12 PM"
                        : endH > 12
                          ? `${endH - 12} PM`
                          : `${endH} AM`}
                  </span>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: QR Code */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center ps-8">
              <p className="text-2xl md:text-3xl lg:text-4xl text-foreground font-semibold max-w-[80%] leading-relaxed">
                {lang === "ar" ? "امسح الرمز لترك تقييمك" : "Scan to leave feedback"}
              </p>

              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 dark:border-zinc-800">
                {qrSrc ? (
                  <Image
                    src={qrSrc}
                    alt="Clinic QR Code"
                    width={320}
                    height={320}
                    className="w-50 h-50 md:w-62.5 md:h-62.5 lg:w-80 lg:h-80 object-contain"
                  />
                ) : (
                  <div className="w-50 h-50 md:w-62.5 md:h-62.5 lg:w-80 lg:h-80 flex items-center justify-center bg-muted rounded-[1.5rem] animate-pulse">
                    <IOSSpinner size={32} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}