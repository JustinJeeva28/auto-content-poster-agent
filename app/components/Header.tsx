// app/components/Header.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const navItems = [
    { href: '/', label: 'Generator' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  return (
    <header className="w-full max-w-5xl mx-auto p-4 flex justify-between items-center">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        <Bot size={28} />
        <span>Content Agent</span>
      </Link>
      <nav className="flex gap-4 bg-gray-800 p-2 rounded-lg">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'bg-purple-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}