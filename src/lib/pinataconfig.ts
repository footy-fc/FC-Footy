"server only"

import { PinataSDK } from "pinata-web3"

export const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINTATAJWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINTATAGATEWAY!,
})