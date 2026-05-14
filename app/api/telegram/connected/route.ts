import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;

/**
 * Called by the mini-app page (/telegram-connect) right after a successful
 * linkTelegram mutation, so the bot can send the doctor a confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const { telegramId, doctorName, clinicName } = await req.json();

    if (!telegramId) {
      return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
    }

    const text =
      `*Successfully Linked!*\n\n` +
      `Welcome Dr. *${doctorName}* 👋\n` +
      `Your clinic *${clinicName}* is now linked to Elliot.\n\n`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: "Markdown",
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Connected notification error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
