import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export default action({
  args: {},
  handler: async (ctx) => {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
    const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "B6D711FCDE4D4FD5936544120E7139D5";

    const clinics = await ctx.runQuery(internal.whatsappQueries.getActiveEvolutionClinics, {});
    for (const clinic of clinics) {
      if (clinic.evolutionStatus === "open" && clinic.evolutionInstanceName) {
        try {
          const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${clinic.evolutionInstanceName}`, {
            headers: { apikey: GLOBAL_API_KEY }
          });
          if (fetchRes.ok) {
            const arr = await fetchRes.json();
            if (arr && arr[0] && arr[0].ownerJid) {
              const ownerJid = arr[0].ownerJid.split("@")[0];
              console.log(`Syncing clinic ${clinic._id} phone to ${ownerJid}`);
              await ctx.runMutation(internal.evolution.updateInstanceStatus, {
                clinicId: clinic._id,
                evolutionStatus: "open",
                evolutionConnectedPhone: ownerJid,
              });
            }
          }
        } catch (err) {
          console.error(`Failed to sync clinic ${clinic._id}`, err);
        }
      }
    }
    return "Done";
  }
});
