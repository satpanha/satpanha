"use client";

import { useLocale } from "@/lib/locale";
import { isPlaceholder } from "@/lib/content";
import { getBodyById, SOLAR_BODIES, type SectionId } from "@/lib/solar-system";

function Text({ value }: { value: string }) {
  return isPlaceholder(value) ? (
    <span className="text-accent2">{value}</span>
  ) : (
    <>{value}</>
  );
}

function LinkList({ links }: { links: { label: string; href: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
      {links.map((l) => (
        <li key={l.label}>
          {isPlaceholder(l.href) ? (
            <span className="micro text-accent2">
              {l.label}: {l.href}
            </span>
          ) : (
            <a
              className="micro underline underline-offset-4 hover:text-fg"
              href={l.href}
            >
              {l.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export interface SidePanelProps {
  activeId: SectionId | null;
  reducedMotion?: boolean;
  onSelectBody: (id: SectionId) => void;
  onClose: () => void;
}

export function SidePanel({
  activeId,
  reducedMotion = false,
  onSelectBody,
  onClose,
}: SidePanelProps) {
  const { content: c } = useLocale();
  const s = c.sections;

  const body = getBodyById(activeId);
  if (!activeId || !body) return null;

  const currentIdx = SOLAR_BODIES.findIndex((b) => b.id === activeId);
  const prevBody =
    SOLAR_BODIES[(currentIdx - 1 + SOLAR_BODIES.length) % SOLAR_BODIES.length];
  const nextBody = SOLAR_BODIES[(currentIdx + 1) % SOLAR_BODIES.length];

  const sectionMeta = s[body.sectionKey];
  const prevMeta = prevBody ? s[prevBody.sectionKey] : null;
  const nextMeta = nextBody ? s[nextBody.sectionKey] : null;

  return (
    <aside
      aria-label={`${sectionMeta.body} — ${sectionMeta.label}`}
      className="pointer-events-auto fixed inset-x-3 bottom-20 top-20 z-20 flex flex-col overflow-hidden border border-[var(--hairline)] bg-bg/92 backdrop-blur-md md:inset-x-auto md:bottom-20 md:right-3 md:top-16 md:w-[26rem] lg:w-[29rem]"
    >
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: body.color,
              boxShadow: reducedMotion ? "none" : `0 0 8px ${body.color}`,
            }}
            aria-hidden="true"
          />
          <p className="micro">
            [{body.shortcut}] {sectionMeta.body} / {sectionMeta.label}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => prevBody && onSelectBody(prevBody.id)}
            aria-label={`${c.ui.prevBody}: ${prevMeta ? `${prevMeta.body} — ${prevMeta.label}` : ""} (←)`}
            className="micro border border-[var(--hairline)] px-2 py-1 text-muted hover:border-accent hover:text-fg"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => nextBody && onSelectBody(nextBody.id)}
            aria-label={`${c.ui.nextBody}: ${nextMeta ? `${nextMeta.body} — ${nextMeta.label}` : ""} (→)`}
            className="micro border border-[var(--hairline)] px-2 py-1 text-muted hover:border-accent hover:text-fg"
          >
            →
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={c.ui.closePanel}
            className="micro border border-[var(--hairline)] px-2.5 py-1 text-muted hover:border-accent hover:text-fg"
          >
            ESC
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeId === "home" && (
          <section aria-labelledby="panel-h-home">
            <h2 id="panel-h-home" className="text-3xl font-semibold">
              {s.home.name}
            </h2>
            <p className="mt-1 text-lg text-accent">{s.home.headline}</p>
            <p className="mt-3 text-sm text-muted">
              <Text value={s.home.pitch} />
            </p>
            <LinkList links={s.home.links} />
          </section>
        )}

        {activeId === "missions" && (
          <section aria-labelledby="panel-h-missions">
            <h2 id="panel-h-missions" className="text-xl font-semibold">
              {s.missions.intro}
            </h2>
            <div className="mt-4 space-y-3">
              {s.missions.projects.map((p) => (
                <article key={p.name} className="panel bg-bg/60">
                  <h3 className="font-semibold text-fg">{p.name}</h3>
                  <p className="mt-1.5 text-sm text-muted">
                    <Text value={p.summary} />
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="micro">{c.ui.role}</span>
                    <br />
                    <Text value={p.role} />
                  </p>
                  <p className="mt-2 text-sm">
                    <span className="micro">{c.ui.stack}</span>
                    <br />
                    {p.stack.map((t, i) => (
                      <span key={t}>
                        {i > 0 && ", "}
                        <Text value={t} />
                      </span>
                    ))}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeId === "infrastructure" && (
          <section aria-labelledby="panel-h-infra">
            <h2 id="panel-h-infra" className="text-xl font-semibold">
              {s.infrastructure.intro}
            </h2>
            <ul className="mt-4 divide-y divide-white/10 border border-[var(--hairline)]">
              {s.infrastructure.skills.map((k) => (
                <li
                  key={k.name}
                  className="flex items-center justify-between gap-4 p-3"
                >
                  <span className="font-medium">{k.name}</span>
                  <span className="text-sm text-muted">
                    <Text value={k.level} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeId === "flight-record" && (
          <section aria-labelledby="panel-h-flight">
            <h2 id="panel-h-flight" className="text-xl font-semibold">
              {s.flightRecord.intro}
            </h2>
            <ol className="mt-4 space-y-3">
              {s.flightRecord.entries.map((e) => (
                <li key={e.title} className="panel bg-bg/60">
                  <h3 className="font-semibold">{e.title}</h3>
                  <p className="micro mt-1">
                    <Text value={e.dates} />
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    <Text value={e.summary} />
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {activeId === "credentials" && (
          <section aria-labelledby="panel-h-cred">
            <h2 id="panel-h-cred" className="text-xl font-semibold">
              {s.credentials.intro}
            </h2>
            <ul className="mt-4 divide-y divide-white/10 border border-[var(--hairline)]">
              {s.credentials.items.map((i) => (
                <li
                  key={i.name}
                  className="flex items-center justify-between gap-4 p-3"
                >
                  <span>{i.name}</span>
                  <span className="micro">
                    {i.status === "planned" ? (
                      c.ui.planned
                    ) : i.status === "in-progress" ? (
                      c.ui.inProgress
                    ) : (
                      <Text value={i.status} />
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">
              {s.credentials.languages}
            </p>
          </section>
        )}

        {activeId === "comms" && (
          <section aria-labelledby="panel-h-comms">
            <h2 id="panel-h-comms" className="text-xl font-semibold">
              {s.comms.intro}
            </h2>
            <LinkList links={s.comms.links} />
          </section>
        )}
      </div>
    </aside>
  );
}
