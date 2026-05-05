import type { Metadata } from 'next';
import './globals.css';
import { ThemeBootstrap } from '@/components/ThemeBootstrap';
import { ToastProvider } from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'AI Chat App',
  description: 'AI chat with saved dialogs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeBootstrap />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
