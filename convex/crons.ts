import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send daily reminders for today's appointments at 2:00 AM UTC (5:00 AM Egypt time)
crons.daily(
  "daily patient reminders",
  { hourUTC: 2, minuteUTC: 0 },
  internal.whatsappAutomations.scheduleDailyReminders
);

// Check for missed appointments at 17:00 UTC
crons.daily(
  "missed appointments",
  { hourUTC: 17, minuteUTC: 0 },
  internal.whatsappAutomations.scheduleMissedAppointments
);

// Delete support chat messages older than 30 days at 3:00 AM UTC
crons.daily(
  "cleanup old support messages",
  { hourUTC: 3, minuteUTC: 0 },
  internal.support.deleteOldMessages
);

// Check for past due installments at 16:00 UTC (19:00 Egypt time)
crons.daily(
  "past due installments",
  { hourUTC: 16, minuteUTC: 0 },
  internal.whatsappAutomations.schedulePastDueInstallments
);

export default crons;
