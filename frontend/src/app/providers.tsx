"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { setUnauthorizedHandler } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
          },
        },
      }),
  );
  const router = useRouter();

  React.useEffect(() => {
    let redirecting = false;
    setUnauthorizedHandler(() => {
      if (redirecting) return;
      const here = window.location.pathname + window.location.search;
      if (here.startsWith("/login") || here.startsWith("/register")) return;
      redirecting = true;
      client.clear();
      router.replace(`/login?next=${encodeURIComponent(here)}&expired=1`);
    });
    return () => setUnauthorizedHandler(null);
  }, [client, router]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
