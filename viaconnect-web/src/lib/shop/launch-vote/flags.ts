/** Plain env reads. Strict equality. Every flag defaults off. */

export function launchVoteEnabled(): boolean {
    return process.env.LAUNCH_VOTE_ENABLED === 'true'
}

export function launchVoteEmailsEnabled(): boolean {
    return process.env.LAUNCH_VOTE_EMAILS_ENABLED === 'true'
}

export function earlyVoterDiscountEnabled(): boolean {
    return process.env.EARLY_VOTER_DISCOUNT_ENABLED === 'true'
}
