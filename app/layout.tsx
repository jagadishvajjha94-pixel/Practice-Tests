import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import GlobalBackButton from '@/components/global-back-button'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'PrepIndia - Master Placements & Aptitude Tests',
  description: 'Complete platform for placement preparation. Practice aptitude tests, mock interviews, and company-specific assessments. Get AI-powered resume review and interview preparation.',
  keywords: 'placement preparation, aptitude tests, mock interviews, TCS, Infosys, HCL, campus recruitment',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'PrepIndia - Master Placements & Aptitude Tests',
    description: 'Complete platform for placement preparation',
    url: 'https://prepindia.com',
    siteName: 'PrepIndia',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-white">
      <body className="font-sans antialiased bg-white text-gray-900">
        <GlobalBackButton />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
