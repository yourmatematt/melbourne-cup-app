'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Calendar,
  Settings
} from 'lucide-react'

interface SidebarItemProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive?: boolean
}

function SidebarItem({ href, icon: Icon, label, isActive }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
        isActive
          ? "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white shadow-lg"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  const navigationItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard'
    },
    {
      href: '/dashboard/events',
      icon: Calendar,
      label: 'Events'
    },
    {
      href: '/dashboard/settings',
      icon: Settings,
      label: 'Venue Settings'
    }
  ]

  return (
    <div className="bg-[#f8f7f4] min-h-screen">
      {/* New Sidebar - Figma Design */}
      <div className="bg-white border-r border-[rgba(0,0,0,0.08)] w-[256px] fixed left-0 top-0 bottom-0 z-30">
        {/* Brand Header */}
        <div className="h-[89px] border-b border-[rgba(0,0,0,0.08)] p-6">
          <div className="flex items-center gap-2">
            {/* Brand Logo */}
            <div className="w-8 h-8 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-lg"></div>

            {/* Brand Text */}
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-6">
                MelbourneCupSweep
              </h2>
              <p className="text-xs text-slate-600 leading-4">
                Admin Dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4 space-y-2">
          {navigationItems.map((item, index) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={`nav-${index}-${item.href}`}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all duration-200 relative
                  ${isActive
                    ? 'bg-gradient-to-r from-orange-50 to-pink-50 text-slate-900 font-semibold shadow-sm border-l-4 border-[#ff8a00]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:shadow-sm'
                  }
                `}
              >
                <item.icon className={`h-5 w-5 transition-colors duration-200 ${
                  isActive ? 'text-[#ff8a00]' : 'text-slate-500'
                }`} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Footer */}
        <div className="h-[49px] border-t border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-xs text-slate-600 leading-4">
            © 2025 MelbourneCupSweep
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-[256px]">
        {children}
      </div>
    </div>
  )
}