import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import WebGLBackground from "@/components/layout/WebGLBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Safety_AI | Hackathon Project",
  description: "An AI-powered industrial safety platform built for the hackathon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${syne.variable} antialiased selection:bg-white/20 selection:text-white`}>
        <div className="noise-overlay" />
        <WebGLBackground />
        {children}
      </body>
    </html>
  );
}
