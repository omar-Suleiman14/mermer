import { action, internalAction, internalMutation, query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";
const GLOBAL_API_KEY = process.env.EVOLUTION_API_KEY || "";
// NOTE: Use CONVEX_SITE_URL (not NEXT_PUBLIC_CONVEX_SITE_URL) — Convex actions
// cannot read NEXT_PUBLIC_ prefixed env vars. Convex provides this automatically.
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;

// Evolution Go uses the instance token as the apikey header to scope requests to that instance.
// The GLOBAL_API_KEY is used only for creating/listing instances.

// ACTION: Create an instance for the clinic
export const activateIntegration = action({
  args: { clinicId: v.id("users") },
  handler: async (ctx, args) => {
    const instanceName = `clinic_${args.clinicId}`;
    // Use a stable token derived from the instance name (you can also store a random one)
    const instanceToken = `tok_${args.clinicId}`;

    try {
      // --- Step 1: Create the instance ---
      // Evolution Go /instance/create body: { name, token, instanceId, advancedSettings }
      let created = false;
      let errorMsg = "";

      const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: GLOBAL_API_KEY,
        },
        body: JSON.stringify({
          name: instanceName,
          token: instanceToken,
          qrcode: true,
        }),
      });

      if (createRes.ok) {
        created = true;
      } else {
        const errText = await createRes.text();
        
        // If it already exists (from an older integration attempt), it might have the wrong token.
        // We force delete it and recreate it with our correct predictable token.
        if (createRes.status === 409 || errText.includes("already exists")) {
          console.log(`Instance ${instanceName} exists but we need to ensure correct token. Recreating...`);
          await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
            method: "DELETE",
            headers: { apikey: GLOBAL_API_KEY },
          }).catch(() => {});
          
          // Retry creation
          const retryRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: GLOBAL_API_KEY,
            },
            body: JSON.stringify({ name: instanceName, token: instanceToken, qrcode: true }),
          });
          
          if (retryRes.ok) {
            created = true;
          } else {
            errorMsg = await retryRes.text();
            console.error("Retry create instance failed:", retryRes.status, errorMsg.slice(0, 300));
          }
        } else {
          errorMsg = errText;
          console.error("Create instance failed:", createRes.status, errText.slice(0, 300));
        }
      }

      if (!created) {
        return { success: false, error: errorMsg || "Failed to create instance" };
      }

      // --- Step 2: Connect + configure webhook ---
      // POST /instance/connect with { webhookUrl, subscribe, immediate }
      // The instance token is passed as apikey to scope to this instance
      const webhookUrl = CONVEX_SITE_URL
        ? `${CONVEX_SITE_URL}/evolution-webhook`
        : undefined;

      const connectBody: Record<string, unknown> = {
        immediate: false,
        subscribe: ["MESSAGES_UPSERT"],
      };
      if (webhookUrl) {
        connectBody.webhookUrl = webhookUrl;
        console.log(`Webhook configured: ${webhookUrl}`);
      } else {
        console.warn("CONVEX_SITE_URL not set — webhook not configured.");
      }

      let qrCode: string | undefined;
      const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: instanceToken,   // Evolution Go: use instance token to scope
        },
        body: JSON.stringify(connectBody),
      });

      if (connectRes.ok) {
        const connectWrapper = await connectRes.json();
        const connectData = connectWrapper.data || connectWrapper;
        qrCode =
          connectData.Qrcode ||
          connectData.qrcode?.base64 ||
          connectData.base64 ||
          connectData.qr ||
          undefined;
      } else {
        const cErr = await connectRes.text();
        console.error("Connect instance failed:", connectRes.status, cErr.slice(0, 300));
      }

      // --- Step 3: If no QR in connect response, fetch it separately ---
      if (!qrCode) {
        await new Promise(r => setTimeout(r, 1500));
        const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/qr`, {
          method: "GET",
          headers: { apikey: instanceToken },
        });
        if (qrRes.ok) {
          const qrWrapper = await qrRes.json();
          const qrData = qrWrapper.data || qrWrapper;
          qrCode =
            qrData.Qrcode ||
            qrData.qrcode?.base64 ||
            qrData.base64 ||
            qrData.qr ||
            undefined;
          console.log("QR fetch response keys:", Object.keys(qrWrapper));
        } else {
          console.error("QR fetch failed:", qrRes.status, await qrRes.text().catch(() => ""));
        }
      }

      // --- Step 4: Update user record in Convex ---
      await ctx.runMutation(internal.evolution.updateInstanceDetails, {
        clinicId: args.clinicId,
        evolutionInstanceName: instanceName,
        evolutionApiKey: instanceToken,   // Store the instance token for later use
        evolutionStatus: "connecting",
        isEvolutionActive: true,
      });

      return { success: true, qrCode };
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
    // Reconstruct the instance token from the instance name
    const instanceToken = `tok_${args.clinicId}`;

    try {
      // GET /instance/status — scoped to instance via token in apikey header
      const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/status`, {
        method: "GET",
        headers: { apikey: instanceToken },
      });

      // Instance doesn't exist (e.g. after server restart) — recreate it
      if (!statusRes.ok) {
        console.log(`Instance ${args.instanceName} not found (${statusRes.status}), recreating...`);

        const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: GLOBAL_API_KEY,
          },
          body: JSON.stringify({
            name: args.instanceName,
            token: instanceToken,
          }),
        });

        let isCreated = createRes.ok;
        let finalErrText = "";
        if (!isCreated) {
          finalErrText = await createRes.text();
          if (createRes.status === 409 || finalErrText.includes("already exists")) {
             console.log(`Instance ${args.instanceName} exists but needs correct token. Deleting and recreating...`);
             await fetch(`${EVOLUTION_API_URL}/instance/delete/${args.instanceName}`, {
                method: "DELETE",
                headers: { apikey: GLOBAL_API_KEY },
             }).catch(() => {});
             
             const retryRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: GLOBAL_API_KEY },
                body: JSON.stringify({ name: args.instanceName, token: instanceToken }),
             });
             if (retryRes.ok) isCreated = true;
             else {
               finalErrText = await retryRes.text();
               console.error("Failed to recreate instance on retry:", finalErrText);
             }
          } else {
             console.error("Failed to recreate instance:", finalErrText);
          }
        }

        if (!isCreated) {
          return { status: "error", message: `Failed to recreate WhatsApp instance. Error: ${finalErrText}` };
        }

        // Connect to get QR
        const webhookUrl = CONVEX_SITE_URL ? `${CONVEX_SITE_URL}/evolution-webhook` : undefined;
        const connectBody: Record<string, unknown> = { immediate: false, subscribe: ["MESSAGES_UPSERT"] };
        if (webhookUrl) connectBody.webhookUrl = webhookUrl;

        const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: instanceToken },
          body: JSON.stringify(connectBody),
        });

        if (connectRes.ok) {
          const connectWrapper = await connectRes.json();
          const d = connectWrapper.data || connectWrapper;
          const qr = d.Qrcode || d.qrcode?.base64 || d.base64 || d.qr;
          if (qr) return { status: "connecting", qrCode: qr };
        }

        // Try /instance/qr
        await new Promise(r => setTimeout(r, 1500));
        const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/qr`, {
          headers: { apikey: instanceToken },
        });
        if (qrRes.ok) {
          const qrWrapper = await qrRes.json();
          const qrData = qrWrapper.data || qrWrapper;
          const qr = qrData.Qrcode || qrData.qrcode?.base64 || qrData.base64 || qrData.qr;
          if (qr) return { status: "connecting", qrCode: qr };
        }

        return { status: "connecting" };
      }

      const data = await statusRes.json();
      const statusData = data.data || data.instance || data;
      let state = statusData.state || statusData.status;
      
      // Evolution Go v3 envelope mapping
      if (!state && statusData.Connected !== undefined) {
         if (statusData.LoggedIn) state = "open";
         else state = "connecting";
      }

      if (state === "open") {
        let ownerJid: string | undefined;
        try {
          const getRes = await fetch(`${EVOLUTION_API_URL}/instance/get/${instanceToken}`, {
            headers: { apikey: GLOBAL_API_KEY },
          });
          if (getRes.ok) {
            const instWrapper = await getRes.json();
            const inst = instWrapper.data || instWrapper;
            const jid = inst.ownerJid || inst.owner || inst.phone;
            if (jid) ownerJid = jid.split("@")[0];
          }
        } catch (err) {}

        await ctx.runMutation(internal.evolution.updateInstanceStatus, {
          clinicId: args.clinicId,
          evolutionStatus: "open",
          evolutionConnectedPhone: ownerJid,
        });
        return { status: "open" };
      }

      if (state && state !== "connecting") {
        await ctx.runMutation(internal.evolution.updateInstanceStatus, {
          clinicId: args.clinicId,
          evolutionStatus: state,
        });
      }

      // Fetch QR via GET /instance/qr (scoped by instance token)
      const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/qr`, {
        method: "GET",
        headers: { apikey: instanceToken },
      });

      if (qrRes.ok) {
        const qrWrapper = await qrRes.json();
        const qrData = qrWrapper.data || qrWrapper;
        const qr = qrData.Qrcode || qrData.qrcode?.base64 || qrData.base64 || qrData.qr;
        if (qr) return { status: "connecting", qrCode: qr };
      }

      return { status: state || "connecting" };
    } catch (e: any) {
      console.error("Evolution API unreachable", e);
      return { status: "error", message: `Evolution API server is unreachable: ${e.message}` };
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
    evolutionConnectedPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clinicId, {
      evolutionStatus: args.evolutionStatus,
      ...(args.evolutionConnectedPhone !== undefined ? { evolutionConnectedPhone: args.evolutionConnectedPhone } : {}),
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
      evolutionConnectedPhone: undefined,
      isEvolutionActive: false,
    });
  },
});

// ACTION: Properly disconnect and delete the instance on Evolution Go
export const disconnectIntegration = action({
  args: { clinicId: v.id("users"), instanceName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const instanceToken = `tok_${args.clinicId}`;

    try {
      if (args.instanceName) {
        // 1. Logout: DELETE /instance/logout — scoped to instance via token (or use GLOBAL_API_KEY with instance path if Evolution Go supports it)
        // If the token is wrong, this might fail, but we'll still try to delete it below.
        await fetch(`${EVOLUTION_API_URL}/instance/logout`, {
          method: "DELETE",
          headers: { apikey: instanceToken },
        }).catch(err => console.error("Logout failed:", err));

        // 2. Delete: DELETE /instance/delete/{instanceId} — Evolution Go accepts the instanceName here
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

// INTERNAL ACTION: Force reconnect a dropped instance socket
export const reconnectInstance = internalAction({
  args: { instanceName: v.string(), clinicId: v.optional(v.id("users")) },
  handler: async (_ctx, args) => {
    // Reconstruct token — instanceName is "clinic_{clinicId}"
    const instanceToken = args.clinicId
      ? `tok_${args.clinicId}`
      : args.instanceName.replace("clinic_", "tok_");
    try {
      // POST /instance/reconnect — scoped by token
      const res = await fetch(`${EVOLUTION_API_URL}/instance/reconnect`, {
        method: "POST",
        headers: { apikey: instanceToken },
      });
      const text = await res.text();
      console.log(`Reconnect attempt for ${args.instanceName}: status=${res.status}`, text.slice(0, 200));
      return res.ok;
    } catch (e) {
      console.error("Reconnect failed:", e);
      return false;
    }
  },
});
