/**
 * Admin launch vote table. Counts and dates only. No voter identities.
 */
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import {
    ADMIN_CANCEL,
    ADMIN_COL_DATE,
    ADMIN_COL_PRODUCT,
    ADMIN_COL_RANK,
    ADMIN_COL_VOTES,
    ADMIN_CONFIRM_RELEASE,
    ADMIN_MARK_RELEASED,
    ADMIN_NOTIFY_LABEL,
    ADMIN_NOTIFY_QUEUED,
    ADMIN_RANK_NONE,
    ADMIN_RANK_TOP,
    ADMIN_RELEASE_CONFIRM,
    ADMIN_RELEASED,
    ADMIN_RELEASED_UNDATED,
    ADMIN_SAVE_ERROR,
    ADMIN_SAVED,
    ADMIN_VOTES_EMPTY,
    fillLaunchTemplate,
} from '@/lib/shop/launch-vote-copy'
import { formatUtcInstantDate } from '@/lib/shop/launch-vote/state'
import { ADMIN_LOOKUP_FAILED_COPY } from '@/lib/admin/erp-honesty'
import './launch-votes.css'

export interface LaunchVotesTableRow {
    productId: string
    name: string
    sku: string
    votes: number
    rank: number | null
    releaseDate: string | null
    released: boolean
    releasedAt: string | null
    notifyRequestedAt: string | null
}

export interface LaunchVotesTableLoad {
    ok: boolean
    rows: LaunchVotesTableRow[]
}

export function LaunchVotesTable({ load }: { load: LaunchVotesTableLoad }) {
    const [rows, setRows] = useState(load.rows)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [note, setNote] = useState<string | null>(null)

    if (!load.ok) {
        return <p className="text-xs text-gray-500">{ADMIN_LOOKUP_FAILED_COPY}</p>
    }
    if (rows.length === 0) {
        return <p className="text-xs text-gray-500">{ADMIN_VOTES_EMPTY}</p>
    }

    const saveDate = async (row: LaunchVotesTableRow, releaseDate: string) => {
        setNote(null)
        const response = await fetch(`/api/admin/launch-votes/${row.productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ releaseDate: releaseDate || null }),
        })
        if (!response.ok) {
            setNote(ADMIN_SAVE_ERROR)
            return
        }
        setRows((current) =>
            current.map((item) =>
                item.productId === row.productId ? { ...item, releaseDate: releaseDate || null } : item,
            ),
        )
        setNote(ADMIN_SAVED)
    }

    const notify = async (row: LaunchVotesTableRow) => {
        setNote(null)
        const response = await fetch(`/api/admin/launch-votes/${row.productId}/notify`, { method: 'POST' })
        if (!response.ok) {
            setNote(ADMIN_SAVE_ERROR)
            return
        }
        setRows((current) =>
            current.map((item) =>
                item.productId === row.productId
                    ? { ...item, notifyRequestedAt: new Date().toISOString() }
                    : item,
            ),
        )
        setNote(ADMIN_NOTIFY_QUEUED)
    }

    const release = async (row: LaunchVotesTableRow) => {
        setNote(null)
        const response = await fetch(`/api/admin/launch-votes/${row.productId}/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmed: true }),
        })
        if (!response.ok) {
            setNote(ADMIN_SAVE_ERROR)
            return
        }
        setRows((current) =>
            current.map((item) =>
                item.productId === row.productId
                    ? { ...item, released: true, releasedAt: new Date().toISOString() }
                    : item,
            ),
        )
        setPendingId(null)
    }

    return (
        <div>
            {note ? <p className="mb-2 text-xs text-gray-300">{note}</p> : null}
            <table className="vc-launch-votes w-full text-left text-xs text-gray-200">
                <thead>
                    <tr className="text-gray-400">
                        <th className="py-2">{ADMIN_COL_PRODUCT}</th>
                        <th>{ADMIN_COL_VOTES}</th>
                        <th>{ADMIN_COL_RANK}</th>
                        <th>{ADMIN_COL_DATE}</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const releasedLabel = row.releasedAt
                            ? fillLaunchTemplate(ADMIN_RELEASED, {
                                  date: formatUtcInstantDate(row.releasedAt) ?? '',
                              })
                            : ADMIN_RELEASED_UNDATED
                        return (
                            <tr key={row.productId} className="border-t border-white/[0.06]">
                                <td className="py-3" data-label={ADMIN_COL_PRODUCT}>
                                    <p className="text-white">{row.name}</p>
                                    <p className="text-[10px] text-gray-500">{row.sku}</p>
                                </td>
                                <td data-label={ADMIN_COL_VOTES}>{row.votes}</td>
                                <td data-label={ADMIN_COL_RANK}>
                                    {row.rank !== null && row.rank <= 3 ? (
                                        <Badge variant="active">{ADMIN_RANK_TOP}</Badge>
                                    ) : (
                                        ADMIN_RANK_NONE
                                    )}
                                </td>
                                <td data-label={ADMIN_COL_DATE}>
                                    {row.released ? (
                                        releasedLabel
                                    ) : (
                                        <input
                                            type="date"
                                            aria-label={`${ADMIN_COL_DATE} ${row.name}`}
                                            defaultValue={row.releaseDate ?? ''}
                                            onBlur={(event) => {
                                                void saveDate(row, event.target.value)
                                            }}
                                        />
                                    )}
                                </td>
                                <td>
                                    {row.released ? (
                                        <span>{releasedLabel}</span>
                                    ) : pendingId === row.productId ? (
                                        <div>
                                            <p>{ADMIN_RELEASE_CONFIRM}</p>
                                            <button type="button" onClick={() => void release(row)}>
                                                {ADMIN_CONFIRM_RELEASE}
                                            </button>
                                            <button type="button" onClick={() => setPendingId(null)}>
                                                {ADMIN_CANCEL}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                type="button"
                                                disabled={!row.releaseDate}
                                                onClick={() => void notify(row)}
                                            >
                                                {row.notifyRequestedAt ? ADMIN_NOTIFY_QUEUED : ADMIN_NOTIFY_LABEL}
                                            </button>
                                            <p hidden={pendingId !== row.productId}>{ADMIN_RELEASE_CONFIRM}</p>
                                            <button type="button" onClick={() => setPendingId(row.productId)}>
                                                {ADMIN_MARK_RELEASED}
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
