'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import SocialIcons from './SocialIcons';
import { DONATE_URL, NAV_ITEMS } from '@/lib/constants';

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="nav">
        <Link href="/" className="logo">
          <span className="logo-text">
            <span className="roy">ROY</span>
            <span className="cooper">COOPER</span>
            <span className="for-nc">for north carolina</span>
          </span>
          <svg className="logo-state" viewBox="0 0 80 32" aria-hidden="true">
            <path
              d="M2 22 L8 14 L16 18 L24 10 L34 14 L44 8 L54 12 L62 6 L72 10 L78 16 L74 22 L62 24 L48 22 L34 26 L20 24 L10 26 Z"
              fill="white"
              opacity=".95"
            />
          </svg>
        </Link>

        <nav className="menu" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="social" aria-label="Social channels">
          <SocialIcons />
        </div>

        <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" className="donate-btn">
          Donate
        </a>

        <button
          className="hamburger"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Mobile sheet */}
      <div className={`mobile-sheet${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
        <button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </button>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-donate"
          onClick={() => setOpen(false)}
        >
          Donate
        </a>
        <div className="social" aria-label="Social channels">
          <SocialIcons />
        </div>
      </div>
    </>
  );
}
