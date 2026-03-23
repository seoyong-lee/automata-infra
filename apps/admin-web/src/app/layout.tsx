import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import '@fontsource/pretendard/400.css';
import '@fontsource/pretendard/500.css';
import '@fontsource/pretendard/600.css';
import '@fontsource/pretendard/700.css';
import '@fontsource/pretendard/800.css';

import { getAdminLocale, getAdminMessages } from '@/i18n/get-messages';

import { Providers } from './providers/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Automata Studio',
  description: 'Content Pipeline Admin',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getAdminLocale();
  const messages = getAdminMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
