import "@/styles/globals.css"
import type { AppProps } from "next/app"
import { WagmiProvider, createConfig, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector"

const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [farcasterMiniApp], // Remove the parentheses here too
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http()
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