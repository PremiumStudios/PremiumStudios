import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import NotificationSystem from '@/components/notifications/NotificationSystem';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Premium Sessions - AI-Powered Studio Marketplace',
  description: 'Just tell our AI what you need - "book me 2 hours tonight under $250" - and we\'ll handle the rest. Instant payouts, loyalty rewards, SMS convenience.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
        <div className="fixed top-4 right-4 z-50">
          <NotificationSystem />
        </div>
      </body>
    </html>
  );
}
