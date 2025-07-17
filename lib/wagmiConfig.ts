import { createConfig } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { farcasterFrame } from "@farcaster/frame-wagmi-connector"

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [farcasterFrame()],
  ssr: true,
})
