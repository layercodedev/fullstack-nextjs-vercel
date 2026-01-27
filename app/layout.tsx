// app/layout.tsx
//
// Purpose
// -------
// Root layout for the Next.js application. Wraps all pages with shared
// HTML structure, fonts, and global styles.
//
// Responsibilities
// ----------------
// • Define HTML document structure and language.
// • Load and apply Geist font family (sans and mono variants).
// • Set page metadata (title, description) for SEO.
// • Apply global CSS styles via globals.css.
//
// Notes
// -----
// • This is a Server Component by default (no 'use client' directive).
// • Metadata here applies to all pages unless overridden.
//

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Layercode Voice AI Demo",
  description: "Add Voice AI to Your Next.js App with Layercode",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
