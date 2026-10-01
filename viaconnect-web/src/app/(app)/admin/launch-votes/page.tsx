import { LaunchVotesPanel } from '@/components/admin/LaunchVotesPanel'

export const dynamic = 'force-dynamic'

export default function AdminLaunchVotesPage() {
    return (
        <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
            <LaunchVotesPanel />
        </div>
    )
}
