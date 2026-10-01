/** Pure vote ranking. Rows with a null vote time are not votes. */

export const MIN_VOTES_FOR_TOP3 = 1

export interface VoteRankRow {
    productId: string
    userId: string
    votedAt: string | null
}

export interface RankedProduct {
    productId: string
    votes: number
    rank: number
    firstVoteAt: string
}

export function rankVotes(
    rows: readonly VoteRankRow[],
    released: ReadonlySet<string>,
    minVotes: number,
): RankedProduct[] {
    const grouped = new Map<string, { votes: number; firstVoteAt: string }>()
    for (const row of rows) {
        if (row.votedAt === null || row.votedAt.length === 0) continue
        if (released.has(row.productId)) continue
        const current = grouped.get(row.productId)
        if (!current) {
            grouped.set(row.productId, { votes: 1, firstVoteAt: row.votedAt })
            continue
        }
        current.votes += 1
        if (row.votedAt < current.firstVoteAt) current.firstVoteAt = row.votedAt
    }

    const ordered = [...grouped.entries()]
        .filter(([, value]) => value.votes >= minVotes)
        .sort((a, b) => {
            if (b[1].votes !== a[1].votes) return b[1].votes - a[1].votes
            if (a[1].firstVoteAt !== b[1].firstVoteAt) {
                return a[1].firstVoteAt < b[1].firstVoteAt ? -1 : 1
            }
            return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
        })

    return ordered.map(([productId, value], index) => ({
        productId,
        votes: value.votes,
        rank: index + 1,
        firstVoteAt: value.firstVoteAt,
    }))
}

export function top3(ranked: readonly RankedProduct[]): RankedProduct[] {
    return ranked.slice(0, 3)
}
