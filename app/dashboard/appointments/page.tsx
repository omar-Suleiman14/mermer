import { redirect } from "next/navigation";

// Appointments route removed from nav; online bookings live on the queue.
export default function AppointmentsPage() {
  redirect("/dashboard");
}
