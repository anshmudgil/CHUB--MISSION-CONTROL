import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mission Control VOS',
  description: 'Velocity OS — Autonomous AI Agent Operating System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
