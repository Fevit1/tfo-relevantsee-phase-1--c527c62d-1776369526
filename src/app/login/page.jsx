'use client'

import { Suspense } from 'react'
import { Login } from '@/components/Login'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <Login />
    </Suspense>
  )
}