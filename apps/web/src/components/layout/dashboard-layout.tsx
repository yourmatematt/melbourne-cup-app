'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Palette,
  LayoutDashboard,
  Calendar,
  Play,
  TrendingUp,
  Settings,
  Gauge
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
      label: 'Home'
    },
    {
      href: '/design-system',
      icon: Palette,
      label: 'Design System'
    },
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard'
    },
    {
      href: '/dashboard/events',
      icon: Calendar,
      label: 'Events'
    }
  ]

  const bottomItems = [
    {
      href: '/dashboard/analytics',
      icon: Gauge,
      label: 'Analytics'
    },
    {
      href: '/dashboard/settings',
      icon: Settings,
      label: 'Settings'
    }
  ]

  return (
    <div className="bg-[#f8f7f4] min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 h-[69px] fixed top-0 left-0 right-0 z-40">
        <div className="h-full flex items-center justify-between px-48">
          <div className="h-8 w-42 bg-gray-200 rounded"></div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings">
              <button className="bg-[#f8f7f4] border border-gray-200 h-9 px-4 rounded-xl flex items-center gap-2 text-sm text-slate-900">
                <Settings className="h-4 w-4" />
                Edit Venue Settings
              </button>
            </Link>
            <Link href="/dashboard/events/new">
              <button className="bg-slate-900 h-9 px-4 rounded-xl flex items-center gap-2 text-sm text-white shadow-lg">
                <Calendar className="h-4 w-4" />
                New Event
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="bg-white border-r border-gray-200 w-64 fixed left-0 top-[69px] bottom-0 z-30">
        <div className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={item.label === 'Dashboard' && pathname === '/dashboard'}
            />
          ))}

          <div className="border-t border-gray-200 pt-4 mt-4">
            {bottomItems.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>

        {/* Design Tokens Card */}
        <div className="absolute bottom-6 left-6 right-6 bg-white border border-gray-200 rounded-[20px] p-4">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Design Tokens</h4>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-slate-600 mb-1">Brand Gradient:</p>
              <div className="h-3 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 rounded-full"></div>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <div className="h-8 bg-green-500 rounded-[20px]"></div>
              <div className="h-8 bg-blue-500 rounded-[20px]"></div>
              <div className="h-8 bg-amber-500 rounded-[20px]"></div>
              <div className="h-8 bg-red-500 rounded-[20px]"></div>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-3">
              <p className="text-sm text-slate-600">
                Radius: 20px | Shadows: Soft | Type: Inter
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 pt-[69px]">
        {children}
      </div>

      {/* Toast Notification */}
      <div className="fixed top-6 right-6 bg-white border border-gray-200 rounded-[20px] p-4 shadow-lg w-96 z-50">
        <div className="flex items-start gap-3">
          <div className="bg-green-100 rounded-[20px] p-1.5">
            <div className="h-4 w-4 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              Connected — Real-time updates are active
            </p>
            <p className="text-sm text-slate-600">
              All participants will see draws instantly
            </p>
            <p className="text-xs text-slate-600 mt-1">
              7:20:56 PM
            </p>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}