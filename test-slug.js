const { ConvexHttpClient } = require("convex/browser");
require("dotenv").config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function test() {
  const doctor = await client.query("users:getDoctorBySlug", { slug: "omar-suleiman-negl4" });
  console.log("Doctor returned:", doctor);
}

test();
