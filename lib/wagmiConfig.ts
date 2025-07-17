import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterFrame } from '@farcaster/frame-wagmi-connector'

export const config = createConfig({
  chains: [base],
  connectors: [farcasterFrame()],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
})
