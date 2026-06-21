import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEON CLASH — 3D Fighter",
  description: "A realistic 3D browser fighting game built with Next.js + Three.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Display font for the fighting-game HUD */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Russo+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
