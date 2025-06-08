import {BASE_URL} from '../../../lib/config';
export async function GET() {
  const appUrl = BASE_URL || 'https://fc-footy.vercel.app';
  const header = process.env.NEXT_PUBLIC_HEADER;
  const payload = process.env.NEXT_PUBLIC_PAYLOAD;
  const signature = process.env.NEXT_PUBLIC_SIGNATURE;

  const config = {
    "accountAssociation": {
      "header": header,
      "payload": payload,
      "signature": signature
    },
    frame: {
      version: "0.0.1",
      name: "Footy App",
      iconUrl: `${appUrl}/512.png`,
      splashImageUrl: `${appUrl}/defifa_spinner.gif`,
      splashBackgroundColor: "#010513",
      homeUrl: appUrl,
      heroImageUrl: `${appUrl}/opengraph-image`,
      webhookUrl: `${appUrl}/api/webhook`,
      subtitle: "Footy fun in farcaster",
      description: "Match previews, summaries, Farcaster fantasy league, money games and onchain fan experiences",
      primaryCategory: "entertainment",
      tags: ["sports", "soccer", "football", "fantasy", "games"],
      tagline: "The beautiful game onchain",
      ogTitle: "Footy App",
      ogDescription: "Match previews, summaries, Farcaster fantasy league, money games and onchain fan experiences",
      ogImageUrl: `${appUrl}/opengraph-image`,
      castShareUrl: "https://fc-footy.vercel.app",
    },
  };

  return Response.json(config);
}

export const runtime = 'edge';