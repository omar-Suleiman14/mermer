import { internalMutation } from "./_generated/server";

export const undoDefaultTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const defaultNames = [
      "تأكيد حجز",
      "تذكير بموعد",
      "إلغاء موعد",
      "تعديل موعد",
      "دورك الآن",
      "موعد فائت"
    ];

    const templates = await ctx.db.query("messageTemplates").collect();
    let deletedCount = 0;

    for (const t of templates) {
      if (defaultNames.includes(t.name)) {
        await ctx.db.delete(t._id);
        deletedCount++;
      }
    }

    return `Deleted ${deletedCount} default templates.`;
  }
});
