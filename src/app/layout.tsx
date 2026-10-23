import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Celebration Planner: weddings, birthdays and community events',
  description:
    'Get a budget split, a dated timeline, a vendor checklist and personalised ideas for your wedding, birthday or community event.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Opt into per-request rendering so the CSP nonce set in proxy.ts reaches Next.js scripts.
  await connection();

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
