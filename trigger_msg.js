const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient(process.env.CONVEX_URL || "https://shocking-aardvark-611.convex.cloud");

async function run() {
  await client.mutation("appointments:testTrigger", {
    clinicId: "jh7ayjjh72tv6xytfzfkkf85bx8735qs", // Omar Suleiman's clinic
    patientName: "best cat ever",
    patientPhone: "1005519942"
  });
  console.log("Triggered!");
}
run();
