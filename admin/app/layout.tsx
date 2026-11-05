import type { Metadata } from 'next';
import './globals.css';
import { AdminAuthProvider } from '@/lib/auth-context';
import AdminLayoutWrapper from '@/components/AdminLayoutWrapper';

export const metadata: Metadata = {
  title: 'SalahNear - Administrative Portal',
  description: 'Operations, mosque verification, and attendance integrity for Kerala Mosques',
};

// Next.js 16 Partial Prefetching / Instant Navigation validation flag
export const instant = false;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased bg-slate-50">
      <body className="min-h-full">
        <AdminAuthProvider>
          <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
