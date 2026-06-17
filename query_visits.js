const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://shocking-aardvark-611.convex.cloud");

async function run() {
  const visits = await client.query("appointments:debugVisits");
  console.log(JSON.stringify(visits, null, 2));
}
run();
