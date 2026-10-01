/**
 * Shopper, admin, and email strings for the launch vote.
 * Straight apostrophes. No em dash or en dash. No emoji.
 * Join the Revolution copy stays in coming-soon-copy.ts and is not a vote.
 */

export const LAUNCH_PILL_REST = 'Launching Soon'
export const LAUNCH_PILL_HOVER = 'Vote for the next product launch'
export const LAUNCH_PILL_VOTED = 'You voted. 25% off at launch'
export const LAUNCH_PILL_POPULAR = 'By Popular Demand'
export const LAUNCH_PILL_RELEASES = 'Releases {date}'
export const LAUNCH_TOP_VOTED = 'Top voted'
export const LAUNCH_TERMS_LINE_FIRST = '25% off your first order of this product. Terms apply.'
export const LAUNCH_TERMS_LINE_NEXT = '25% off your next order of this product. Terms apply.'
export const LAUNCH_TERMS_LINE_UNKNOWN =
    '25% off your first order of this product if you have not ordered before, or your next order if you have. Terms apply.'
export const LAUNCH_VOTE_ARIA = 'Vote for the next product launch: {productName}'
export const LAUNCH_VOTE_SIGNIN_ARIA = 'Sign in to vote for {productName}'
export const LAUNCH_VOTE_ERROR = "We couldn't record your vote. Please try again."
export const LAUNCH_CONFIRM_TITLE = 'Vote for {productName}?'
export const LAUNCH_CONFIRM_BODY = "One vote per product. Votes can't be undone."
export const LAUNCH_CONFIRM_SUBMIT = 'Submit vote'
export const LAUNCH_CONFIRM_CANCEL = 'Cancel'

export const CART_EARLY_VOTER_LINE = 'Early voter 25% off'
export const CART_EARLY_VOTER_UNAVAILABLE = 'unavailable'
export const CART_EARLY_VOTER_EXPIRES = 'Expires {date}'
export const CART_EARLY_VOTER_FIRST = 'Applies to 1 unit on your first order.'
export const CART_EARLY_VOTER_NEXT = 'Applies to 1 unit on your next order.'

export const ADMIN_VOTES_TITLE = 'Launch votes'
export const ADMIN_VOTES_EMPTY = 'No votes yet.'
export const ADMIN_NOTIFY_LABEL = 'Notify'
export const ADMIN_NOTIFY_QUEUED = 'Queued for the next weekly email'
export const ADMIN_MARK_RELEASED = 'Mark released'
export const ADMIN_RELEASE_CONFIRM =
    'This ends voting for this product, creates one single-use 25% code per voter, and expires them 7 days after today.'
export const ADMIN_CONFIRM_RELEASE = 'Confirm release'
export const ADMIN_CANCEL = 'Cancel'
export const ADMIN_RELEASED = 'Released {date}'
export const ADMIN_RELEASED_UNDATED = 'Released'
export const ADMIN_RANK_TOP = 'Top 3'
export const ADMIN_RANK_NONE = '-'
export const ADMIN_PLAN_NOTE =
    'Phase 1: NAD+, RISE+, DESIRE+. Phase 2: Creatine HCL+, CATALYST+, MTHFR Support+.'
export const ADMIN_COL_PRODUCT = 'Product'
export const ADMIN_COL_VOTES = 'Total votes'
export const ADMIN_COL_RANK = 'Rank'
export const ADMIN_COL_DATE = 'Release date'
export const ADMIN_SAVED = 'Saved'
export const ADMIN_SAVE_ERROR = 'Could not save the release date.'

export const EMAIL_WEEKLY_SUBJECT = 'Your ViaCura launch updates'
export const EMAIL_ADMIN_SUBJECT = 'ViaCura launch vote tally'
export const EMAIL_RELEASE_SUBJECT = 'Your ViaCura early voter code'
export const EMAIL_CONFIRM_SUBJECT = 'Your ViaCura launch vote'
export const EMAIL_CODE_DAY = 'Your 25% code will be emailed the day this product releases.'
export const EMAIL_TERMS_FIRST =
    "25% off your first order of this product, one-time code, expires 7 days after launch, can't be combined with other offers."
export const EMAIL_TERMS_NEXT =
    "25% off your next order of this product, one-time code, expires 7 days after launch, can't be combined with other offers."
export const EMAIL_UNSUBSCRIBE = 'Unsubscribe'
export const EMAIL_VIEW_PRODUCT = 'View product'
export const EMAIL_ADMIN_EMPTY = 'No votes yet.'
export const EMAIL_SIGNED_UP = 'You are signed up for updates on this product.'
export const EMAIL_VOTED = 'You voted for this product.'
export const EMAIL_RELEASES = 'Releases {date}'

/** Developer description of the three shop controls. Not rendered as shopper copy. */
export const SHOP_CONTROL_JOIN =
    'Join the Revolution is the email sign-up only. It stays on every product, released or not. It is not a vote and not a purchase.'
export const SHOP_CONTROL_PURCHASE =
    'Add to Cart is the purchase button only. It appears only when a product is released.'
export const SHOP_CONTROL_VOTE =
    'The Launching Soon pill is the vote control only. It appears only on unreleased products and does not replace Join the Revolution.'

export function fillLaunchTemplate(template: string, values: Record<string, string>): string {
    let out = template
    for (const [key, value] of Object.entries(values)) {
        out = out.split(`{${key}}`).join(value)
    }
    return out
}

export function launchTermsLine(hasPriorPaidOrder: boolean | null): string {
    if (hasPriorPaidOrder === true) return LAUNCH_TERMS_LINE_NEXT
    if (hasPriorPaidOrder === false) return LAUNCH_TERMS_LINE_FIRST
    return LAUNCH_TERMS_LINE_UNKNOWN
}

export function emailTermsLine(orderScope: 'first_order' | 'next_order' | null): string {
    if (orderScope === 'next_order') return EMAIL_TERMS_NEXT
    if (orderScope === 'first_order') return EMAIL_TERMS_FIRST
    return LAUNCH_TERMS_LINE_UNKNOWN
}
