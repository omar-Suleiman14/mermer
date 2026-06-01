import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DoctorCard } from "@/components/public/doctor-card";
import { PublicNav } from "@/components/public/public-nav";
import { getServerI18n } from "@/lib/i18n/server";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { dir } = await getServerI18n();
  const title = dir === "rtl" ? "الأطباء | مرمر" : "Doctors | mermer";
  const description = dir === "rtl" 
    ? "تصفح قائمة الأطباء الموثقين على منصتنا واختر الأنسب لك."
    : "Browse our verified doctors and choose the best for you.";

  return {
    title,
    description,
    alternates: {
      canonical: "https://mermereg.com/doctors",
    },
    openGraph: {
      title,
      description,
      url: "https://mermereg.com/doctors",
      siteName: "mermer",
      images: [
        {
          url: "/icon.svg",
          width: 1200,
          height: 630,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/icon.svg"],
    },
  };
}

export default async function DoctorsPage() {
  const { dir } = await getServerI18n();
  const doctors = await fetchQuery(api.doctors.listPublishedDoctors);

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
      <PublicNav />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-16 w-full">
         <div className="mb-8 md:mb-16 text-center space-y-3 sm:space-y-4">
           <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white">
             {dir === "rtl" ? "الأطباء المتاحين" : "Available Doctors"}
           </h1>
           <p className="text-base md:text-lg text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto">
             {dir === "rtl" 
               ? "تصفح قائمة الأطباء الموثقين على منصتنا واختر الأنسب لك."
               : "Browse our verified doctors and choose the best for you."}
           </p>
         </div>
         
         {!doctors || doctors.length === 0 ? (
           <div className="text-center py-12 sm:py-20 text-slate-500 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-border">
             <p className="text-lg sm:text-xl font-semibold">
               {dir === "rtl" ? "لا يوجد أطباء متاحين حالياً" : "No doctors available right now"}
             </p>
           </div>
         ) : (
           <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
             {doctors.map(doc => (
               <DoctorCard key={doc._id} doctor={doc as any} />
             ))}
           </div>
         )}
      </main>
    </div>
  );
}
