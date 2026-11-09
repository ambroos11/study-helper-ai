import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Learnova — Study smarter. Achieve more.',
  description: 'Your personal AI-powered study space with an AI tutor, flashcards and practice mode.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nl"><body>{children}</body></html>;
}
