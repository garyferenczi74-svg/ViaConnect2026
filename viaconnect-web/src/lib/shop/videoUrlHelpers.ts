/**
 * URL helpers for the bento tile video layer per Prompt #143 §6.
 *
 * categories.video_url stores the playable video URL (.mp4 in storage).
 * isPlayableVideoUrl guards rendering so a tile only mounts a <video> when
 * the configured url is a supported video file.
 */

export function isPlayableVideoUrl(url: string | null | undefined): url is string {
    if (!url) return false
    const lower = url.toLowerCase()
    return lower.endsWith('.mp4') || lower.endsWith('.webm')
}
