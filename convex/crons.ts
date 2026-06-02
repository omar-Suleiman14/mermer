import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send daily reminders for today's appointments at 5:00 AM UTC (adjust if needed)
crons.daily(
  "daily patient reminders",
  { hourUTC: 5, minuteUTC: 0 },
  internal.whatsappAutomations.scheduleDailyReminders
);

// Check for missed appointments at 17:00 UTC
crons.daily(
  "missed appointments",
  { hourUTC: 17, minuteUTC: 0 },
  internal.whatsappAutomations.scheduleMissedAppointments
);

export default crons;
