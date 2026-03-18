"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // TODO: Check authentication status with Supabase
    // const { data: { session } } = await supabase.auth.getSession()
    // if (session) {
    //   router.replace("/dashboard")
    // } else {
    //   router.replace("/login")
    // }

    // For now, always redirect to login
    router.replace("/login")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-500" />
        <p className="text-sm text-gray-500">Redirecting...</p>
      </div>
    </div>
  )
}
