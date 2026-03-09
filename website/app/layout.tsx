import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import CustomCursor from "@/components/CustomCursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Guardian — Real-Time Violence Detection",
  description:
    "Protecting streets, offices, and public spaces with AI-powered threat detection. Instant alerts to police and security in seconds, not minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased noise">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
