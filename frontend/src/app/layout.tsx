import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chat with AI',
  description: 'Minimalist chat with ChatGPT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
