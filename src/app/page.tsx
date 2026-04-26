import { Metadata } from "next";
import App from "./app";
import { buildQStoragePublicUrl } from "~/lib/qstorage";

const appUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

export const revalidate = 300;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const url = new URL('/', appUrl);
  let imgUrl = `${appUrl}/api/og`;
  
  Object.entries(await searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      url.searchParams.append(key, value);
    }
  });

  const imageUrl = url.searchParams.get('imageUrl');
  const imageKey = url.searchParams.get('imageKey');
  if (imageUrl) {
    imgUrl = imageUrl;
  } else if (imageKey) {
    imgUrl = buildQStoragePublicUrl(imageKey);
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
    },
  };
}

export default function Home() {
  return <App />;
}
