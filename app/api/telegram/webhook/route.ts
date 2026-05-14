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
];

// ─── Execute a read-only tool and return result + extracted entity IDs ─────────

interface ToolExecResult {
  output: string;
  entities: {
    lastPatientId?: Id<"patients">;
    lastQueueId?: Id<"queue">;
  };
}

async function executeTool(
  toolName: string,
  doctorId: Id<"users">,
  argsStr?: string
): Promise<ToolExecResult> {
  const empty: ToolExecResult["entities"] = {};
  try {
    let toolArgs: Record<string, any> = {};
    if (argsStr) {
      try { toolArgs = JSON.parse(argsStr); } catch { /* ignore */ }
    }

    // ── get_today_queue ───────────────────────────────────────────────────
    if (toolName === "get_today_queue") {
      const queue = await convex.query(api.telegram.getTodayQueueForBot, { doctorId });
      if (!queue || queue.length === 0) return { output: "The queue is empty today.", entities: empty };

      const entities: ToolExecResult["entities"] = {};
      if (queue.length > 0) {
        entities.lastQueueId = queue[0].queueId as Id<"queue">;
      }

      const lines = queue.map((q: any) => {
        let s = "⏳ Waiting";
        if (q.status === "in-progress") s = "🟢 In Progress";
        if (q.status === "done") s = "✅ Completed";
        const time = q.scheduledTime
          ? ` (${new Date(q.scheduledTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })})`
          : "";
        return `${q.position}. *${q.patientName}* (QueueID: \`${q.queueId}\`) — ${s}${time}`;
      });
      return { output: `Today's Queue (${queue.length} patients):\n\n${lines.join("\n")}`, entities };
    }

    // ── search_patients ───────────────────────────────────────────────────
    if (toolName === "search_patients") {
      const results = await convex.query(api.telegram.searchPatientsForBot, {
        doctorId,
        query: toolArgs.query || "",
      });
      if (!results || results.length === 0)
        return { output: `No patients found matching "${toolArgs.query}".`, entities: empty };

      const entities: ToolExecResult["entities"] = {};
      if (results.length === 1) {
        entities.lastPatientId = results[0].patientId as Id<"patients">;
      }

      const lines = results.map(
        (p: any) => `- *${p.name}* (ID: \`${p.patientId}\`) | Phone: ${p.phone} | Age: ${p.age}`
      );
      return { output: `Found ${results.length} patients:\n${lines.join("\n")}`, entities };
    }

    // ── get_all_patients ──────────────────────────────────────────────────
    if (toolName === "get_all_patients") {
      const patients = await convex.query(api.telegram.getPatientsForBot, { doctorId });
      if (!patients || patients.length === 0) return { output: "No patients registered yet.", entities: empty };

      const entities: ToolExecResult["entities"] = {};
      if (patients.length > 0) {
        entities.lastPatientId = patients[0].id as Id<"patients">;
      }

      const lines = patients.map(
        (p: any, i: number) =>
          `${i + 1}. *${p.name}* — ${p.age}y | 📞 ${p.phone}${p.chronicConditions?.length ? ` | ${p.chronicConditions.join(", ")}` : ""}`
      );
      return { output: `Total Patients: *${patients.length}*\n\n${lines.join("\n")}`, entities };
    }

    // ── get_analytics ─────────────────────────────────────────────────────
    if (toolName === "get_analytics") {
      const stats = await convex.query(api.telegram.getAnalyticsBot, { doctorId });
      return {
        output: `📊 *Clinic Analytics:*\nTotal Registered Patients: ${stats.totalPatientsRegistered}\nPatients Seen Today: ${stats.patientsSeenToday}\nTotal Queue Today: ${stats.totalQueueToday}\nEstimated Revenue Today: ${stats.estimatedRevenueTodayEGP} EGP`,
        entities: empty,
      };
    }

    return { output: "Unknown tool.", entities: empty };
  } catch (err: any) {
    console.error("Tool execution error:", err);
    return { output: `Error executing ${toolName}: ${err.message}`, entities: empty };
  }
}

// ─── Build system prompt with entity memory ───────────────────────────────────

function buildSystemPrompt(
  doctorCtx: { name: string; clinicName: string; workingHoursStart: number; workingHoursEnd: number; availableDays: string[]; slotDurationMinutes: number },
  memory: { lastPatientId?: string; lastQueueId?: string } | null
): string {
  let memoryBlock = "";
  if (memory) {
    const parts: string[] = [];
    if (memory.lastPatientId) parts.push(`lastPatientId: ${memory.lastPatientId}`);
    if (memory.lastQueueId) parts.push(`lastQueueId: ${memory.lastQueueId}`);
    if (parts.length > 0) {
      memoryBlock = `\n\nLAST KNOWN ENTITIES:\n${parts.join("\n")}\n\nIf the user says "him", "her", "this patient", "that one" — assume they refer to these entities. Use the IDs directly.`;
    }
  }

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
3. NEVER invent or hallucinate database IDs. Copy them EXACTLY from tool responses.
4. If a tool fails, explain the exact failure. Never hallucinate success.
5. If multiple patients match a search, list them all.
6. Always prefer existing tool functions over text-based answers.
7. If the user refers to "that patient" or "him/her", use the entity memory below.${memoryBlock}`;
}

// ─── OpenRouter AI call ───────────────────────────────────────────────────────

async function callAI(messages: any[]): Promise<any> {
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
      messages,
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

  if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls?.length) {
    return choice.message; // full message object with tool_calls
  }

  return choice.message?.content ?? "Sorry, I couldn't generate an answer.";
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message?.text) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
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

    const systemPrompt = buildSystemPrompt(doctorCtx, memory as any);

    // Convert stored history to OpenAI message format.
    // Only include user + assistant text messages — tool messages require
    // matching tool_calls structures we don't persist, so they'd break the API.
    const historyMessages: any[] = history
      .filter((m: any) => (m.role === "user" || m.role === "assistant") && m.content && !m.content.startsWith("[tool_calls:"))
      .map((m: any) => ({ role: m.role, content: m.content }));

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: text },
    ];

    // ══════════════════════════════════════════════════════════════════════
    // STEP 3: Save user message to conversation history
    // ══════════════════════════════════════════════════════════════════════

    await convex.mutation(api.aiMemory.saveMessage, {
      doctorId,
      telegramId,
      role: "user",
      content: text,
    });

    // ══════════════════════════════════════════════════════════════════════
    // STEP 4: AI call loop with REAL tool execution + verification
    // ══════════════════════════════════════════════════════════════════════

    let aiResponse = await callAI(messages);
    let rounds = 0;
    const collectedEntities: ToolExecResult["entities"] = {};

    while (typeof aiResponse === "object" && aiResponse !== null && rounds < 5) {
      rounds++;
      const assistantMessage = aiResponse as any;
      messages.push(assistantMessage);

      // Save assistant tool-call message
      await convex.mutation(api.aiMemory.saveMessage, {
        doctorId,
        telegramId,
        role: "assistant",
        content: assistantMessage.content || `[tool_calls: ${assistantMessage.tool_calls.map((tc: any) => tc.function.name).join(", ")}]`,
      });

      const toolResults: any[] = [];

      for (const tc of assistantMessage.tool_calls) {
        await tgSendTyping(chatId);

        // REAL execution with verification
        const result = await executeTool(tc.function.name, doctorId, tc.function.arguments);

        // Collect entities from tool results
        if (result.entities.lastPatientId) collectedEntities.lastPatientId = result.entities.lastPatientId;
        if (result.entities.lastQueueId) collectedEntities.lastQueueId = result.entities.lastQueueId;

        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result.output,
        });

        // Save tool result to conversation history
        await convex.mutation(api.aiMemory.saveMessage, {
          doctorId,
          telegramId,
          role: "tool",
          content: result.output,
          toolName: tc.id,
          toolResult: result.output,
        });

        // Log failures
        if (result.output.startsWith("Error") || result.output.startsWith("WARNING")) {
          await convex.mutation(api.aiMemory.saveFailure, {
            doctorId,
            telegramId,
            userMessage: text,
            aiResponse: `Tool: ${tc.function.name}, Args: ${tc.function.arguments}`,
            intendedAction: tc.function.name,
            failureReason: result.output,
          });
        }
      }

      messages.push(...toolResults);
      aiResponse = await callAI(messages);
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 5: Save final response + update entity memory
    // ══════════════════════════════════════════════════════════════════════

    const finalText = typeof aiResponse === "string" ? aiResponse : "Sorry, an unexpected error occurred.";

    // Save assistant final response
    await convex.mutation(api.aiMemory.saveMessage, {
      doctorId,
      telegramId,
      role: "assistant",
      content: finalText,
    });

    // Update entity memory if we collected any entities
    if (collectedEntities.lastPatientId || collectedEntities.lastQueueId) {
      await convex.mutation(api.aiMemory.updateMemory, {
        doctorId,
        telegramId,
        ...(collectedEntities.lastPatientId && { lastPatientId: collectedEntities.lastPatientId }),
        ...(collectedEntities.lastQueueId && { lastQueueId: collectedEntities.lastQueueId }),
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // STEP 6: Send reply
    // ══════════════════════════════════════════════════════════════════════

    await tgSend(chatId, finalText);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Elliot webhook is live" });
}
