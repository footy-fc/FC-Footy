import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import "~/app/globals.css";
import { Providers } from "~/app/providers";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Footy App",
  description: "Live scores, fan clubs, and the Farcaster FEPL table.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Import Bebas Neue - local now in public*/}
 {/*        <link
          href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
          rel="stylesheet"
        /> */}
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable} flex justify-center bg-black text-white m-0`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
