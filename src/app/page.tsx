import { Metadata } from "next";
import App from "./app";
import { buildQStoragePublicUrl } from "~/lib/qstorage";

const appUrl = process.env.NEXT_PUBLIC_URL 
  ? process.env.NEXT_PUBLIC_URL 
  : process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

export const revalidate = 300;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const url = new URL('/', appUrl);
  Object.entries(await searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      url.searchParams.append(key, value);
    }
  });

  let imgUrl = `${appUrl}/api/og`;
  const imageUrl = url.searchParams.get('imageUrl');
  const imageKey = url.searchParams.get('imageKey');
  
  if (imageUrl) {
    imgUrl = imageUrl;
  } else if (imageKey) {
    imgUrl = buildQStoragePublicUrl(imageKey);
  } else {
    // Pass relevant match params to the OG generator if present
    const ogParams = new URLSearchParams();
    ['home', 'away', 'homeScore', 'awayScore', 'status', 'league', 'isLive'].forEach(p => {
      const val = url.searchParams.get(p);
      if (val) ogParams.set(p, val);
    });
    const queryString = ogParams.toString();
    if (queryString) {
      imgUrl += `?${queryString}`;
    }
  }

  // Removed debug console.log
  const frame = {
    version: "next",
    imageUrl: imgUrl,
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
  
  return {
    title: "Footy App",
    openGraph: {
      title: "Footy App",
      description: "Live scores, fan clubs, and the Farcaster FEPL table.",
      images: [
        {
          url: imgUrl,
          width: 600,
          height: 400,
          alt: "Footy App mini app cover",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Footy App",
      description: "Live scores, fan clubs, and the Farcaster FEPL table.",
      images: [imgUrl],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
      "fc:frame:image": imgUrl,
      "fc:frame:image:aspect_ratio": "1.91:1",
    },
  };
}

export default function Home() {
  return <App />;
}
