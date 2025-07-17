import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { createConfig } from "wagmi";

export const config = createConfig(
  farcasterMiniApp({ chains: farcasterChains })
);