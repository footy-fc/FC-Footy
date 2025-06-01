import * as Client from 'fhub/Client'
import * as Transport from 'fhub/Transport'

export const fhubClient = Client.create(
  Transport.grpcNode({ baseUrl: 'https://hub.merv.fun' }),
)
