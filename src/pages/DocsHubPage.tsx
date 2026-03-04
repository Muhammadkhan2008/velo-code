import {ArrowRight, BookOpenText, Image} from 'lucide-react';
import {Link} from 'react-router-dom';
import {Seo} from '../components/Seo';
import {docsContent} from '../data/docsContent';
import {seoMetadata} from '../data/siteContent';

export function DocsHubPage() {
  return (
    <>
      <Seo
        title={`Documentation | ${seoMetadata.title}`}
        description="Velo Code documentation bundle covering workspace, editor, run architecture, AI, terminal, extensions, settings, and PWA behavior."
        keywords={seoMetadata.keywords}
      />

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-[#1a1a1e] p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-cyan-300">
            <BookOpenText className="h-4 w-4" />
            Documentation Bundle
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white">Velo Code Product Documentation</h1>
          <p className="mt-4 max-w-3xl text-slate-300">
            This bundle documents every major IDE capability from your product brief, including execution behavior and
            runtime/toolchain expectations.
          </p>
          <div className="mt-8">
            <Link
              to="/screenshots"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-sm font-semibold text-cyan-100"
            >
              <Image className="h-4 w-4" />
              Open screenshot placeholders
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {docsContent.map((article) => (
            <article key={article.slug} className="rounded-2xl border border-white/10 bg-[#17171c] p-6">
              <h2 className="text-xl font-semibold text-white">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{article.summary}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">
                Recommended screenshots: {article.recommendedScreenshots.length}
              </p>
              <Link to={`/docs/${article.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">
                Read documentation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
