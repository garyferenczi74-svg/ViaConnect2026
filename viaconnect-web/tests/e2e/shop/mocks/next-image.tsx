export default function Image({
    alt,
    src,
}: {
    alt?: string
    src?: string
    className?: string
}) {
    return (
        <img
            alt={alt ?? ''}
            src={typeof src === 'string' ? src : ''}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
        />
    )
}
