import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roy Cooper for North Carolina',
  description: 'Fighting for North Carolina — join the team.',
  openGraph: {
    title: 'Roy Cooper for North Carolina',
    description: 'Fighting for North Carolina — join the team.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="utility-bar">
          <a
            href="https://secure.actblue.com/donate/roy-cooper"
            target="_blank"
            rel="noopener noreferrer"
          >
            Donate to become a founding member of our campaign now ▶
          </a>
        </div>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
