import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ViaConnect GeneX360 | Precision Health Platform',
  description: 'Clinical-grade precision health platform by FarmCeutica Wellness LLC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700&family=JetBrains+Mono&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background-light text-slate-900 antialiased dark:bg-background-dark dark:text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
