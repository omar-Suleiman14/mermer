export const runtime = "edge";
export const maxDuration = 30; // Max allowed for hobby/edge

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "IbnSinaElliotBot";

const convex = new ConvexHttpClient(CONVEX_URL);

// ─── Telegram helper ──────────────────────────────────────────────────────────

async function tgSend(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", ...extra }),
  });
}

async function tgSendTyping(chatId: number | string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

// ─── Function-calling tool definitions ───────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_all_patients",
      description:
        "Returns all patients registered under this doctor. Use when the doctor asks about their patients list, patient count, or wants to find a patient.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_queue",
      description:
        "Returns today's waiting room queue for this doctor, including patient names, positions, and scheduled times.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ─── Execute a tool call ──────────────────────────────────────────────────────

async function executeTool(toolName: string, doctorId: string): Promise<string> {
  try {
    if (toolName === "get_all_patients") {
      const patients = await convex.query(api.telegram.getPatientsForBot, {
        doctorId: doctorId as any,
      });
      if (!patients || patients.length === 0) return "No patients registered yet.";
      const lines = patients.map(
        (p: any, i: number) =>
          `${i + 1}. *${p.name}* — ${p.age} years old | 📞 ${p.phone}${p.chronicConditions?.length ? ` | ${p.chronicConditions.join(", ")}` : ""}`
      );
      return `Total Patients: *${patients.length}*\n\n${lines.join("\n")}`;
    }

    if (toolName === "get_today_queue") {
      const queue = await convex.query(api.telegram.getTodayQueueForBot, {
        doctorId: doctorId as any,
      });
      if (!queue || queue.length === 0) return "The queue is empty today.";
      const lines = queue.map(
        (q: any) => {
          let statusText = "⏳ Waiting";
          if (q.status === "in-progress") statusText = "🟢 In Progress";
          if (q.status === "done") statusText = "✅ Completed";
          return `${q.position}. *${q.patientName}* — ${statusText}${q.scheduledTime ? ` (${new Date(q.scheduledTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })})` : ""}`;
        }
      );
      return `Today's Queue (${queue.length} patients):\n\n${lines.join("\n")}`;
    }

    return "Unknown tool.";
  } catch (err) {
    console.error("Tool execution error:", err);
    return "An error occurred while fetching data.";
  }
}

// ─── Main OpenRouter chat call ────────────────────────────────────────────────

async function callAI(
  messages: any[],
  doctorContext: { name: string; clinicName: string }
): Promise<string> {
  const systemPrompt = `You are Elliot, an intelligent medical AI assistant dedicated to Dr. ${doctorContext.name} at ${doctorContext.clinicName}.
You help manage the clinic: patient lists, today's schedule, waiting room queue, and statistics.
Always reply strictly in English with a professional and concise tone. DO NOT use Arabic under any circumstances.
Use the available tools when needed to fetch real data from the system.
Do not invent data — if you cannot find information, use the appropriate tool.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ibnsina-alpha.vercel.app",
      "X-Title": "Ibn Sina – Elliot Bot",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-nano-12b-v2-vl:free",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenRouter error:", errText);
    throw new Error("OpenRouter request failed");
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice) throw new Error("No choice returned from OpenRouter");

  // If the model wants to call a tool
  if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls?.length) {
    return choice.message; // return the full message object for further processing
  }

  return choice.message?.content ?? "Sorry, I couldn't generate an answer.";
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;

    // Ignore non-text updates (stickers, photos, etc.)
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const telegramId = String(message.from.id);
    const text: string = message.text.trim();

    // ── /start command — prompt to connect ──────────────────────────────────
    if (text === "/start") {
      const connectUrl = `https://ibnsina-alpha.vercel.app/telegram-connect?tg_id=${telegramId}`;
      await tgSend(chatId, `👋 Welcome to *Elliot* — Ibn Sina's smart clinic assistant!\n\nTo get started, please connect your clinic:`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🏥 Connect Clinic",
                url: connectUrl,
              },
            ],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    // ── Look up linked doctor ─────────────────────────────────────────────────
    const doctor = await convex.query(api.telegram.getDoctorByTelegramId, { telegramId });

    if (!doctor) {
      const connectUrl = `https://ibnsina-alpha.vercel.app/telegram-connect?tg_id=${telegramId}`;
      await tgSend(chatId, `⚠️ Your account is not linked yet. Tap the button below to log in and connect your clinic:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Connect Clinic Account", url: connectUrl }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    // ── Shortcut commands (no LLM needed) ────────────────────────────────────
    if (text === "/patients" || text === "/patients@" + BOT_USERNAME) {
      await tgSendTyping(chatId);
      const result = await executeTool("get_all_patients", doctor._id.toString());
      await tgSend(chatId, result);
      return NextResponse.json({ ok: true });
    }

    if (text === "/queue" || text === "/queue@" + BOT_USERNAME) {
      await tgSendTyping(chatId);
      const result = await executeTool("get_today_queue", doctor._id.toString());
      await tgSend(chatId, result);
      return NextResponse.json({ ok: true });
    }

    if (text === "/help" || text === "/help@" + BOT_USERNAME) {
      await tgSend(
        chatId,
        `🤖 *Elliot — Your Smart Assistant*\n\n` +
          `Quick Commands:\n` +
          `• /patients — List of all patients\n` +
          `• /queue — Today's waiting queue\n` +
          `• /help — Show this message\n\n` +
          `Or simply type your question and Elliot will answer you directly 💬`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Show typing indicator ─────────────────────────────────────────────────
    await tgSendTyping(chatId);

    const doctorContext = { name: doctor.name, clinicName: doctor.clinicName };
    const messages: any[] = [{ role: "user", content: text }];

    // ── First AI call ─────────────────────────────────────────────────────────
    let aiResponse = await callAI(messages, doctorContext);

    // ── Handle tool calls in a loop (max 3 rounds) ────────────────────────────
    let rounds = 0;
    while (typeof aiResponse === "object" && aiResponse !== null && rounds < 3) {
      rounds++;
      const assistantMessage = aiResponse as any;
      messages.push(assistantMessage);

      const toolResults: any[] = [];
      for (const tc of assistantMessage.tool_calls) {
        await tgSendTyping(chatId);
        const result = await executeTool(tc.function.name, doctor._id.toString());
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }

      messages.push(...toolResults);
      aiResponse = await callAI(messages, doctorContext);
    }

    // ── Send final text response ──────────────────────────────────────────────
    const finalText = typeof aiResponse === "string" ? aiResponse : "Sorry, an unexpected error occurred.";
    await tgSend(chatId, finalText);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true }); // always 200 to Telegram
  }
}

export async function GET() {
  return NextResponse.json({ status: "Elliot webhook is live" });
}
