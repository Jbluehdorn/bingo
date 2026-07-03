import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSRS Bingo",
  description: "Old School RuneScape Bingo tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-osrs-bg">
      <body className="flex min-h-full flex-col bg-osrs-bg text-osrs-text">
        <header className="border-b-2 border-osrs-border bg-osrs-panel-dark/95">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-2xl font-bold tracking-wide text-osrs-text-bright">
              OSRS Bingo
            </Link>
            <Link
              href="/admin"
              className="rounded border border-osrs-border px-3 py-2 text-sm font-semibold text-osrs-text hover:bg-osrs-panel"
            >
              ⚙ Admin
            </Link>
          </nav>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
