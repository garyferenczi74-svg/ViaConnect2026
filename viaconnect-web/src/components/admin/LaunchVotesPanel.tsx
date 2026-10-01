/**
 * Launch votes admin card. Counts only. No voter identities, codes, or emails.
 */
import { AdminPanel } from '@/components/admin/AdminPanelErrorBoundary'
import { Card } from '@/components/ui/Card'
import { LaunchVotesTable } from '@/components/admin/LaunchVotesTable'
import { ADMIN_PLAN_NOTE, ADMIN_VOTES_TITLE } from '@/lib/shop/launch-vote-copy'
import { loadAdminLaunchVotes } from '@/lib/shop/launch-vote/admin'

export async function LaunchVotesPanel() {
    const load = await loadAdminLaunchVotes()
    return (
        <AdminPanel name="Launch votes">
            <Card className="p-5">
                <h2 className="mb-2 text-sm font-semibold text-white">{ADMIN_VOTES_TITLE}</h2>
                <p className="mb-4 text-xs text-gray-400">{load.planNote || ADMIN_PLAN_NOTE}</p>
                <LaunchVotesTable load={load} />
            </Card>
        </AdminPanel>
    )
}
