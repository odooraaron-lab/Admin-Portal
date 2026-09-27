import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `${process.env.BRAND_NAME || 'HQ'} admin`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Instrument+Sans:wght@400..600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
