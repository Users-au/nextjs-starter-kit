import React from "react";
import { pagePreferences } from "@/lib/server-preferences";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Next.js Usersau Starter Kit",
  description: "A Next.js starter kit with Usersau OAuth integration",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preferences = await pagePreferences();
  const theme = preferences?.theme || 'system';
  return (
    <html lang={preferences?.locale || 'en'} data-theme={theme} className={theme === 'dark' ? 'dark' : undefined} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "(()=>{const t=document.documentElement.dataset.theme;document.documentElement.classList.toggle('dark',t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches))})()" }} /></head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
