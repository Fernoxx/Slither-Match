import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: () => [farcasterMiniApp()],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http()
  }
})
