"use client";

import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { SESSION_QUERY_KEY } from "@/lib/auth";

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: ({ signal }) => getSession(signal),
    staleTime: 60_000,
    retry: (count, err) => !(err instanceof ApiError && err.status === 401) && count < 1,
  });
}
