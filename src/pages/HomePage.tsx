import {ChevronRight, Cpu, HelpCircle, Layers, MonitorSmartphone, Sparkles, TerminalSquare} from 'lucide-react';
import {Link} from 'react-router-dom';
import {Seo} from '../components/Seo';
import {
  audienceCards,
  executionArchitecture,
  faqItems,
  featureGroups,
  finalCta,
  heroCopy,
  howItWorksSteps,
  seoMetadata,
  whyVeloCode,
} from '../data/siteContent';

const icons = [Cpu, Layers, Sparkles, TerminalSquare, MonitorSmartphone, HelpCircle];

export function HomePage() {
  return (
    <>
      <Seo title={seoMetadata.title} description={seoMetadata.description} keywords={seoMetadata.keywords} />

      <section id="hero" className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-32 h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[140px]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-20 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-cyan-300">
            <Sparkles className="h-4 w-4" />
            <span>{heroCopy.badge}</span>
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
            {heroCopy.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300">{heroCopy.subheadline}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#final-cta"
              className="rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-cyan-400"
            >
              {heroCopy.primaryCta}
            </a>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 hover:border-cyan-400/60 hover:text-cyan-200"
            >
              {heroCopy.secondaryCta}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="why" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">Why Velo Code</h2>
          <p className="mt-3 max-w-3xl text-slate-400">
            Velo Code is designed for teams that want browser delivery without losing the structure of a desktop IDE.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {whyVeloCode.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-white/5 bg-[#131318] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">Feature Grid</h2>
          <p className="mt-3 max-w-3xl text-slate-400">
            Core features are grouped by workflow area to help users understand capability boundaries quickly.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featureGroups.map((group, index) => {
              const Icon = icons[index % icons.length];
              return (
                <article key={group.id} className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                    <Icon className="h-5 w-5 text-cyan-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{group.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{group.description}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    {group.points.map((point) => (
                      <li key={point} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">How It Works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {howItWorksSteps.map((step) => (
              <article key={step.title} className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
                <h3 className="text-lg font-semibold text-cyan-200">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="border-t border-white/5 bg-[#111114] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">Architecture / How Execution Works</h2>
          <p className="mt-3 max-w-3xl text-slate-400">{executionArchitecture.intro}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
              <h3 className="text-lg font-semibold text-white">Browser Runners</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {executionArchitecture.browserRunners.map((runner) => (
                  <li key={runner} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    {runner}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
              <h3 className="text-lg font-semibold text-white">Server Runtime Runners</h3>
              <p className="mt-2 text-sm text-slate-400">
                Triggered when runtime/toolchain exists in the configured environment.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 text-sm text-slate-200">
                {executionArchitecture.serverRunners.map((runner) => (
                  <li key={runner} className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1">
                    {runner}
                  </li>
                ))}
              </ul>
              <h4 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-300">Execution Pipeline</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {executionArchitecture.pipeline.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="who" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">Who It Is For</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {audienceCards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-3 text-sm text-slate-400">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-white/5 bg-[#131318] py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">FAQ</h2>
          <div className="mt-8 space-y-4">
            {faqItems.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
                <h3 className="text-base font-semibold text-white">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="seo" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">SEO Metadata Pack</h2>
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
            <p className="text-sm text-slate-400">Meta title</p>
            <p className="mt-1 text-lg text-white">{seoMetadata.title}</p>
            <p className="mt-6 text-sm text-slate-400">Meta description</p>
            <p className="mt-1 text-slate-200">{seoMetadata.description}</p>
            <p className="mt-6 text-sm text-slate-400">Target keywords (10)</p>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {seoMetadata.keywords.map((keyword) => (
                <li key={keyword} className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-purple-100">
                  {keyword}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="final-cta" className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white md:text-4xl">{finalCta.heading}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">{finalCta.body}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/docs"
              className="rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-cyan-400"
            >
              {finalCta.primary}
            </Link>
            <Link
              to="/screenshots"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 hover:border-cyan-400/60 hover:text-cyan-200"
            >
              {finalCta.secondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
