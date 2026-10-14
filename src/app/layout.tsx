import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Telugu, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const notoSansTelugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  weight: ['400', '600', '700'],
  variable: '--font-telugu',
});

export const metadata: Metadata = {
  title: 'Telugu Learning Platform',
  description: 'Evidence-based conversational Telugu learning with FSRS spaced repetition',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="te" className={`${inter.variable} ${notoSansTelugu.variable}`}>
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans">
        {children}
      </body>
    </html>
  );
}
