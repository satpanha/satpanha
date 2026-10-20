"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TelemetryPanel } from "@/components/TelemetryPanel";
import { useLocale } from "@/lib/locale";
import { isPlaceholder } from "@/lib/content";

function Text({ value }: { value: string }) {
  // Placeholders are shown visibly so unfinished content is never mistaken for fact.
  return isPlaceholder(value) ? <span className="text-accent2">{value}</span> : <>{value}</>;
}

function LinkList({ links }: { links: { label: string; href: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
      {links.map((l) => (
        <li key={l.label}>
          {isPlaceholder(l.href) ? (
            <span className="micro text-accent2">{l.label}: {l.href}</span>
          ) : (
            <a className="micro underline underline-offset-4" href={l.href}>{l.label}</a>
          )}
        </li>
      ))}
    </ul>
  );
}

export interface FlatViewProps {
  onSwitchTo3D?: () => void;
}

export function FlatView({ onSwitchTo3D }: FlatViewProps = {}) {
  const { content: c } = useLocale();
  const s = c.sections;
  const nav = [s.home, s.missions, s.infrastructure, s.flightRecord, s.credentials, s.comms];

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only micro p-2">{c.ui.skipToContent}</a>
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 py-4">
        <p className="micro">{c.ui.missionControl} / {c.ui.flatView}</p>
        <div className="flex flex-wrap items-center gap-2">
          {onSwitchTo3D ? (
            <button
              type="button"
              onClick={onSwitchTo3D}
              aria-label={c.ui.threeDView}
              className="micro border border-accent bg-accent/10 px-3 py-1 text-fg hover:bg-accent/20"
            >
              {c.ui.threeDView}
            </button>
          ) : (
            <Link
              href="/?view=3d"
              aria-label={c.ui.threeDView}
              className="micro border border-accent bg-accent/10 px-3 py-1 text-fg hover:bg-accent/20"
            >
              {c.ui.threeDView}
            </Link>
          )}
          <LanguageSwitch />
        </div>
      </header>

      <nav aria-label={c.ui.sections} className="mx-auto max-w-4xl px-4 pt-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {nav.map((n) => (
            <li key={n.id}>
              <a className="micro underline underline-offset-4" href={`#${n.id}`}>
                {n.body} · {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main id="main" className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <section id={s.home.id} aria-labelledby="h-home">
          <p className="micro">{s.home.body} · {s.home.label}</p>
          <h1 id="h-home" className="mt-2 text-4xl font-semibold">{s.home.name}</h1>
          <p className="mt-1 text-xl text-accent">{s.home.headline}</p>
          <p className="mt-3 text-muted"><Text value={s.home.pitch} /></p>
          <LinkList links={s.home.links} />
        </section>

        <section id={s.missions.id} aria-labelledby="h-missions">
          <p className="micro">{s.missions.body} · {s.missions.label}</p>
          <h2 id="h-missions" className="mt-2 text-2xl font-semibold">{s.missions.intro}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {s.missions.projects.map((p) => (
              <article key={p.name} className="panel">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-2 text-sm text-muted"><Text value={p.summary} /></p>
                <p className="mt-2 text-sm"><span className="micro">{c.ui.role}</span><br /><Text value={p.role} /></p>
                <p className="mt-2 text-sm"><span className="micro">{c.ui.stack}</span><br />{p.stack.map((t, i) => (<span key={t}>{i > 0 && ", "}<Text value={t} /></span>))}</p>
              </article>
            ))}
          </div>
        </section>

        <section id={s.infrastructure.id} aria-labelledby="h-infra">
          <p className="micro">{s.infrastructure.body} · {s.infrastructure.label}</p>
          <h2 id="h-infra" className="mt-2 text-2xl font-semibold">{s.infrastructure.intro}</h2>
          <ul className="mt-4 divide-y divide-white/10 border border-[var(--hairline)]">
            {s.infrastructure.skills.map((k) => (
              <li key={k.name} className="flex justify-between gap-4 p-3">
                <span>{k.name}</span>
                <span className="text-sm text-muted"><Text value={k.level} /></span>
              </li>
            ))}
          </ul>
        </section>

        <section id={s.flightRecord.id} aria-labelledby="h-flight">
          <p className="micro">{s.flightRecord.body} · {s.flightRecord.label}</p>
          <h2 id="h-flight" className="mt-2 text-2xl font-semibold">{s.flightRecord.intro}</h2>
          <ol className="mt-4 space-y-4">
            {s.flightRecord.entries.map((e) => (
              <li key={e.title} className="panel">
                <h3 className="font-semibold">{e.title}</h3>
                <p className="micro mt-1"><Text value={e.dates} /></p>
                <p className="mt-2 text-sm text-muted"><Text value={e.summary} /></p>
              </li>
            ))}
          </ol>
        </section>

        <section id={s.credentials.id} aria-labelledby="h-cred">
          <p className="micro">{s.credentials.body} · {s.credentials.label}</p>
          <h2 id="h-cred" className="mt-2 text-2xl font-semibold">{s.credentials.intro}</h2>
          <ul className="mt-4 divide-y divide-white/10 border border-[var(--hairline)]">
            {s.credentials.items.map((i) => (
              <li key={i.name} className="flex justify-between gap-4 p-3">
                <span>{i.name}</span>
                <span className="micro">
                  {i.status === "planned" ? c.ui.planned : i.status === "in-progress" ? c.ui.inProgress : <Text value={i.status} />}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">{s.credentials.languages}</p>
        </section>

        <section id={s.comms.id} aria-labelledby="h-comms">
          <p className="micro">{s.comms.body} · {s.comms.label}</p>
          <h2 id="h-comms" className="mt-2 text-2xl font-semibold">{s.comms.intro}</h2>
          <LinkList links={s.comms.links} />
        </section>

        <TelemetryPanel />
      </main>
    </>
  );
}
