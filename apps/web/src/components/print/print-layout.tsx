'use client'

import { useEffect } from 'react'

interface PrintLayoutProps {
  title: string
  subtitle?: string
  event: {
    name: string
    starts_at: string
    tenants?: {
      name: string
    }
  }
  children: React.ReactNode
  footer?: string
  autoPrint?: boolean
  pageNumber?: number
  totalPages?: number
}

export default function PrintLayout({
  title,
  subtitle,
  event,
  children,
  footer,
  autoPrint = false,
  pageNumber = 1,
  totalPages = 1
}: PrintLayoutProps) {
  useEffect(() => {
    if (autoPrint) {
      // Auto-trigger print dialog after content loads
      const timer = setTimeout(() => {
        window.print()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoPrint])

  function formatEventDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  function formatGeneratedTime() {
    return new Date().toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Melbourne'
    })
  }

  return (
    <>
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          /* Reset and page setup */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          @page {
            size: A4 portrait;
            margin: 20mm;
            margin-bottom: 30mm;
          }

          /* Hide interactive elements */
          nav,
          button,
          .no-print,
          [data-print="false"] {
            display: none !important;
          }

          /* Body styling */
          html, body {
            width: 210mm;
            height: 297mm;
            font-family: 'Arial', 'Helvetica', sans-serif !important;
            font-size: 12pt !important;
            line-height: 1.4 !important;
            color: #000 !important;
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Typography */
          h1 {
            font-size: 18pt !important;
            font-weight: bold !important;
            margin: 0 0 10pt 0 !important;
            page-break-after: avoid !important;
            text-align: center !important;
          }

          h2 {
            font-size: 14pt !important;
            font-weight: bold !important;
            margin: 10pt 0 5pt 0 !important;
            page-break-after: avoid !important;
          }

          h3 {
            font-size: 12pt !important;
            font-weight: bold !important;
            margin: 8pt 0 4pt 0 !important;
            page-break-after: avoid !important;
          }

          p {
            margin: 4pt 0 !important;
            orphans: 2 !important;
            widows: 2 !important;
          }

          /* Tables */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            margin: 10pt 0 !important;
          }

          th, td {
            border: 1pt solid #000 !important;
            padding: 4pt 6pt !important;
            text-align: left !important;
            vertical-align: top !important;
          }

          th {
            background: #f0f0f0 !important;
            font-weight: bold !important;
            page-break-after: avoid !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          /* Page breaks */
          .page-break {
            page-break-after: always !important;
          }

          .page-break-before {
            page-break-before: always !important;
          }

          .keep-together {
            page-break-inside: avoid !important;
          }

          /* Print header and footer */
          .print-header {
            border-bottom: 2pt solid #000 !important;
            padding-bottom: 10pt !important;
            margin-bottom: 15pt !important;
          }

          .print-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            border-top: 1pt solid #000 !important;
            padding-top: 5pt !important;
            font-size: 10pt !important;
            background: #fff !important;
          }

          /* Venue branding */
          .venue-logo {
            max-height: 40pt !important;
            max-width: 120pt !important;
            margin-bottom: 10pt !important;
          }

          /* Signatures and official elements */
          .signature-line {
            border-top: 1pt solid #000 !important;
            width: 150pt !important;
            margin-top: 20pt !important;
          }

          .official-seal {
            border: 2pt solid #000 !important;
            padding: 10pt !important;
            margin: 10pt 0 !important;
            text-align: center !important;
          }

          /* QR codes */
          .qr-code {
            max-width: 20pt !important;
            max-height: 20pt !important;
          }
        }

        /* Screen styles for preview */
        @media screen {
          .print-preview {
            max-width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            padding: 20mm;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
          }

          .no-print {
            margin: 20px 0;
            text-align: center;
          }
        }
      `}</style>

      <div className="print-preview">
        {/* Screen-only controls */}
        <div className="no-print bg-gray-100 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Print Preview</h3>
              <p className="text-sm text-gray-600">This page is optimized for A4 printing</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Print Document
              </button>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <header className="print-header">
          <div className="text-center">
            {event.tenants?.name && (
              <div className="mb-4">
                <h2 className="text-xl font-bold">{event.tenants.name}</h2>
              </div>
            )}

            <h1 className="text-2xl font-bold uppercase">{title}</h1>

            {subtitle && (
              <h2 className="text-lg font-semibold mb-2">{subtitle}</h2>
            )}

            <div className="mt-4 space-y-1">
              <p className="font-semibold">Event: {event.name}</p>
              {event.starts_at && (
                <p>Date: {formatEventDate(event.starts_at)}</p>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mb-16">
          {children}
        </main>

        {/* Print Footer */}
        <footer className="print-footer">
          <div className="flex justify-between items-center text-xs">
            <div>
              <p>Generated: {formatGeneratedTime()}</p>
              <p className="font-semibold">
                Official Document - {event.tenants?.name || 'Melbourne Cup Sweep Platform'}
              </p>
              {footer && <p>{footer}</p>}
            </div>

            <div className="text-right">
              <p>Page {pageNumber} of {totalPages}</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

// Helper component for signature lines
export function SignatureLine({ label, width = "150pt" }: { label: string; width?: string }) {
  return (
    <div className="signature-area mt-8">
      <div className="signature-line" style={{ width }} />
      <p className="text-xs mt-1">{label}</p>
    </div>
  )
}

// Helper component for official seals/stamps
export function OfficialSeal({ children }: { children: React.ReactNode }) {
  return (
    <div className="official-seal">
      {children}
    </div>
  )
}

// Helper component for page breaks
export function PageBreak() {
  return <div className="page-break" />
}