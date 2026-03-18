import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Cinzel_Decorative, Space_Mono } from 'next/font/google';
import './globals.css';
import { ClientLayout } from './client-layout';

const inter = Inter({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const cinzelDecorative = Cinzel_Decorative({ subsets: ['latin'], variable: '--font-cinzel', weight: ['400', '700'] });
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', weight: ['400'] });

export const metadata: Metadata = {
  title: 'LeadOS — Autonomous Lead Generation Platform',
  description: 'Multi-agent AI platform for autonomous B2B service lead generation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} ${spaceGrotesk.variable} ${cinzelDecorative.variable} ${spaceMono.variable} bg-[#020205] text-gray-100 antialiased`} suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
