"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale";
import {
  fetchTelemetry,
  formatShortSha,
  type TelemetryData,
  type TelemetryState,
} from "@/lib/telemetry";

export interface TelemetryPanelProps {
  className?: string;
  initialData?: TelemetryData | null;
}

export function TelemetryPanel({
  className = "",
  initialData,
}: TelemetryPanelProps) {
  const { content: c } = useLocale();
  const [state, setState] = useState<TelemetryState>(() =>
    initialData !== undefined
      ? initialData
        ? { status: "ready", data: initialData }
        : { status: "unavailable" }
      : { status: "unavailable" }
  );

  useEffect(() => {
    if (initialData !== undefined) return;
    let cancelled = false;

    fetchTelemetry().then((data) => {
      if (cancelled) return;
      setState(data ? { status: "ready", data } : { status: "unavailable" });
    });

    return () => {
      cancelled = true;
    };
  }, [initialData]);

  return (
    <section
      aria-label={c.ui.telemetryTitle}
      aria-live="polite"
      data-hud-panel="telemetry"
      className={`border border-[var(--hairline)] bg-bg/90 px-3 py-2 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="micro">{c.ui.telemetryTitle}</h2>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            state.status === "ready" ? "bg-accent" : "bg-accent2"
          }`}
          aria-hidden="true"
        />
      </div>

      {state.status !== "ready" ? (
        <p className="mt-1 font-mono text-xs text-muted" data-telemetry-empty="true">
          {c.ui.telemetryNoData}
        </p>
      ) : (
        <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="micro text-muted">{c.ui.telemetryCommit}</dt>
            <dd className="text-fg" title={state.data.commitSha}>
              {formatShortSha(state.data.commitSha)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="micro text-muted">{c.ui.telemetryPipeline}</dt>
            <dd className="text-accent">{state.data.pipelineStatus}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="micro text-muted">{c.ui.telemetryLighthouse}</dt>
            <dd className="text-fg">{state.data.lighthouseScore}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="micro text-muted">{c.ui.telemetryDeployedAt}</dt>
            <dd className="truncate text-muted" title={state.data.deployedAt}>
              {state.data.deployedAt}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
