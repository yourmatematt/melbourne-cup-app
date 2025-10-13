'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Home,
  Calendar,
  Settings,
  ChevronDown,
  LogOut
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
  const router = useRouter()
  const supabase = createClient()

  const [showVenueDropdown, setShowVenueDropdown] = useState(false)
  const venueDropdownRef = useRef<HTMLDivElement>(null)

  // Check if we're on event wizard pages
  const isEventWizardOpen = pathname === '/dashboard/events/new' || pathname === '/dashboard/events/create'

  // Handle click outside venue dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(event.target as Node)) {
        setShowVenueDropdown(false)
      }
    }

    if (showVenueDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showVenueDropdown])

  async function handleSignOut() {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navigationItems = [
    {
      href: '/dashboard',
      icon: Home,
      label: 'Dashboard'
    },
    {
      href: '/dashboard/settings',
      icon: Settings,
      label: 'Venue Settings'
    }
  ]

  return (
    <div className="bg-[#f8f7f4] min-h-screen">
      {/* Fixed Venue Button - Top Right */}
      {!isEventWizardOpen && (
        <div className="fixed top-6 right-6 z-50" ref={venueDropdownRef}>
          <button
            onClick={() => setShowVenueDropdown(!showVenueDropdown)}
            className="bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)] rounded-[8px] px-[17px] py-[1px] flex items-center gap-2 w-[200px] h-[44px] hover:bg-[rgba(0,0,0,0.06)] transition-colors"
          >
            <div className="w-6 h-6 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center">
              <span className="text-white text-[12px] font-['Arial:Regular',_sans-serif] leading-[16px]">T</span>
            </div>
            <span className="text-[14px] leading-[20px] font-['Arial:Regular',_sans-serif] text-gray-800 flex-1 text-left">The Royal Hotel</span>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${showVenueDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showVenueDropdown && (
            <div className="absolute top-full right-0 mt-2 w-[280px] bg-white border border-[rgba(0,0,0,0.08)] rounded-[12px] shadow-lg z-50 py-2">
              {/* Venue Info */}
              <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-b from-[#ff8a00] via-[#ff4d8d] to-[#8b5cf6] rounded-full flex items-center justify-center">
                    <span className="text-white text-[16px] font-['Arial:Regular',_sans-serif] leading-[20px]">T</span>
                  </div>
                  <div>
                    <div className="text-[14px] font-['Arial:Bold',_sans-serif] font-bold text-slate-900 leading-[20px]">The Royal Hotel</div>
                    <div className="text-[12px] text-slate-600 leading-[16px]">admin@gmail.com</div>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-slate-600 hover:bg-gray-50 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}

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