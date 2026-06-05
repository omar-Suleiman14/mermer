import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/evolution-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();

      // Only process incoming messages
      if (payload.event === "messages.upsert") {
        const data = payload.data;
        const messageType = data.messageType;
        const fromMe = data.key.fromMe;
        
        // Ignore outbound messages
        if (!fromMe && (messageType === "conversation" || messageType === "extendedTextMessage")) {
          const text = data.message?.conversation || data.message?.extendedTextMessage?.text || "";
          
          // Check if it's an appointment confirmation message
          if (text.toLowerCase().includes("confirm") || text.includes("تأكيد") || text.includes("تاكيد")) {
            const remoteJid = data.key.remoteJid; // e.g. "201012345678@s.whatsapp.net"
            const rawPhone = remoteJid.split("@")[0]; // "201012345678"
            
            // Pass the raw international number — confirmPendingAppointmentByPhone handles matching
            await ctx.runMutation(internal.appointments.confirmPendingAppointmentByPhone, {
              patientPhone: rawPhone,
              instanceName: payload.instance
            });
          }
        }
      }

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Webhook processing error:", err);
      // Always return 200 to Evolution API to prevent retries of bad payloads
      return new Response("OK", { status: 200 });
    }
  }),
});

export default http;
