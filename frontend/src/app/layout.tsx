import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Communify - Report Accessibility Barriers',
  description: 'Help make your community more accessible by reporting barriers that affect mobility.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#0f0f0f] text-gray-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
