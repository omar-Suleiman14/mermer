import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/whatsapp-confirm
 * Body: { patientPhone, patientName, doctorName, clinicName, dateStr, customMessage }
 *
 * Sends a WhatsApp confirmation through the Meta Cloud API.
 */

const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "711047555428726";
const MAX_MESSAGE_LENGTH = 1000;

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function formatEgyptPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^1[0125]\d{8}$/.test(digits)) return null;
  return `20${digits}`;
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return jsonError("Unauthorized", 401);

  if (req.headers.get("content-type") !== "application/json") {
    return jsonError("Unsupported Media Type", 415);
  }

  const waToken = process.env.WHATSAPP_BUSINESS_API;
  if (!waToken) {
    return jsonError("WhatsApp integration is not configured", 503);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const patientPhone = cleanText(body.patientPhone, 40);
  const patientName = cleanText(body.patientName, 100);
  const doctorName = cleanText(body.doctorName, 100);
  const clinicName = cleanText(body.clinicName, 120);
  const dateStr = cleanText(body.dateStr, 120);

  if (!patientPhone || !patientName || !doctorName || !dateStr) {
    return jsonError("Missing fields", 400);
  }

  const to = formatEgyptPhone(patientPhone);
  if (!to) return jsonError("Invalid phone number", 400);

  const defaultClinicName =
    clinicName || `\u0639\u064a\u0627\u062f\u0629 \u0627\u0644\u062f\u0643\u062a\u0648\u0631 ${doctorName}`;
  const defaultMessage =
    `\u0645\u0631\u062d\u0628\u0627\u064b ${patientName}\u060c ` +
    `\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0645\u0648\u0639\u062f\u0643 \u0641\u064a *${defaultClinicName}* ` +
    `\u0645\u0639 *\u0627\u0644\u062f\u0643\u062a\u0648\u0631 ${doctorName}* ` +
    `\u0628\u062a\u0627\u0631\u064a\u062e *${dateStr}*. \u0646\u0631\u0627\u0643 \u0642\u0631\u064a\u0628\u0627\u064b.`;
  const customMessage = cleanText(body.customMessage, MAX_MESSAGE_LENGTH);
  const message = customMessage || defaultMessage;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${waToken}`,
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

    if (!res.ok) {
      let responseBody: unknown = null;
      try {
        responseBody = await res.json();
      } catch {
        responseBody = res.status;
      }
      console.error("WhatsApp API error:", responseBody);
      return jsonError("WhatsApp send failed", 502);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("WhatsApp route error:", err instanceof Error ? err.message : err);
    return jsonError("Server error", 500);
  }
}
