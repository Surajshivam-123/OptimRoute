import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OptimRoute | Intelligent Train Travel Planner',
  description: 'Plan your rail journeys instantly. Search schedules, analyze stops, filter by speed or budget, and visualize routes in real-time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body className="font-sans min-h-screen bg-rail-950 text-rail-50 selection:bg-transit-orange selection:text-white">
        {children}
      </body>
    </html>
  )
}