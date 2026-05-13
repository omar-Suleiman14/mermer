"use client";

import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export default function SignInPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#007AFF]">
            Ibn Sina
          </h1>
          <p className="text-sm text-[#6b6a63] mt-2">Welcome back, Doctor.</p>
        </div>
        <SignIn
          fallbackRedirectUrl="/dashboard"
          appearance={{
            baseTheme: theme === "dark" ? dark : undefined,
            elements: {
              rootBox: "w-full",
              card: "bg-card shadow-sm border border-border rounded-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "rounded-lg border border-border bg-card hover:bg-muted transition-colors",
              formButtonPrimary: "bg-[#007AFF] hover:bg-[#0062cc] text-white rounded-lg transition-colors",
              formFieldInput: "rounded-lg border-input bg-background focus:ring-[#007AFF]",
              footerActionLink: "text-[#007AFF] hover:text-[#0062cc]",
            },
          }}
        />
      </div>
    </div>
  );
}
