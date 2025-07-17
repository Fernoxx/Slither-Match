declare module '@farcaster/miniapp-wagmi-connector' {
  import { Chain, Connector } from 'wagmi'

  export function farcasterMiniApp(): Connector
}
