import { createConfig, createClient, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { farcasterFrame } from "@farcaster/frame-wagmi-connector"

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [farcasterFrame()],
  ssr: true,
  client: createClient({
    chains: [base, baseSepolia],
    transport: http()
  })
})