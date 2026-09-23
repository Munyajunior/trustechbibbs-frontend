"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

import { ApiError } from "@/lib/api/client";

/**
 * Client-side providers.
 *
 * The QueryClient is created inside `useState` so each browser session gets one
 * instance, and — critically — server renders never share a cache between
 * requests (which would leak one user's data into another's response).
 *
 * NextIntlClientProvider is NOT needed here: with next-intl v4 the App Router
 * integration supplies messages to client components automatically.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Sensible default; per-resource windows live in STALE_TIME.
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry a client error — the request is wrong, not unlucky.
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
