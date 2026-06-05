import { action } from "./_generated/server";

export default action({
  args: {},
  handler: async (ctx) => {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
    const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "B6D711FCDE4D4FD5936544120E7139D5";

    const instanceName = "clinic_jh7ayjjh72tv6xytfzfkkf85bx8735qs"; // Omar Suleiman
    
    const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      method: "GET",
      headers: { apikey: GLOBAL_API_KEY },
    });
    
    if (fetchRes.ok) {
      const data = await fetchRes.json();
      return data;
    }
    return { error: "Failed to fetch" };
  }
});
