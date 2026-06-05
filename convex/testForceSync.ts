import { mutation } from "./_generated/server";

export default mutation({
  args: {},
  handler: async (ctx) => {
    const clinics = await ctx.db.query("users").withIndex("by_evolution_active", q => q.eq("isEvolutionActive", true)).collect();
    for (const c of clinics) {
      if (c.evolutionInstanceName === "clinic_jh7ayjjh72tv6xytfzfkkf85bx8735qs") {
        await ctx.db.patch(c._id, { evolutionConnectedPhone: "201035555282" });
      }
    }
  }
});
