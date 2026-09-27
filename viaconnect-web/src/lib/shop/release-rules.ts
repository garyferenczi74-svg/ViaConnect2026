/**
 * Pure shop release rules. A supplement is released only when its
 * launch_phase_id points at a phase whose status is active or completed.
 * Test kits are exempt only when both DB fields are exactly "test_kit".
 * A failed release lookup (null phase set) keeps kits buyable and treats
 * every other row as unreleased.
 */

const RELEASED_PHASE_STATUSES = new Set(['active', 'completed'])

export function isReleasedPhaseStatus(status: unknown): boolean {
    return typeof status === 'string' && RELEASED_PHASE_STATUSES.has(status)
}

export interface ReleaseFields {
    category: unknown
    product_type: unknown
    launch_phase_id?: unknown
}

export function releaseFieldsFromRow(row: Record<string, unknown>): ReleaseFields {
    const fields: ReleaseFields = {
        category: row.category,
        product_type: row.product_type,
    }
    if (Object.prototype.hasOwnProperty.call(row, 'launch_phase_id')) {
        fields.launch_phase_id = row.launch_phase_id
    }
    return fields
}

export function isExemptTestKit(row: ReleaseFields): boolean {
    return row.category === 'test_kit' && row.product_type === 'test_kit'
}

export function readLaunchPhaseId(row: Record<string, unknown>): string | null {
    if (!Object.prototype.hasOwnProperty.call(row, 'launch_phase_id')) return null
    const value = row.launch_phase_id
    if (typeof value !== 'string' || value.length === 0) return null
    return value
}

export function resolveRelease(
    row: ReleaseFields,
    releasedPhaseIds: ReadonlySet<string> | null,
): boolean {
    if (isExemptTestKit(row)) return true
    if (releasedPhaseIds === null) return false
    const phaseId = readLaunchPhaseId(row as unknown as Record<string, unknown>)
    if (phaseId === null) return false
    return releasedPhaseIds.has(phaseId)
}
