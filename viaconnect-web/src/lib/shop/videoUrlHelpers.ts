/**
 * URL helpers for the bento tile video layer per Prompt #143 §6.
 *
 * categories.video_url stores the .mp4 URL. The .webm sibling URL is
 * constructed at render time by replacing the file extension. If only
 * one encoding exists in storage, the browser falls back to the next
 * available <source> when the first 404s. Per #143 spec recommendation
 * Gary uploads both encodings per category; this helper supports either.
 */

export function buildWebmUrlFromMp4(mp4Url: string): string {
    // Replace only the trailing .mp4 to leave any embedded .mp4 substrings alone
    if (mp4Url.toLowerCase().endsWith('.mp4')) {
        return mp4Url.slice(0, -4) + '.webm'
    }
    return mp4Url
}

export function isPlayableVideoUrl(url: string | null | undefined): url is string {
    if (!url) return false
    const lower = url.toLowerCase()
    return lower.endsWith('.mp4') || lower.endsWith('.webm')
}
