import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
// import { Toaster } from '@/components/ui/toaster'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { SkipLink } from '@/components/ui/accessibility'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: 'Melbourne Cup Manager',
    template: '%s | Melbourne Cup Manager'
  },
  description: 'Professional Melbourne Cup event management platform for venues. Create engaging sweep and Calcutta events with QR code registration, real-time draws, and comprehensive patron management.',
  keywords: ['Melbourne Cup', 'event management', 'venue software', 'horse racing', 'sweep', 'Calcutta', 'QR code registration'],
  authors: [{ name: 'Melbourne Cup Manager' }],
  creator: 'Melbourne Cup Manager',
  publisher: 'Melbourne Cup Manager',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://melbournecup.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://melbournecup.app',
    title: 'Melbourne Cup Manager - Professional Event Management',
    description: 'Professional Melbourne Cup event management platform for venues. Create engaging sweep and Calcutta events with QR code registration.',
    siteName: 'Melbourne Cup Manager',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Melbourne Cup Manager - Professional Event Management Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Melbourne Cup Manager - Professional Event Management',
    description: 'Professional Melbourne Cup event management platform for venues. Create engaging sweep and Calcutta events.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* Progressive Web App manifests */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#1f2937" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <SkipLink />

        <ErrorBoundary>
          <TooltipProvider delayDuration={300}>
            <div id="main-content" className="min-h-screen bg-background font-sans">
              {children}
            </div>
            <Toaster position="top-right" />
          </TooltipProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}