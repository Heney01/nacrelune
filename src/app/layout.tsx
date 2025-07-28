import './globals.css';
import { ReactNode } from 'react';

// Since we're using a dynamic route for locales, this root layout is minimal.
// The actual layout logic is in src/app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
        <body>
            {children}
        </body>
    </html>
  );
}
