import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Automata Studio',
  description: 'Content Pipeline Admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
