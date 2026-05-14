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
      if (!patients || patients.length === 0) return "لا يوجد مرضى مسجلون حتى الآن.";
      const lines = patients.map(
        (p: any, i: number) =>
          `${i + 1}. *${p.name}* — ${p.age} سنة | 📞 ${p.phone}${p.chronicConditions?.length ? ` | ${p.chronicConditions.join(", ")}` : ""}`
      );
      return `إجمالي المرضى: *${patients.length}*\n\n${lines.join("\n")}`;
    }

    if (toolName === "get_today_queue") {
      const queue = await convex.query(api.telegram.getTodayQueueForBot, {
        doctorId: doctorId as any,
      });
      if (!queue || queue.length === 0) return "قائمة الانتظار فارغة اليوم.";
      const lines = queue.map(
        (q: any) => {
          let statusText = "⏳ ينتظر";
          if (q.status === "in-progress") statusText = "🟢 جارٍ الكشف";
          if (q.status === "done") statusText = "✅ مكتمل";
          return `${q.position}. *${q.patientName}* — ${statusText}${q.scheduledTime ? ` (${new Date(q.scheduledTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })})` : ""}`;
        }
      );
      return `قائمة الانتظار اليوم (${queue.length} مريض):\n\n${lines.join("\n")}`;
    }

    return "أداة غير معروفة.";
  } catch (err) {
    console.error("Tool execution error:", err);
    return "حدث خطأ أثناء جلب البيانات.";
  }
}

// ─── Main OpenRouter chat call ────────────────────────────────────────────────

async function callAI(
  messages: any[],
  doctorContext: { name: string; clinicName: string }
): Promise<string> {
  const systemPrompt = `أنت إليوت، مساعد ذكاء اصطناعي طبي ذكي مخصص للدكتور ${doctorContext.name} في عيادة ${doctorContext.clinicName}.
أنت تساعده في إدارة العيادة: قوائم المرضى، جدول اليوم، قائمة الانتظار، والإحصائيات.
أجب دائماً بالعربية بأسلوب مهني ومختصر. استخدم الأدوات المتاحة عند الحاجة لجلب بيانات حقيقية من النظام.
لا تخترع بيانات — إذا لم تجد معلومة استخدم الأداة المناسبة.`;

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

  return choice.message?.content ?? "عذراً، لم أتمكن من الإجابة.";
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
      await tgSend(chatId, `👋 أهلاً بك في *إليوت* — مساعد عيادة ابن سينا الذكي!\n\nللبدء، اربط حسابك بالعيادة:`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "ربط عيادتك",
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
      await tgSend(chatId, `⚠️ لم يتم ربط حسابك بعد. اضغط على الزر أدناه لتسجيل الدخول وربط عيادتك:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 ربط حساب العيادة", url: connectUrl }],
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
        `🤖 *إليوت — مساعدك الذكي*\n\n` +
          `الأوامر السريعة:\n` +
          `• /patients — قائمة جميع المرضى\n` +
          `• /queue — قائمة الانتظار اليوم\n` +
          `• /help — هذه الرسالة\n\n` +
          `أو ببساطة اكتب سؤالك وسيجيبك إليوت مباشرة 💬`
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
    const finalText = typeof aiResponse === "string" ? aiResponse : "عذراً، حدث خطأ غير متوقع.";
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
