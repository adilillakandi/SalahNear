import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'SalahNear - Admin Dashboard',
  description: 'Operations and attendance verification portal for Kerala Mosques',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased bg-slate-50">
      <body className="min-h-full flex text-slate-800">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {children}
        </div>
      </body>
    </html>
  );
}
