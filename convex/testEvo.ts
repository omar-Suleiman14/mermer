import { query } from "./_generated/server";

export default query({
  args: {},
  handler: async (ctx) => {
    const clinics = await ctx.db.query("users").withIndex("by_evolution_active", q => q.eq("isEvolutionActive", true)).collect();
    return clinics.map(c => ({
      name: c.name,
      phone: c.phone,
      instanceName: c.evolutionInstanceName,
      status: c.evolutionStatus
    }));
  }
});
