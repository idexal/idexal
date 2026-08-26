import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'Idexal IDE — The Future of Code',
    template: '%s | Idexal IDE',
  },
  description: 'AI-Powered Development Environment for every developer. Write, review, debug, and deploy with multi-agent AI assistance.',
  keywords: ['IDE', 'AI', 'code editor', 'developer tools', 'programming', 'open source'],
  authors: [{ name: 'Idexal', url: 'https://idexal.com' }],
  creator: 'Zakariae Lahbabi',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://idexal.com',
    siteName: 'Idexal IDE',
    title: 'Idexal IDE — The Future of Code',
    description: 'AI-Powered Development Environment for every developer.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Idexal IDE — The Future of Code',
    description: 'AI-Powered Development Environment for every developer.',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white dark:bg-surface-950">
        {children}
      </body>
    </html>
  )
}
