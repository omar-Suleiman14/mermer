import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/whatsapp-confirm
 * Body: { patientPhone: string, patientName: string, doctorName: string, clinicName: string, dateStr: string }
 *
 * Sends a WhatsApp message to the patient confirming their appointment
 * using the Meta Cloud API (WhatsApp Business API).
 */

const WA_TOKEN = process.env.WHATSAPP_BUSINESS_API!;
// Your Meta WhatsApp Business Phone Number ID — set in Convex env or here
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "711047555428726";

function formatEgyptPhone(raw: string): string {
  // Strip spaces, dashes, +
  let num = raw.replace(/[\s\-\(\)]/g, "");
  if (num.startsWith("+")) num = num.slice(1);
  // Already has country code
  if (num.startsWith("20")) return num;
  // Egyptian local number starting with 0
  if (num.startsWith("0")) return "20" + num.slice(1);
  // Bare number (e.g. 1035555282)
  return "20" + num;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientPhone, patientName, doctorName, clinicName, dateStr, customMessage } = body;

    if (!patientPhone || !patientName || !doctorName || !dateStr) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const to = formatEgyptPhone(patientPhone);

    const message = customMessage ??
      `Hello ${patientName}! ✅ Your appointment at *${clinicName ?? doctorName + "'s clinic"}* with *Dr. ${doctorName}* is confirmed for *${dateStr}*. See you soon! 🏥`;

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("WhatsApp API error:", data);
      return NextResponse.json(
        { error: data?.error?.message ?? "WhatsApp send failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("WhatsApp route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
