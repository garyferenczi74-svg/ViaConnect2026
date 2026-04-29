import { Loader2 } from 'lucide-react'

export default function PractitionerDashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-[#1A2744]">
      <div className="flex flex-col items-center gap-3 sm:gap-4">
        <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 text-[#2DA5A0] animate-spin" strokeWidth={1.5} />
        <p className="text-sm sm:text-base text-white/70">
          Loading practitioner dashboard...
        </p>
      </div>
    </div>
  )
}
