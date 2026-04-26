import type { Metadata } from "next";

import "~/app/globals.css";
import { Providers } from "~/app/providers";

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
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body className="flex justify-center bg-black text-white m-0">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
