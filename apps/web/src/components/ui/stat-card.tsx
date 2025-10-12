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
        "bg-white border border-[rgba(0,0,0,0.08)] rounded-[20px] pt-[25px] pb-[1px] px-[25px] flex justify-between items-start",
        className
      )}
    >
      <div className="flex flex-col gap-1 flex-1 h-[84px]">
        <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">{title}</p>
        <h3 className="text-[30px] leading-[36px] font-['Arial:Bold',_sans-serif] text-slate-900 font-bold">{value}</h3>
        <p className="text-[14px] leading-[20px] text-slate-600 font-['Arial:Regular',_sans-serif]">{subtitle}</p>
      </div>
      <div className="w-[36px] h-[36px] rounded-[20px] flex items-center justify-center pt-2 px-2 pb-0">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}