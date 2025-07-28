import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nacrelune',
  description: 'Design your own custom jewelry with Nacrelune.',
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
