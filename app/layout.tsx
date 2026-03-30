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
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] antialiased">
        <main className="pb-20">{children}</main>
      </body>
    </html>
  );
}
