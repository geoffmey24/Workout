import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ELITE COACH',
  description: 'AI-powered elite performance coaching',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#f8f9fa] text-[#111827] antialiased">
        <main className="pb-20">{children}</main>
      </body>
    </html>
  );
}
