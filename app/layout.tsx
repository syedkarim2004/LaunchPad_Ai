import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'FinanceAI - Your Personal Loan Assistant',
  description: 'Get instant personal loans with AI-powered assistance. Quick approvals, competitive rates, and seamless experience.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
