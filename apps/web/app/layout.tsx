'use client';

import { Metadata } from 'next';
import './globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import HeaderNav from '../components/nav/HeaderNav';
import { ToastProvider } from '../components/Toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5000,
          },
        },
      }),
  );

  return (
    <html lang="id" className="dark">
      <head>
        <title>Reviewii - Platform Review Video & Foto Client</title>
        <meta name="description" content="Platform review & approval hasil video/foto editor dengan catatan timestamp." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/simba-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/simba-logo.png" />
      </head>
      <body className="min-h-screen" style={{ backgroundColor: '#07090e' }}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <div className="min-h-screen flex flex-col">
              <HeaderNav />
              <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 md:px-6 md:py-6">{children}</main>
            </div>
          </ToastProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
