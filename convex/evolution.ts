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
      // 1. Create Instance on Evolution API
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Evolution API Create Error:", errorText);
        return { success: false, error: errorText };
      }

      const data = await response.json();
      const instanceApiKey = data.hash?.apikey || data.apikey;

      // 2. Update user record in Convex
      await ctx.runMutation(internal.evolution.updateInstanceDetails, {
        clinicId: args.clinicId,
        evolutionInstanceName: instanceName,
        evolutionApiKey: instanceApiKey,
        evolutionStatus: "connecting",
        isEvolutionActive: true,
      });

      return { success: true, data };
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
      const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${args.instanceName}`, {
        method: "GET",
        headers: {
          apikey: GLOBAL_API_KEY,
        },
      });

      if (!response.ok) {
        return { status: "disconnected" };
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
