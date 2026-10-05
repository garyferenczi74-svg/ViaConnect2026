import path from 'node:path'
import { defineConfig } from 'vite'

const root = path.resolve(__dirname, '../../..')

export default defineConfig({
    esbuild: { jsx: 'automatic' },
    resolve: {
        alias: {
            '@': path.resolve(root, 'src'),
            'next/link': path.resolve(__dirname, 'mocks/next-link.tsx'),
            'next/image': path.resolve(__dirname, 'mocks/next-image.tsx'),
            'next/navigation': path.resolve(__dirname, 'mocks/next-navigation.tsx'),
            '@/lib/shop/cart-actions': path.resolve(__dirname, 'mocks/cart-actions.ts'),
        },
    },
    define: {
        'process.env.NODE_ENV': '"production"',
    },
    build: {
        outDir: '/tmp/sash-fit-46e3',
        emptyOutDir: true,
        lib: {
            entry: path.resolve(__dirname, 'sash-fit-entry.tsx'),
            formats: ['iife'],
            name: 'SashFit',
            fileName: () => 'sash-fit.js',
        },
        rollupOptions: {
            output: { inlineDynamicImports: true },
        },
    },
})
