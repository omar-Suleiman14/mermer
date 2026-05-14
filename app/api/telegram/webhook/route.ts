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
        "Returns all patients registered under this doctor. Use when the doctor asks about their patients list.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_queue",
      description:
        "Returns today's waiting room queue for this doctor, including patient names, positions, scheduled times, and their queue IDs.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_patients",
      description:
        "Searches for a patient by name or phone number. Use this BEFORE making any changes (like adding to queue) to get the correct patientId. Ask the user to confirm if multiple patients match.",
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
      name: "add_patient_to_queue",
      description:
        "Adds a patient to today's queue. Requires the exact patientId from search_patients. You can optionally specify a time.",
      parameters: {
        type: "object",
        properties: { 
          patientId: { type: "string" },
          time: { type: "string", description: "Optional time (e.g. '16:00' or '4:30 PM')" }
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_queue_done",
      description:
        "Marks a patient's appointment as completed. Requires the exact queueId from get_today_queue.",
      parameters: {
        type: "object",
        properties: { queueId: { type: "string" } },
        required: ["queueId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_queue_time",
      description:
        "Updates the scheduled time for a patient already in today's queue. Requires the exact queueId from get_today_queue.",
      parameters: {
        type: "object",
        properties: { 
          queueId: { type: "string" },
          time: { type: "string", description: "The new time (e.g. '16:00' or '4:30 PM')" }
        },
        required: ["queueId", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_from_queue",
      description:
        "Removes or deletes a patient from today's queue. Requires the exact queueId from get_today_queue.",
      parameters: {
        type: "object",
        properties: { queueId: { type: "string" } },
        required: ["queueId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_analytics",
      description:
        "Returns basic clinic analytics like total patients, patients seen today, and estimated revenue.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ─── Execute a tool call ──────────────────────────────────────────────────────

async function executeTool(toolName: string, doctorId: string, argsStr?: string): Promise<string> {
  try {
    let toolArgs: any = {};
    if (argsStr) {
      try {
        toolArgs = JSON.parse(argsStr);
      } catch (e) {
        console.error("Failed to parse tool args", argsStr);
      }
    }

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
          return `${q.position}. *${q.patientName}* (QueueID: \`${q.queueId}\`) — ${statusText}${q.scheduledTime ? ` (${new Date(q.scheduledTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })})` : ""}`;
        }
      );
      return `Today's Queue (${queue.length} patients):\n\n${lines.join("\n")}`;
    }

    if (toolName === "search_patients") {
      const results = await convex.query(api.telegram.searchPatientsForBot, {
        doctorId: doctorId as any,
        query: toolArgs.query || "",
      });
      if (!results || results.length === 0) return `No patients found matching "${toolArgs.query}".`;
      const lines = results.map(
        (p: any) => `- *${p.name}* (ID: \`${p.patientId}\`) | Phone: ${p.phone} | Age: ${p.age}`
      );
      return `Found ${results.length} patients:\n${lines.join("\n")}`;
    }

    if (toolName === "add_patient_to_queue") {
      if (!toolArgs.patientId) return "Error: patientId is required.";
      
      let scheduledTime: number | undefined = undefined;
      if (toolArgs.time) {
        // Simple attempt to parse time string into today's timestamp
        try {
          const now = new Date();
          const match = toolArgs.time.match(/(\d+):(\d+)\s*(am|pm)?/i);
          if (match) {
            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const ampm = match[3]?.toLowerCase();
            if (ampm === "pm" && hours < 12) hours += 12;
            if (ampm === "am" && hours === 12) hours = 0;
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
            scheduledTime = d.getTime();
          }
        } catch (e) {
          console.error("Time parsing failed", e);
        }
      }

      const res = await convex.mutation(api.telegram.addPatientToQueueBot, {
        doctorId: doctorId as any,
        patientId: toolArgs.patientId as any,
        scheduledTime: scheduledTime as any,
      });
      return res.message;
    }

    if (toolName === "mark_queue_done") {
      if (!toolArgs.queueId) return "Error: queueId is required.";
      const res = await convex.mutation(api.telegram.markQueueDoneBot, {
        doctorId: doctorId as any,
        queueId: toolArgs.queueId as any,
      });
      return res.message;
    }

    if (toolName === "update_queue_time") {
      if (!toolArgs.queueId) return "Error: queueId is required.";
      if (!toolArgs.time) return "Error: time is required.";
      
      let scheduledTime: number | undefined = undefined;
      try {
        const now = new Date();
        const match = toolArgs.time.match(/(\d+):(\d+)\s*(am|pm)?/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = match[3]?.toLowerCase();
          if (ampm === "pm" && hours < 12) hours += 12;
          if (ampm === "am" && hours === 12) hours = 0;
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
          scheduledTime = d.getTime();
        }
      } catch (e) {
        console.error("Time parsing failed", e);
      }
      
      if (!scheduledTime) return "Error: Could not parse time.";

      const res = await convex.mutation(api.telegram.updateQueueTimeBot, {
        doctorId: doctorId as any,
        queueId: toolArgs.queueId as any,
        scheduledTime: scheduledTime as any,
      });
      return res.message;
    }

    if (toolName === "remove_from_queue") {
      if (!toolArgs.queueId) return "Error: queueId is required.";
      const res = await convex.mutation(api.telegram.removeFromQueueBot, {
        doctorId: doctorId as any,
        queueId: toolArgs.queueId as any,
      });
      return res.message;
    }

    if (toolName === "get_analytics") {
      const stats = await convex.query(api.telegram.getAnalyticsBot, {
        doctorId: doctorId as any,
      });
      return `📊 *Clinic Analytics:*\nTotal Registered Patients: ${stats.totalPatientsRegistered}\nPatients Seen Today: ${stats.patientsSeenToday}\nTotal Queue Today: ${stats.totalQueueToday}\nEstimated Revenue Today: ${stats.estimatedRevenueTodayEGP} EGP`;
    }

    return "Unknown tool.";
  } catch (err: any) {
    console.error("Tool execution error:", err);
    return `An error occurred while executing ${toolName}: ${err.message}`;
  }
}

// ─── Main OpenRouter chat call ────────────────────────────────────────────────

async function callAI(
  messages: any[],
  doctorContext: { 
    name: string; 
    clinicName: string;
    workingHoursStart: number;
    workingHoursEnd: number;
    availableDays: string[];
    slotDurationMinutes: number;
  }
): Promise<string> {
  const systemPrompt = `You are Elliot, an intelligent medical AI assistant dedicated to Dr. ${doctorContext.name} at ${doctorContext.clinicName}.
You help manage the clinic: patient lists, today's schedule, waiting room queue, and statistics.
Clinic Settings:
- Working Days: ${doctorContext.availableDays.join(", ")}
- Working Hours: ${doctorContext.workingHoursStart}:00 to ${doctorContext.workingHoursEnd}:00
- Slot Duration: ${doctorContext.slotDurationMinutes} minutes.

Always reply strictly in English with a professional and concise tone. DO NOT use Arabic under any circumstances.
Use the available tools when needed to fetch real data from the system.
CRITICAL INSTRUCTION 1: If you need to mutate data (like adding a patient to the queue), FIRST use search_patients to find them. If multiple patients match, you MUST ask the user which one they mean before proceeding. Never guess. Always ask for confirmation before changing data if there is ambiguity.
CRITICAL INSTRUCTION 2: NEVER modify, re-type, or hallucinate database IDs (like patientId or queueId). ALWAYS copy them EXACTLY character-by-character from the tool response. Even one wrong character will break the system.
CRITICAL INSTRUCTION 3: Before scheduling or adding someone to the queue at a specific time, you MUST ensure the time is within the clinic's working hours. If the user asks for a time outside working hours, inform them and ask for another time.
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

    const doctorContext = { 
      name: doctor.name, 
      clinicName: doctor.clinicName,
      workingHoursStart: doctor.workingHoursStart || 9,
      workingHoursEnd: doctor.workingHoursEnd || 17,
      availableDays: doctor.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      slotDurationMinutes: doctor.slotDurationMinutes || 30
    };
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
        const result = await executeTool(tc.function.name, doctor._id.toString(), tc.function.arguments);
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
