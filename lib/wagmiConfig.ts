import { createConfig } from "wagmi"
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector"

export const config = createConfig({
  connectors: farcasterMiniApp(),
  ssr: true,
})