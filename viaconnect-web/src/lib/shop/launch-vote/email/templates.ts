/**
 * Pure email templates. HTML-escape every interpolation.
 * Approved content blocks are omitted when the provider returns null.
 * No health claims, doses, ingredients, or benefits are written here.
 */
import {
    EMAIL_ADMIN_EMPTY,
    EMAIL_ADMIN_SUBJECT,
    EMAIL_CODE_DAY,
    EMAIL_CONFIRM_SUBJECT,
    EMAIL_RELEASES,
    EMAIL_RELEASE_SUBJECT,
    EMAIL_SIGNED_UP,
    EMAIL_TERMS_FIRST,
    EMAIL_UNSUBSCRIBE,
    EMAIL_VIEW_PRODUCT,
    EMAIL_VOTED,
    EMAIL_WEEKLY_SUBJECT,
    emailTermsLine,
    fillLaunchTemplate,
} from '@/lib/shop/launch-vote-copy'
import {
    visiblePairings,
    type ApprovedViaCuraContent,
} from '@/lib/shop/launch-vote/email/content'
import { formatReleaseDate } from '@/lib/shop/launch-vote/state'
import type { OrderScope } from '@/lib/shop/launch-vote/release'

export interface RenderedEmail {
    subject: string
    html: string
    text: string
}

const NAVY = '#0B1A2E'
const TEAL = '#14B8A6'
const LIGHT = '#F1F5F9'
const WHITE = '#FFFFFF'
const FONT = "'Inter', Arial, sans-serif"
const PILL_BG = '#0A1929'
const PILL_FG = '#81D8FF'

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function shell(inner: string, postal: string, unsubscribeUrl: string | null): string {
    const unsub = unsubscribeUrl
        ? `<p style="margin:16px 0 0;font-size:12px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:${TEAL};">${EMAIL_UNSUBSCRIBE}</a></p>`
        : ''
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:${LIGHT};font-family:${FONT};"><table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT};padding:32px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:${WHITE};border-radius:12px;"><tr><td style="background:${NAVY};padding:28px 32px;"><span style="color:${TEAL};font-size:24px;font-weight:700;">ViaCura</span></td></tr><tr><td style="padding:32px;color:#1E293B;font-size:15px;line-height:1.7;">${inner}${unsub}<p style="margin:16px 0 0;color:#64748B;font-size:12px;">${escapeHtml(postal)}</p></td></tr></table></td></tr></table></body></html>`
}

function pillLink(href: string, label: string): string {
    return `<table cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td align="center" bgcolor="${PILL_BG}" style="border-radius:9999px;padding:12px 24px;"><a href="${escapeHtml(href)}" style="color:${PILL_FG};text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(label)}</a></td></tr></table>`
}

function contentBlocks(content: ApprovedViaCuraContent | null): { html: string; text: string } {
    if (!content) return { html: '', text: '' }
    const parts: string[] = []
    const lines: string[] = []
    if (content.whatsNew && content.whatsNew.trim()) {
        parts.push(`<p>${escapeHtml(content.whatsNew)}</p>`)
        lines.push(content.whatsNew)
    }
    if (content.whyItHelps && content.whyItHelps.trim()) {
        parts.push(`<p>${escapeHtml(content.whyItHelps)}</p>`)
        lines.push(content.whyItHelps)
    }
    const pairings = visiblePairings(content.pairings)
    if (pairings.length > 0) {
        const items = pairings.map((row) => `<li>${escapeHtml(row.name)}</li>`).join('')
        parts.push(`<ul>${items}</ul>`)
        lines.push(pairings.map((row) => row.name).join(', '))
    }
    return { html: parts.join(''), text: lines.join('\n') }
}

export interface WeeklyProductBlock {
    productName: string
    imageUrl: string | null
    productUrl: string
    voted: boolean
    releaseDate: string | null
    approved: ApprovedViaCuraContent | null
    orderScope: OrderScope | null
}

export function renderSubscriberWeekly(input: {
    products: readonly WeeklyProductBlock[]
    postal: string
    unsubscribeUrl: string
}): RenderedEmail {
    const htmlParts: string[] = []
    const textParts: string[] = []
    for (const product of input.products) {
        const name = escapeHtml(product.productName)
        const status = product.voted ? EMAIL_VOTED : EMAIL_SIGNED_UP
        const dateLabel = formatReleaseDate(product.releaseDate)
        const dateLine = dateLabel ? fillLaunchTemplate(EMAIL_RELEASES, { date: dateLabel }) : ''
        const image = product.imageUrl
            ? `<img src="${escapeHtml(product.imageUrl)}" alt="" width="120" style="border-radius:8px;margin:0 0 8px;">`
            : ''
        const blocks = contentBlocks(product.approved)
        const terms = product.voted ? `<p>${escapeHtml(emailTermsLine(product.orderScope))}</p><p>${escapeHtml(EMAIL_CODE_DAY)}</p>` : ''
        htmlParts.push(
            `<div style="margin:0 0 24px;">${image}<p style="margin:0 0 4px;font-weight:700;">${name}</p><p style="margin:0 0 4px;">${escapeHtml(status)}</p>${dateLine ? `<p style="margin:0 0 4px;">${escapeHtml(dateLine)}</p>` : ''}${blocks.html}${terms}${pillLink(product.productUrl, EMAIL_VIEW_PRODUCT)}</div>`,
        )
        textParts.push(
            [product.productName, status, dateLine, blocks.text, product.voted ? emailTermsLine(product.orderScope) : '', product.voted ? EMAIL_CODE_DAY : '', product.productUrl]
                .filter((line) => line.length > 0)
                .join('\n'),
        )
    }
    const text = [...textParts, EMAIL_UNSUBSCRIBE, input.unsubscribeUrl, input.postal].join('\n\n')
    return {
        subject: EMAIL_WEEKLY_SUBJECT,
        html: shell(htmlParts.join(''), input.postal, input.unsubscribeUrl),
        text,
    }
}

export interface AdminTallyRow {
    name: string
    sku: string
    votes: number
    rank: number | null
    releaseDate: string | null
}

export function renderAdminWeekly(input: { rows: readonly AdminTallyRow[]; postal: string }): RenderedEmail {
    if (input.rows.length === 0) {
        return {
            subject: EMAIL_ADMIN_SUBJECT,
            html: shell(`<p>${escapeHtml(EMAIL_ADMIN_EMPTY)}</p>`, input.postal, null),
            text: `${EMAIL_ADMIN_EMPTY}\n\n${input.postal}`,
        }
    }
    const body = input.rows
        .map((row) => {
            const date = formatReleaseDate(row.releaseDate) ?? ''
            const rank = row.rank === null ? '-' : String(row.rank)
            return `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.sku)}</td><td>${row.votes}</td><td>${escapeHtml(rank)}</td><td>${escapeHtml(date)}</td></tr>`
        })
        .join('')
    const html = `<table width="100%" cellpadding="6" cellspacing="0"><tr><th align="left">Product</th><th align="left">SKU</th><th align="left">Votes</th><th align="left">Rank</th><th align="left">Release date</th></tr>${body}</table>`
    const text = input.rows
        .map((row) => `${row.name} ${row.sku} ${row.votes} ${row.rank ?? '-'} ${formatReleaseDate(row.releaseDate) ?? ''}`)
        .join('\n')
    return {
        subject: EMAIL_ADMIN_SUBJECT,
        html: shell(html, input.postal, null),
        text: `${text}\n\n${input.postal}`,
    }
}

export function renderReleaseCode(input: {
    productName: string
    productUrl: string
    code: string | null
    expiresLabel: string
    orderScope: OrderScope
    postal: string
    unsubscribeUrl: string
}): RenderedEmail {
    const codeBlock = input.code
        ? `<p style="font-family:ui-monospace,monospace;font-size:18px;letter-spacing:1px;">${escapeHtml(input.code)}</p><p>Expires ${escapeHtml(input.expiresLabel)}</p>`
        : ''
    const terms = emailTermsLine(input.orderScope)
    const inner = `<p style="font-weight:700;">${escapeHtml(input.productName)}</p>${codeBlock}<p>${escapeHtml(terms)}</p>${pillLink(input.productUrl, EMAIL_VIEW_PRODUCT)}`
    const text = [input.productName, input.code ?? '', input.code ? `Expires ${input.expiresLabel}` : '', terms, input.productUrl, input.unsubscribeUrl, input.postal]
        .filter((line) => line.length > 0)
        .join('\n')
    return { subject: EMAIL_RELEASE_SUBJECT, html: shell(inner, input.postal, input.unsubscribeUrl), text }
}

export function renderVoteConfirmation(input: {
    productName: string
    productUrl: string
    orderScope: OrderScope | null
    postal: string
    unsubscribeUrl: string
}): RenderedEmail {
    const terms = emailTermsLine(input.orderScope)
    const inner = `<p style="font-weight:700;">${escapeHtml(input.productName)}</p><p>${escapeHtml(EMAIL_CODE_DAY)}</p><p>${escapeHtml(terms)}</p>${pillLink(input.productUrl, EMAIL_VIEW_PRODUCT)}`
    const text = [input.productName, EMAIL_CODE_DAY, terms, input.productUrl, input.unsubscribeUrl, input.postal].join('\n')
    return { subject: EMAIL_CONFIRM_SUBJECT, html: shell(inner, input.postal, input.unsubscribeUrl), text }
}

export { EMAIL_TERMS_FIRST }
