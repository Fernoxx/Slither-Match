import "@/styles/globals.css"
import type { AppProps } from "next/app"
import { WagmiProvider, createConfig, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors"
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector"

// Reliable Base RPC endpoints
const BASE_RPC_URL = 'https://base.blockpi.network/v1/rpc/public'
const BASE_SEPOLIA_RPC_URL = 'https://base-sepolia.blockpi.network/v1/rpc/public'

const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    farcasterMiniApp(),
    injected(),
    metaMask(),
    coinbaseWallet({ appName: "SlitherMatch" })
  ],
  ssr: true,
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL)
  }
})

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  )
}