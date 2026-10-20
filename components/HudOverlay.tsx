"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { useLocale } from "@/lib/locale";
import {
  getBodyById,
  SOLAR_BODIES,
  type SectionId,
} from "@/lib/solar-system";
import type { TelemetryData } from "@/lib/telemetry";

export interface HudOverlayProps {
  activeId: SectionId | null;
  reducedMotion?: boolean;
  initialTelemetry?: TelemetryData | null;
  onSelectBody: (id: SectionId) => void;
  onHoverBody: (id: SectionId | null) => void;
  onOverview: () => void;
  onSwitchToFlat: () => void;
}

export function HudOverlay({
  activeId,
  reducedMotion = false,
  initialTelemetry,
  onSelectBody,
  onHoverBody,
  onOverview,
  onSwitchToFlat,
}: HudOverlayProps) {
  const { content: c } = useLocale();
  const s = c.sections;

  const activeBody = getBodyById(activeId);
  const activeSection = activeBody ? s[activeBody.sectionKey] : null;

  return (
    <>
      {/* Top-Left Corner Panel: Mission Control Identity & Focused Body Readout */}
      <header
        data-hud-corner="top-left"
        className="pointer-events-auto fixed left-3 top-3 z-20 max-w-[calc(100vw-1.5rem)] border border-[var(--hairline)] bg-bg/90 px-3.5 py-2.5 backdrop-blur-sm sm:max-w-md"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOverview}
            aria-label={`${c.ui.missionControl} — ${s.home.name} (${c.ui.overview})`}
            className="micro text-left hover:text-fg"
          >
            {c.ui.missionControl} // {s.home.name}
          </button>
        </div>

        <div
          aria-live="polite"
          data-hud-readout="focused-body"
          className="mt-1.5 flex items-center gap-2 border-t border-[var(--hairline)] pt-1.5"
        >
          <span className="micro text-muted">{c.ui.focusedBody}:</span>
          {activeBody && activeSection ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: activeBody.color,
                  boxShadow: reducedMotion ? "none" : `0 0 6px ${activeBody.color}`,
                }}
                aria-hidden="true"
              />
              <span>
                [{activeBody.shortcut}] {activeSection.body} — {activeSection.label}
              </span>
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">
              {c.ui.systemOverview}
            </span>
          )}
        </div>
      </header>

      {/* Top-Right Corner Panel: Always-Visible Flat View Toggle & Language Switch */}
      <div
        role="region"
        aria-label={c.ui.missionControl}
        data-hud-corner="top-right"
        className="pointer-events-auto fixed right-3 top-3 z-20 flex flex-wrap items-center gap-2 border border-[var(--hairline)] bg-bg/90 px-3 py-2 backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={onSwitchToFlat}
          aria-label={c.ui.flatView}
          className="micro border border-[var(--hairline)] px-2.5 py-1 text-fg hover:border-accent hover:bg-accent/10"
        >
          {c.ui.flatView}
        </button>
        <Link
          href="/flat/"
          className="micro hidden border border-[var(--hairline)] px-2.5 py-1 text-muted hover:border-accent hover:text-fg sm:inline-block"
        >
          /flat
        </Link>
        <LanguageSwitch />
      </div>

      {/* Bottom-Left Corner Panel: Telemetry Readout (/telemetry.json) */}
      <div
        data-hud-corner="bottom-left"
        className="pointer-events-auto fixed bottom-24 left-3 z-20 w-72 max-w-[calc(100vw-1.5rem)] sm:bottom-16"
      >
        <TelemetryPanel initialData={initialTelemetry} />
      </div>

      {/* Bottom-Right / Bottom Corner Panel: Body Selector & Keyboard Hints */}
      <nav
        id="solar-nav"
        aria-label={c.ui.sections}
        data-hud-corner="bottom-right"
        className="pointer-events-auto fixed inset-x-3 bottom-3 z-20 border border-[var(--hairline)] bg-bg/90 px-3 py-2 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <ul className="flex flex-wrap items-center gap-1.5">
            <li>
              <button
                type="button"
                onClick={onOverview}
                aria-pressed={activeId === null}
                aria-label={`${c.ui.allBodies} (Esc)`}
                className={`micro border px-2.5 py-1 ${
                  activeId === null
                    ? "border-accent bg-accent/15 text-fg"
                    : "border-[var(--hairline)] text-muted hover:border-accent hover:text-fg"
                }`}
              >
                [ESC] {c.ui.allBodies}
              </button>
            </li>
            {SOLAR_BODIES.map((body) => {
              const sec = s[body.sectionKey];
              const isSelected = activeId === body.id;
              return (
                <li key={body.id}>
                  <button
                    type="button"
                    onClick={() => onSelectBody(body.id)}
                    onMouseEnter={() => onHoverBody(body.id)}
                    onMouseLeave={() => onHoverBody(null)}
                    aria-pressed={isSelected}
                    aria-label={`${sec.body}: ${sec.label} (${body.shortcut})`}
                    className={`micro border px-2.5 py-1 ${
                      isSelected
                        ? "border-accent bg-accent/15 text-fg"
                        : "border-[var(--hairline)] text-muted hover:border-accent hover:text-fg"
                    }`}
                  >
                    [{body.shortcut}] {sec.body} · {sec.label}
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            aria-label={c.ui.keyHintsLabel}
            data-hud-panel="key-hints"
            className="micro flex flex-wrap items-center gap-2 text-muted"
          >
            <span>{c.ui.keyHintsSelect}</span>
            <span aria-hidden="true">·</span>
            <span>{c.ui.keyHintsCycle}</span>
            <span aria-hidden="true">·</span>
            <span>{c.ui.keyHintsReset}</span>
          </div>
        </div>
      </nav>
    </>
  );
}
