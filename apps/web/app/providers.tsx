"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { defineChain } from "viem";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

const zeroGTestnet = defineChain({
  id: 16602,
  name: "0G Testnet",
  network: "0g-testnet",
  nativeCurrency: {
    name: "OG",
    symbol: "OG",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Explorer",
      url: "https://scan-testnet.0g.ai",
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#8B5CF6",
          logo: "/logo.svg",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: zeroGTestnet,
        supportedChains: [zeroGTestnet],
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrivyProvider>
  );
}
