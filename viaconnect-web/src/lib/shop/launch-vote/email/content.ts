/** Approved ViaCura weekly blocks. No source exists, so this returns null. */

export interface ApprovedPairing {
    name: string
    released: boolean
    inProtocol: boolean
    competitor: boolean
}

export interface ApprovedViaCuraContent {
    whatsNew: string | null
    whyItHelps: string | null
    pairings: readonly ApprovedPairing[]
}

export function getApprovedViaCuraContent(_productId: string): null {
    return null
}

export function visiblePairings(pairings: readonly ApprovedPairing[]): ApprovedPairing[] {
    return pairings.filter((row) => row.released && !row.inProtocol && !row.competitor)
}
