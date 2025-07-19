// Global type declarations for browser window extensions

declare global {
  interface Window {
    ethereum?: {
      request: (request: { method: string; params?: Array<any> }) => Promise<any>
      isMetaMask?: boolean
      isCoinbaseWallet?: boolean
    }
  }
}

export {};