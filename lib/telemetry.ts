import { isPlaceholder } from "@/lib/content";

export interface TelemetryData {
  commitSha: string;
  deployedAt: string;
  pipelineStatus: string;
  lighthouseScore: number;
}

export type TelemetryState =
  | { status: "loading" }
  | { status: "ready"; data: TelemetryData }
  | { status: "unavailable" };

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || isPlaceholder(trimmed)) return null;
  return trimmed;
}

function readLighthouseScore(value: unknown): number | null {
  if (typeof value === "number") {
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return Math.round(value);
    }
    return null;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const perf = (value as Record<string, unknown>).performance;
    if (typeof perf === "number" && Number.isFinite(perf) && perf >= 0 && perf <= 100) {
      return Math.round(perf);
    }
  }
  return null;
}

/**
 * Validate raw JSON from /telemetry.json.
 * Returns null when any required field is missing or invalid. Never fakes values.
 */
export function parseTelemetry(raw: unknown): TelemetryData | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  const commitSha = readNonEmptyString(
    record.commit_sha ?? record.commitSha ?? record.commit ?? record.sha
  );
  const deployedAt = readNonEmptyString(
    record.deployed_at ?? record.deployedAt
  );
  const pipelineStatus = readNonEmptyString(
    record.pipeline_status ?? record.pipelineStatus ?? record.pipeline ?? record.status
  );
  const lighthouseScore = readLighthouseScore(
    record.lighthouse_score ?? record.lighthouseScore ?? record.lighthouse
  );

  if (!commitSha || !deployedAt || !pipelineStatus || lighthouseScore === null) {
    return null;
  }

  return {
    commitSha,
    deployedAt,
    pipelineStatus,
    lighthouseScore,
  };
}

export function formatShortSha(commitSha: string): string {
  const trimmed = commitSha.trim();
  return trimmed.length > 7 ? trimmed.slice(0, 7) : trimmed;
}

/**
 * Fetch and validate /telemetry.json.
 * Returns null if the file is missing (e.g. before Stage 5 pipeline runs) or invalid.
 */
export async function fetchTelemetry(
  fetchImpl: typeof fetch | undefined = typeof fetch !== "undefined" ? fetch : undefined,
  url = "/telemetry.json"
): Promise<TelemetryData | null> {
  if (typeof fetchImpl !== "function") {
    return null;
  }

  try {
    const response = await fetchImpl(url, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return parseTelemetry(payload);
  } catch {
    return null;
  }
}
