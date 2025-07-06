// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Content Agent Dashboard',
  description: 'AI-powered content generation and management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <nav className="bg-gray-800 p-4 rounded-lg shadow-xl flex items-center justify-between">
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Content Agent
                    </h1>
                    <div className="flex gap-4">
                        <Link href="/" className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-700 transition">Generator</Link>
                        <Link href="/dashboard" className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-700 transition">Dashboard</Link>
                    </div>
                </nav>
            </header>
            <main>
                {children}
            </main>
        </div>
      </body>
    </html>
  );
}