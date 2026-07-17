"use client";

import { useQuery } from "@tanstack/react-query";

import { getAlerts } from "./get-alerts";
import type { AlertListParams } from "../types/alert";

export function useAlerts(params: AlertListParams) {
  return useQuery({
    queryKey: ["alerts", params],
    queryFn: () => getAlerts(params),

    // Alert เป็นข้อมูลที่เปลี่ยนได้ตามเวลา
    // จึงให้ดึงข้อมูลใหม่ทุก 10 วินาที
    refetchInterval: 10_000,
  });
}
