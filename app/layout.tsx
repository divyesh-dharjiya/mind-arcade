import type { Metadata, Viewport } from "next";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mind Arcade — brain games with levels",
    template: "%s · Mind Arcade",
  },
  description:
    "Eight brain-training puzzle games — Arrow Escape, Brick Breaker, Light Flip, Slide Puzzle, Memory Match, Pattern Recall, Color Sort and Pipe Connect — each with levels that introduce new concepts.",
};

export const viewport: Viewport = {
  themeColor: "#070b1a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
