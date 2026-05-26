import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { DoctorCard } from "@/components/public/doctor-card";
import { PublicNav } from "@/components/public/public-nav";
import { getServerI18n } from "@/lib/i18n/server";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { dir } = await getServerI18n();
  return {
    title: dir === "rtl" ? "الأطباء | مرمر" : "Doctors | mermer",
    description: dir === "rtl" 
      ? "تصفح قائمة الأطباء الموثقين على منصتنا واختر الأنسب لك."
      : "Browse our verified doctors and choose the best for you.",
  };
}

export default async function DoctorsPage() {
  const { dir } = await getServerI18n();
  const doctors = await fetchQuery(api.doctors.listPublishedDoctors);

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
      <PublicNav />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full">
         <div className="mb-10 text-center space-y-3">
           <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
             {dir === "rtl" ? "الأطباء المتاحين" : "Available Doctors"}
           </h1>
           <p className="text-lg text-slate-600 dark:text-zinc-400">
             {dir === "rtl" 
               ? "تصفح قائمة الأطباء الموثقين على منصتنا واختر الأنسب لك."
               : "Browse our verified doctors and choose the best for you."}
           </p>
         </div>
         
         {!doctors || doctors.length === 0 ? (
           <div className="text-center py-20 text-slate-500 bg-white dark:bg-zinc-900 rounded-3xl border border-border">
             <p className="text-xl font-semibold">
               {dir === "rtl" ? "لا يوجد أطباء متاحين حالياً" : "No doctors available right now"}
             </p>
           </div>
         ) : (
           <div className="grid sm:grid-cols-2 gap-6">
             {doctors.map(doc => (
               <DoctorCard key={doc._id} doctor={doc as any} />
             ))}
           </div>
         )}
      </main>
    </div>
  );
}
