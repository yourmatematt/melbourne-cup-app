import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusPillProps {
  label: string
  variant?: "default" | "active" | "drawing" | "completed" | "draft" | "cancelled"
  icon?: LucideIcon
  className?: string
}

const variantStyles = {
  default: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-green-100 text-green-700 border-green-200",
  drawing: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-purple-100 text-purple-700 border-purple-200",
  draft: "bg-orange-100 text-orange-700 border-orange-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
}

export function StatusPill({
  label,
  variant = "default",
  icon: Icon,
  className
}: StatusPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
        variantStyles[variant],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </div>
  )
}