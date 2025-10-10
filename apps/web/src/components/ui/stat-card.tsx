import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-[20px] p-6 flex justify-between items-start shadow-sm",
        className
      )}
    >
      <div className="flex flex-col space-y-1">
        <p className="text-sm text-slate-600 font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      <div className="p-2 rounded-[20px] bg-gray-50">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
    </div>
  )
}