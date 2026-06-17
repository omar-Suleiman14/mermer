const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://shocking-aardvark-611.convex.cloud");

async function run() {
  const query = `
    import { query } from "./_generated/server";
    export default query(async (ctx) => {
      return await ctx.db.query("messageLogs").order("desc").take(5);
    });
  `;
}
run();
