import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Reliable Base RPC endpoints
const BASE_RPC_URL = 'https://base.blockpi.network/v1/rpc/public'
const BASE_SEPOLIA_RPC_URL = 'https://base-sepolia.blockpi.network/v1/rpc/public'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [farcasterMiniApp()],
  ssr: true,
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL)
  }
})
