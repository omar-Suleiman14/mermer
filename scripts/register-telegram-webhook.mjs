#!/usr/bin/env node
/**
 * run once after deploying to Vercel:
 *   node scripts/register-telegram-webhook.mjs
 *
 * It tells Telegram to POST every incoming message to your Vercel URL.
 */

const TOKEN = process.env.TELEGRAM_TOKEN || "7955552026:AAFTXp5sNJ-NLo2kTr9xx-PTwiSHPChaIFA";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://ibnsina-alpha.vercel.app/api/telegram/webhook";

async function main() {
  console.log(`\n📡  Registering Telegram webhook…`);
  console.log(`    URL: ${WEBHOOK_URL}\n`);

  const res = await fetch(
    `https://api.telegram.org/bot${TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    }
  );

  const data = await res.json();

  if (data.ok) {
    console.log("✅  Webhook registered successfully!");
    console.log(`    Description: ${data.description}`);
  } else {
    console.error("❌  Failed to register webhook:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // Also verify
  const info = await fetch(`https://api.telegram.org/bot${TOKEN}/getWebhookInfo`).then(r => r.json());
  console.log("\n📋  Current webhook info:");
  console.log(`    URL:            ${info.result.url}`);
  console.log(`    Pending:        ${info.result.pending_update_count}`);
  console.log(`    Last error:     ${info.result.last_error_message ?? "none"}`);
}

main().catch(console.error);
