import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";

export const metadata: Metadata = {
  title: "Farcaster Footy App",
  description: "Farcaster Footy App: Live Match Summaries, Fantasy League, Banter bot, Collectables & Contests",
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
      <body className="flex justify-center bg-black text-white m-0">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
