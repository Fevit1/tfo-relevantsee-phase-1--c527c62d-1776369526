'use client'

import { Inter } from 'next/font/google'
import '@/app/globals.css'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.className}`}>
      <body className="bg-gray-950 text-white antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}