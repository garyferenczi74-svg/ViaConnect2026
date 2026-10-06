export default function Image({
    alt,
    src,
    className,
}: {
    alt?: string
    src?: string
    className?: string
}) {
    const cover = className?.includes('object-cover') === true
    const top = className?.includes('object-top') === true
    return (
        <img
            alt={alt ?? ''}
            src={typeof src === 'string' ? src : ''}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: cover ? 'cover' : 'contain',
                objectPosition: top ? 'center top' : 'center',
            }}
        />
    )
}
