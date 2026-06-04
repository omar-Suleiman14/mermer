import { query } from "./_generated/server";
export const checkPrescription = query(async (ctx) => {
  return await ctx.db.query("users").collect();
});
