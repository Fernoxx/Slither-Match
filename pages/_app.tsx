import "@/styles/globals.css"
import type { AppProps } from "next/app"
import { WagmiProvider, createConfig, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors"

const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: "SlitherMatch" })
  ],
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