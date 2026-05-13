import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinic Queue Display",
};

export default function QueueDisplayLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
