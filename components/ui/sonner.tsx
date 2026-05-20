"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon } from "lucide-react"
import { IOSSpinner } from "@/components/ui/spinner"
import { useI18n } from "@/lib/i18n/client"

const Toaster = ({ position, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { dir } = useI18n()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={position || (dir === "rtl" ? "top-left" : "top-right")}
      dir={dir}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <IOSSpinner size={16} />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
