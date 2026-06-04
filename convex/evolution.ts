import { action, internalAction, internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "B6D711FCDE4D4FD5936544120E7139D5";

// ACTION: Create an instance for the clinic
export const activateIntegration = action({
  args: { clinicId: v.id("users") },
  handler: async (ctx, args) => {
    const instanceName = `clinic_${args.clinicId}`;

    try {
      let instanceApiKey = "";
      let errorMsg = "";

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: GLOBAL_API_KEY,
            },
            body: JSON.stringify({
              instanceName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS",
            }),
          });

          if (response.ok) {
            const data = await response.json();
            instanceApiKey = data.hash?.apikey || data.apikey;
            break;
          }

          const errorText = await response.text();
          
          // Whether it's 403 or 502, try to fetch it just in case it was created successfully behind the proxy
          const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
            method: "GET",
            headers: { apikey: GLOBAL_API_KEY }
          });
          
          if (fetchRes.ok) {
            const instances = await fetchRes.json();
            if (instances && instances.length > 0) {
              instanceApiKey = instances[0].token || instances[0].hash?.apikey || instances[0].apikey;
              break;
            }
          }

          errorMsg = errorText;
          if (attempt === 1) await new Promise(r => setTimeout(r, 2000));
        } catch (e: any) {
          errorMsg = e.message;
          if (attempt === 1) await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (!instanceApiKey) {
        return { success: false, error: errorMsg || "Failed to create or retrieve instance" };
      }

      // Configure Webhook for the new/existing instance
      const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || process.env.CONVEX_SITE_URL;
      if (CONVEX_SITE_URL) {
        await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: GLOBAL_API_KEY,
          },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: `${CONVEX_SITE_URL}/evolution-webhook`,
              byEvents: false,
              events: ["MESSAGES_UPSERT"],
            },
          }),
        }).catch(err => console.error("Failed to set webhook:", err));
      }

      // 2. Update user record in Convex
      await ctx.runMutation(internal.evolution.updateInstanceDetails, {
        clinicId: args.clinicId,
        evolutionInstanceName: instanceName,
        evolutionApiKey: instanceApiKey,
        evolutionStatus: "connecting",
        isEvolutionActive: true,
      });

      return { success: true };
    } catch (e) {
      console.error("Evolution API unreachable", e);
      return { success: false, error: "Evolution API server is unreachable." };
    }
  },
});

// ACTION: Fetch QR Code or Connection State
export const getConnectionState = action({
  args: { clinicId: v.id("users"), instanceName: v.string() },
  handler: async (ctx, args) => {
    try {
      // 1. Check if the instance exists on the Evolution API
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${args.instanceName}`, {
        method: "GET",
        headers: {
          apikey: GLOBAL_API_KEY,
        },
      });

      // Instance doesn't exist (e.g. after container restart) — recreate it
      if (!response.ok) {
        console.log(`Instance ${args.instanceName} not found, recreating...`);

        const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: GLOBAL_API_KEY,
          },
          body: JSON.stringify({
            instanceName: args.instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });

        if (!createRes.ok) {
          const errText = await createRes.text();
          console.error("Failed to recreate instance:", errText);
          return { status: "error", message: "Failed to recreate WhatsApp instance." };
        }

        // Now fetch the QR code for the newly created instance
        const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${args.instanceName}`, {
          method: "GET",
          headers: { apikey: GLOBAL_API_KEY },
        });

        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          return { status: "connecting", qrCode: qrData.base64 || qrData.qrcode };
        }

        return { status: "connecting" };
      }

      const data = await response.json();
      const state = data.instance?.state || data.state;

      if (state === "open") {
        await ctx.runMutation(internal.evolution.updateInstanceStatus, {
          clinicId: args.clinicId,
          evolutionStatus: "open",
        });
        return { status: "open" };
      }

      // If connecting, fetch the QR code
      const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${args.instanceName}`, {
        method: "GET",
        headers: {
          apikey: GLOBAL_API_KEY,
        },
      });

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        return { status: "connecting", qrCode: qrData.base64 || qrData.qrcode };
      }

      return { status: state };
    } catch (e) {
      console.error("Evolution API unreachable", e);
      return { status: "error", message: "Evolution API server is unreachable." };
    }
  },
});

// INTERNAL MUTATIONS
export const updateInstanceDetails = internalMutation({
  args: {
    clinicId: v.id("users"),
    evolutionInstanceName: v.string(),
    evolutionApiKey: v.string(),
    evolutionStatus: v.string(),
    isEvolutionActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clinicId, {
      evolutionInstanceName: args.evolutionInstanceName,
      evolutionApiKey: args.evolutionApiKey,
      evolutionStatus: args.evolutionStatus,
      isEvolutionActive: args.isEvolutionActive,
    });
  },
});

export const updateInstanceStatus = internalMutation({
  args: {
    clinicId: v.id("users"),
    evolutionStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clinicId, {
      evolutionStatus: args.evolutionStatus,
    });
  },
});

// Reset the integration state in the database
export const clearIntegrationState = internalMutation({
  args: { clinicId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clinicId, {
      evolutionInstanceName: undefined,
      evolutionApiKey: undefined,
      evolutionStatus: undefined,
      isEvolutionActive: false,
    });
  },
});

// ACTION: Properly disconnect and delete the instance on the Evolution API
export const disconnectIntegration = action({
  args: { clinicId: v.id("users"), instanceName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      if (args.instanceName) {
        // 1. Logout the instance (this signals WhatsApp to unlink the device)
        await fetch(`${EVOLUTION_API_URL}/instance/logout/${args.instanceName}`, {
          method: "DELETE",
          headers: { apikey: GLOBAL_API_KEY },
        }).catch(err => console.error("Logout failed:", err));

        // 2. Delete the instance from Evolution API
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${args.instanceName}`, {
          method: "DELETE",
          headers: { apikey: GLOBAL_API_KEY },
        }).catch(err => console.error("Delete failed:", err));
      }
    } catch (e) {
      console.error("Evolution API unreachable during disconnect", e);
    }

    // 3. Clear database state
    await ctx.runMutation(internal.evolution.clearIntegrationState, {
      clinicId: args.clinicId,
    });
  },
});

// Reset the integration so user can try again from scratch
export const resetIntegration = mutation({
  args: { clinicId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clinicId, {
      evolutionInstanceName: undefined,
      evolutionApiKey: undefined,
      evolutionStatus: undefined,
      isEvolutionActive: false,
    });
  },
});
