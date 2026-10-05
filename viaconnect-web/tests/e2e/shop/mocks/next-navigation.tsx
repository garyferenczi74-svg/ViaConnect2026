export function usePathname(): string {
    return '/shop/advanced-formulas'
}

export function useRouter() {
    return {
        push: () => undefined,
        replace: () => undefined,
        refresh: () => undefined,
    }
}

export function useSearchParams(): URLSearchParams {
    return new URLSearchParams()
}
