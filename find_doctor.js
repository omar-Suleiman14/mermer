const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://shocking-aardvark-611.convex.cloud");

async function run() {
  const query = `
    import { query } from "./_generated/server";
    export default query(async (ctx) => {
      return await ctx.db.get("jh7ayjjh72tv6xytfzfkkf85bx8735qs");
    });
  `;
}
// I'll just write it in appointments.ts to fetch doctor directly
