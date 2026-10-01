export interface LaunchVoteTopEntry {
    productId: string
    rank: number
    releaseDate: string | null
}

export interface LaunchVoteView {
    enabled: boolean
    votedProductIds: string[]
    top3: LaunchVoteTopEntry[]
    hasPriorPaidOrder: boolean | null
}

export interface LaunchVoteCardModel {
    signedIn: boolean
    votingEnabled: boolean
    votedProductIds: readonly string[]
    top3: readonly LaunchVoteTopEntry[]
    hasPriorPaidOrder: boolean | null
}

export const EMPTY_LAUNCH_VOTE_VIEW: LaunchVoteView = {
    enabled: false,
    votedProductIds: [],
    top3: [],
    hasPriorPaidOrder: null,
}

export function staticVoteModel(signedIn: boolean): LaunchVoteCardModel {
    return {
        signedIn,
        votingEnabled: false,
        votedProductIds: [],
        top3: [],
        hasPriorPaidOrder: null,
    }
}
