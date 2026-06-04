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
          if (text.toLowerCase().includes("confirm my appointment") || text.includes("تأكيد موعدي")) {
            const remoteJid = data.key.remoteJid; // e.g. "201012345678@s.whatsapp.net"
            let phone = remoteJid.split("@")[0];
            
            // Normalize phone back to match DB (e.g., 1012345678 instead of 201012345678)
            if (phone.startsWith("20")) {
              phone = phone.substring(2);
            }

            // Fire an internal mutation to confirm the pending appointment
            await ctx.runMutation(internal.appointments.confirmPendingAppointmentByPhone, {
              patientPhone: phone,
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
