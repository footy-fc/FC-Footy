"server only"

import { PinataSDK } from "pinata-web3"

export const pinata = new PinataSDK({
  // Prefer server-only secrets; fallback to public env if needed
  pinataJwt: (process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATAJWT)!,
  pinataGateway: (process.env.PINATA_GATEWAY || process.env.NEXT_PUBLIC_PINATAGATEWAY)!,
})