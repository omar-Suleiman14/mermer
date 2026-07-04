import { internalMutation } from "./_generated/server";

export const defaultTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const doctors = await ctx.db.query("users").collect();
    let seededCount = 0;

    for (const doc of doctors) {
      const existingTemplates = await ctx.db
        .query("messageTemplates")
        .withIndex("by_doctor", (q) => q.eq("doctorId", doc._id))
        .collect();

      const existingNames = new Set(existingTemplates.map(t => t.name));

      const templates = [
        {
          name: "تأكيد حجز",
          body: "مرحباً {name}،\nتم تأكيد موعدك بنجاح!\nالتاريخ: {date}\nالوقت: {time}\n{clinic_address}\n\nنراك قريباً."
        },
        {
          name: "تذكير بموعد",
          body: "تذكير بموعدك\nمرحباً {name}،\nموعدك اليوم الساعة {time}.\n{clinic_address}\n\nنتمنى لك الشفاء العاجل."
        },
        {
          name: "إلغاء موعد",
          body: "مرحباً {name}،\nنعتذر عن إلغاء موعدك بتاريخ {date}.\nيسعدنا إعادة الحجز عند اتصالك بنا."
        },
        {
          name: "تعديل موعد",
          body: "مرحباً {name}،\nتم تعديل موعدك ليصبح بتاريخ {date} الساعة {time}.\n{clinic_address}\n\nنراك قريباً."
        },
        {
          name: "دورك الآن",
          body: "مرحباً {name}،\nدورك القادم الآن. يرجى التوجه إلى العيادة في أقرب وقت."
        },
        {
          name: "موعد فائت",
          body: "مرحباً {name}،\nيبدو أنك لم تحضر موعدك بتاريخ {date}.\nنتمنى أن تكون بخير. يسعدنا إعادة الحجز عند اتصالك بنا."
        }
      ];

      for (const t of templates) {
        if (!existingNames.has(t.name)) {
          seededCount++;
          await ctx.db.insert("messageTemplates", {
            doctorId: doc._id,
            name: t.name,
            body: t.body,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    }

    return `Seeded default templates for ${seededCount} doctors.`;
  }
});
