import { redirect } from "next/navigation";

// Appointments page has been removed.
// Online bookings now appear directly in the queue with a "source" badge.
export default function AppointmentsPage() {
  redirect("/dashboard");
}
