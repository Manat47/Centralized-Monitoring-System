import { authenticatedFetch } from "@/app/lib/authenticated-fetch";

import type {
  GenerateReportInput,
  ListReportsParams,
  ReportListItem,
  ReportListResponse,
} from "../types/report";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3005/api";

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };

    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }

    return body.message ?? `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

export async function getReports(
  params: ListReportsParams,
): Promise<ReportListResponse> {
  const search = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });

  if (params.reportType) search.set("reportType", params.reportType);
  if (params.status) search.set("status", params.status);
  if (params.assetId) search.set("assetId", params.assetId);

  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/reports?${search.toString()}`,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load reports: ${await getErrorMessage(response)}`,
    );
  }

  return (await response.json()) as ReportListResponse;
}

export async function generateReport(
  input: GenerateReportInput,
): Promise<ReportListItem> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/reports/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Report generation failed: ${await getErrorMessage(response)}`,
    );
  }

  return (await response.json()) as ReportListItem;
}

export async function downloadReport(reportId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${API_GATEWAY_URL}/reports/${reportId}/download`,
  );

  if (!response.ok) {
    throw new Error(
      `Report download failed: ${await getErrorMessage(response)}`,
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `monitoring-report-${reportId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
