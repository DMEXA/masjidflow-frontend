import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/components/providers/query-provider'
import { AuthBootstrap } from '@/components/providers/auth-bootstrap'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'MasjidFlow - Mosque Financial Management',
    template: '%s | MasjidFlow',
  },
  description: 'Modern financial management platform for mosques. Track donations, expenses, and manage your community with ease.',
  keywords: ['mosque', 'masjid', 'donations', 'expenses', 'financial management', 'islamic', 'community'],
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <QueryProvider>
          <AuthBootstrap />
          {children}
          <Toaster position="top-right" />
          <Analytics />
        </QueryProvider>
      </body>
    </html>
  )
}

