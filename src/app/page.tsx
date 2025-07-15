import { Metadata } from "next";
import App from "./app";
import { Providers } from "./providers";

const appUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';

export const revalidate = 300;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const url = new URL('/', appUrl);
  let imgUrl = `${appUrl}/opengraph-image`;
  
  Object.entries(await searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      url.searchParams.append(key, value);
    }
  });

  if (url.searchParams.has('ipfsHash')) {
    const ipfsHash = url.searchParams.get('ipfsHash');
    if (ipfsHash) {
      imgUrl = `https://tan-hidden-whippet-249.mypinata.cloud/ipfs/${ipfsHash}`;
    }
  }

  console.log('kmm', url, imgUrl);
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
      description: "⚽️ match previews, summaries, notifications, Farcaster fantasy league & onchain fan experiences",
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