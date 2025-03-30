import { Metadata } from "next";
import App from "./app";
import { Providers } from "./providers";

const appUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

export const revalidate = 300;

export async function generateMetadata({ params, searchParams }): Promise<Metadata> {
    // Build the path from params
  const path = params.slug ? `/${params.slug.join('/')}` : '/';
  
  // Create URL instance
  const url = new URL(path, appUrl);
  
  // Add all search parameters
  Object.entries(await searchParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  const frame = {
    version: "next",
    imageUrl: `${appUrl}/opengraph-image`,
    button: {
      title: "FC Footy App",
      action: {
        type: "launch_frame",
        name: "FC Footy App",
        url: url.href,
        splashImageUrl: `${appUrl}/defifa_spinner.gif`,
        splashBackgroundColor: "#010513",
      },
    },
  };

  console.log(frame);
  
  return {
    title: "FC Footy App",
    openGraph: {
      title: "FC Footy App",
      description: "FC Footy App: Live Match Summaries, Fantasy League, Banter bot, Collectables & Contests",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {

  return (
    <Providers>
      <App />
    </Providers>
  );
}
