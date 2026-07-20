"use client";

import { useQuery } from "@tanstack/react-query";

import { getAssets } from "./get-assets";

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: getAssets,
    refetchInterval: 30_000,
  });
}
