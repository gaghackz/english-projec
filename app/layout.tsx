import type React from "react";
import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

// Configure Instrument Serif for headings
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"], // Instrument Serif usually only comes in 400 weight
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

// Configure Inter for clean, readable body text in the chat UI
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Peak | Elevate Your Writing",
  description:
    "An interactive, AI-powered writing tutor that helps you master grammar and the 'Show, Don't Tell' rule.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${sans.variable} h-full antialiased`}
    >
      {/* Set the default font to our sans-serif, and apply the background colors from the UI we built */}
      <body className="min-h-full flex flex-col font-sans bg-bombon-dark text-bombon-textMain">
        {children}
      </body>
    </html>
  );
}
