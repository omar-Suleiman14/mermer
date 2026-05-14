export const runtime = "edge";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "IbnSinaElliotBot";

const convex = new ConvexHttpClient(CONVEX_URL);

// ─── Telegram helpers ─────────────────────────────────────────────────────────

async function tgSend(chatId: number | string | undefined, text: string, extra: Record<string, unknown> = {}) {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", ...extra }),
  });
}

async function tgSendTyping(chatId: number | string | undefined) {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}



// ─── Tool definitions for OpenRouter (READ-ONLY) ─────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_today_queue",
      description: "Returns today's waiting room queue including patient names, positions, scheduled times, statuses, and queue IDs.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_patients",
      description: "Searches for a patient by name or phone number.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Name or phone number" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_patients",
      description: "Returns all patients registered under this doctor.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_analytics",
      description: "Returns clinic analytics: total patients, patients seen today, queue count, estimated revenue.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_schedule",
      description: "Returns today's scheduled visits/appointments.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ─── Execute a read-only tool and return result + extracted entity IDs ─────────

interface ToolExecResult {
  output: string;
}

async function executeTool(
  toolName: string,
  doctorId: Id<"users">,
  argsStr?: string
): Promise<ToolExecResult> {
  try {
    let toolArgs: Record<string, any> = {};
    if (argsStr) {
      try { toolArgs = JSON.parse(argsStr); } catch { /* ignore */ }
    }

    // ── get_today_queue ───────────────────────────────────────────────────
    if (toolName === "get_today_queue") {
      const queue = await convex.query(api.telegram.getTodayQueueForBot, { doctorId });
      if (!queue || queue.length === 0) return { output: "The queue is empty today." };

      const lines = queue.map((q: any) => {
        let s = "⏳ Waiting";
        if (q.status === "in-progress") s = "🟢 In Progress";
        if (q.status === "done") s = "✅ Completed";
        const time = q.scheduledTime
          ? ` (${new Date(q.scheduledTime).toLocaleTimeString("en-US", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" })})`
          : "";
        return `${q.position}. *${q.patientName}* (QueueID: \`${q.queueId}\`) — ${s}${time}`;
      });
      return { output: `Today's Queue (${queue.length} patients):\n\n${lines.join("\n")}` };
    }

    // ── search_patients ───────────────────────────────────────────────────
    if (toolName === "search_patients") {
      const results = await convex.query(api.telegram.searchPatientsForBot, {
        doctorId,
        query: toolArgs.query || "",
      });
      if (!results || results.length === 0)
        return { output: `No patients found matching "${toolArgs.query}".` };

      const lines = results.map(
        (p: any) => `- *${p.name}* (ID: \`${p.patientId}\`) | Phone: ${p.phone} | Age: ${p.age}`
      );
      return { output: `Found ${results.length} patients:\n${lines.join("\n")}` };
    }

    // ── get_all_patients ──────────────────────────────────────────────────
    if (toolName === "get_all_patients") {
      const patients = await convex.query(api.telegram.getPatientsForBot, { doctorId });
      if (!patients || patients.length === 0) return { output: "No patients registered yet." };

      const lines = patients.map(
        (p: any, i: number) =>
          `${i + 1}. *${p.name}* — ${p.age}y | 📞 ${p.phone}${p.chronicConditions?.length ? ` | ${p.chronicConditions.join(", ")}` : ""}`
      );
      return { output: `Total Patients: *${patients.length}*\n\n${lines.join("\n")}` };
    }

    // ── get_analytics ─────────────────────────────────────────────────────
    if (toolName === "get_analytics") {
      const stats = await convex.query(api.telegram.getAnalyticsBot, { doctorId });
      return {
        output: `📊 *Clinic Analytics:*\nTotal Registered Patients: ${stats.totalPatientsRegistered}\nPatients Seen Today: ${stats.patientsSeenToday}\nTotal Queue Today: ${stats.totalQueueToday}\nEstimated Revenue Today: ${stats.estimatedRevenueTodayEGP} EGP`,
      };
    }

    // ── get_today_schedule ────────────────────────────────────────────────
    if (toolName === "get_today_schedule") {
      const schedule = await convex.query(api.telegram.getTodayScheduleForBot, { doctorId });
      if (!schedule || schedule.length === 0) return { output: "No visits scheduled for today." };

      const lines = schedule.map((v: any) => {
        let s = "📅 Scheduled";
        if (v.status === "completed") s = "✅ Completed";
        if (v.status === "cancelled") s = "❌ Cancelled";
        if (v.status === "confirmed") s = "🟢 Confirmed";
        const time = new Date(v.date).toLocaleTimeString("en-US", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" });
        return `- *${v.patientName}* at ${time} — ${s}`;
      });
      return { output: `Today's Schedule (${schedule.length} visits):\n\n${lines.join("\n")}` };
    }

    return { output: "Unknown tool." };
  } catch (err: any) {
    console.error("Tool execution error:", err);
    return { output: `Error executing ${toolName}: ${err.message}` };
  }
}

// ─── Build system prompt with entity memory ───────────────────────────────────

function buildSystemPrompt(
  doctorCtx: { name: string; clinicName: string; workingHoursStart: number; workingHoursEnd: number; availableDays: string[]; slotDurationMinutes: number },
  contextData: string
): string {
  return `You are Elliot, an intelligent medical AI assistant dedicated to Dr. ${doctorCtx.name} at ${doctorCtx.clinicName}.
You help the doctor view clinic information: patient lists, today's schedule, waiting room queue, and statistics.
You are a READ-ONLY assistant. You can look up information but you CANNOT modify, add, remove, or reschedule anything.

Clinic Settings:
- Working Days: ${doctorCtx.availableDays.join(", ")}
- Working Hours: ${doctorCtx.workingHoursStart}:00 to ${doctorCtx.workingHoursEnd}:00
- Slot Duration: ${doctorCtx.slotDurationMinutes} minutes

CRITICAL RULES:
1. Always reply strictly in English. NEVER use Arabic.
2. You are READ-ONLY. If the user asks to add, remove, reschedule, mark done, or modify anything — politely tell them to use the Ibn Sina dashboard instead.
3. Use the REAL-TIME CLINIC DATA provided below to answer questions. Do not make up any information.
4. Keep your answers concise and directly to the point.
5. If the user asks about something not in the clinic data, say you don't have that information.
6. ONLY answer the user's specific question. Do not mention other sections of the clinic data unless explicitly asked (e.g. if asked about the schedule, do not mention the queue).

REAL-TIME CLINIC DATA:
${contextData}`;
}

// ─── OpenRouter AI call ───────────────────────────────────────────────────────

// Models to try in order — if one fails, fall back to the next
const AI_MODELS = [
  "nvidia/nemotron-nano-12b-v2-vl:free",
];

async function callAI(messages: any[]): Promise<any> {
  let lastError: Error | null = null;

  for (const model of AI_MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ibnsina-alpha.vercel.app",
          "X-Title": "Ibn Sina – Elliot Bot",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`OpenRouter error (${model}):`, response.status, errText);
        lastError = new Error(`OpenRouter ${model} failed (${response.status})`);
        continue; // try next model
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) {
        lastError = new Error(`No choice from ${model}`);
        continue;
      }

      // Check for tool calls — some models use finish_reason "tool_calls",
      // others put tool_calls on the message regardless of finish_reason
      if (choice.message?.tool_calls?.length) {
        return choice.message;
      }

      return choice.message?.content ?? "Sorry, I couldn't generate an answer.";
    } catch (err: any) {
      console.error(`callAI error (${model}):`, err.message);
      lastError = err;
      continue; // try next model
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("All AI models failed");
}


// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let chatId: number | string | undefined;
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    chatId = message.chat.id;
    const telegramId = String(message.from.id);
    const text: string = message.text.trim();

    // ── /start ────────────────────────────────────────────────────────────
    if (text === "/start") {
      const connectUrl = `https://ibnsina-alpha.vercel.app/telegram-connect?tg_id=${telegramId}`;
      await tgSend(chatId, `👋 Welcome to *Elliot* — Ibn Sina's smart clinic assistant!\n\nTo get started, please connect your clinic:`, {
        reply_markup: { inline_keyboard: [[{ text: "🏥 Connect Clinic", url: connectUrl }]] },
      });
      return NextResponse.json({ ok: true });
    }

    // ── Look up linked doctor ─────────────────────────────────────────────
    const doctor = await convex.query(api.telegram.getDoctorByTelegramId, { telegramId });
    if (!doctor) {
      const connectUrl = `https://ibnsina-alpha.vercel.app/telegram-connect?tg_id=${telegramId}`;
      await tgSend(chatId, `⚠️ Your account is not linked yet. Tap below to connect:`, {
        reply_markup: { inline_keyboard: [[{ text: "🔗 Connect Clinic Account", url: connectUrl }]] },
      });
      return NextResponse.json({ ok: true });
    }

    const doctorId = doctor._id;

    // ── Shortcut commands ─────────────────────────────────────────────────
    if (text === "/patients" || text === `/patients@${BOT_USERNAME}`) {
      await tgSendTyping(chatId);
      const r = await executeTool("get_all_patients", doctorId);
      await tgSend(chatId, r.output);
      return NextResponse.json({ ok: true });
    }
    if (text === "/queue" || text === `/queue@${BOT_USERNAME}`) {
      await tgSendTyping(chatId);
      const r = await executeTool("get_today_queue", doctorId);
      await tgSend(chatId, r.output);
      return NextResponse.json({ ok: true });
    }
    if (text === "/help" || text === `/help@${BOT_USERNAME}`) {
      await tgSend(chatId,
        `🤖 *Elliot — Your Smart Assistant*\n\nQuick Commands:\n• /patients — List of all patients\n• /queue — Today's waiting queue\n• /help — Show this message\n\nOr simply type your question and Elliot will answer you directly 💬`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Show typing ───────────────────────────────────────────────────────
    await tgSendTyping(chatId);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 1: Load conversation history + entity memory
    // ══════════════════════════════════════════════════════════════════════

    const [history, memory] = await Promise.all([
      convex.query(api.aiMemory.getConversationHistory, { telegramId }),
      convex.query(api.aiMemory.getMemory, { telegramId }),
    ]);

    // ══════════════════════════════════════════════════════════════════════
    // STEP 2: Build messages array with system prompt + history + new msg
    // ══════════════════════════════════════════════════════════════════════

    const doctorCtx = {
      name: doctor.name,
      clinicName: doctor.clinicName,
      workingHoursStart: doctor.workingHoursStart || 9,
      workingHoursEnd: doctor.workingHoursEnd || 17,
      availableDays: doctor.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      slotDurationMinutes: doctor.slotDurationMinutes || 30,
    };

    // ══════════════════════════════════════════════════════════════════════
    // STEP 4: Fetch real-time data to inject
    // ══════════════════════════════════════════════════════════════════════

    // Fetch queue, analytics, and basic patient list
    const [queueRes, analyticsRes, patientsRes, scheduleRes] = await Promise.all([
      executeTool("get_today_queue", doctorId),
      executeTool("get_analytics", doctorId),
      executeTool("get_all_patients", doctorId),
      executeTool("get_today_schedule", doctorId),
    ]);

    const contextData = `
--- TODAY'S QUEUE ---
${queueRes.output}

--- TODAY'S SCHEDULE (VISITS) ---
${scheduleRes.output}

--- CLINIC ANALYTICS ---
${analyticsRes.output}

--- ALL REGISTERED PATIENTS ---
${patientsRes.output}
`;

    const systemPrompt = buildSystemPrompt(doctorCtx, contextData);

    const historyMessages: any[] = history
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-10) // Keep context smaller
      .map((m: any) => ({ role: m.role, content: m.content }));

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: text },
    ];

    // ══════════════════════════════════════════════════════════════════════
    // STEP 5: AI call & Save
    // ══════════════════════════════════════════════════════════════════════

    await convex.mutation(api.aiMemory.saveMessage, {
      doctorId,
      telegramId,
      role: "user",
      content: text,
    });

    const aiResponse = await callAI(messages);
    const finalText = typeof aiResponse === "string" ? aiResponse : "Sorry, an unexpected error occurred.";

    await convex.mutation(api.aiMemory.saveMessage, {
      doctorId,
      telegramId,
      role: "assistant",
      content: finalText,
    });

    // ══════════════════════════════════════════════════════════════════════
    // STEP 6: Send reply
    // ══════════════════════════════════════════════════════════════════════

    await tgSend(chatId, finalText);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    // Always reply to the user so they know something went wrong
    if (chatId) {
      try {
        await tgSend(chatId, "⚠️ Sorry, I ran into an issue processing your message. Please try again in a moment.");
      } catch { /* best-effort fallback */ }
    }
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Elliot webhook is live" });
}
