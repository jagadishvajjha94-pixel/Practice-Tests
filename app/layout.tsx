import type { Metadata } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import GlobalBackButton from '@/components/global-back-button'
import AppSessionBar from '@/components/app-session-bar'
import CollegeSiteHeader from '@/components/college-site-header'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ramachandra College — Training & Placement Department',
  description: 'Training & Placement Department — internal online assessment for Ramachandra College of Engineering.',
  keywords: 'Ramachandra College, assessment, placement, aptitude, internal examination',
  openGraph: {
    title: 'Ramachandra College — Training & Placement Department',
    description: 'Training & Placement Department — internal online assessment for student skill evaluation',
    siteName: 'Ramachandra College',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${geistMono.variable} ${playfair.variable}`}
    >
      <body className={`${geist.className} font-sans antialiased bg-background text-foreground min-h-dvh`}>
        <CollegeSiteHeader />
        <GlobalBackButton />
        <AppSessionBar />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
