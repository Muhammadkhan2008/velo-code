import {ChevronLeft, Image} from 'lucide-react';
import {Link, useParams} from 'react-router-dom';
import {CodeSnippet} from '../components/CodeSnippet';
import {Seo} from '../components/Seo';
import {docsContent} from '../data/docsContent';
import {seoMetadata} from '../data/siteContent';

export function DocArticlePage() {
  const {slug} = useParams();
  const article = docsContent.find((item) => item.slug === slug);

  if (!article) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white">Documentation page not found</h1>
        <p className="mt-4 text-slate-400">The requested page does not exist in this documentation bundle.</p>
        <Link to="/docs" className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-2 text-sm text-slate-200">
          Back to docs
        </Link>
      </section>
    );
  }

  return (
    <>
      <Seo
        title={`${article.title} | ${seoMetadata.title}`}
        description={article.summary}
        keywords={seoMetadata.keywords}
      />

      <section className="mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <Link to="/docs" className="inline-flex items-center gap-2 text-sm text-cyan-300">
          <ChevronLeft className="h-4 w-4" />
          Back to documentation bundle
        </Link>
        <h1 className="mt-5 text-4xl font-bold text-white">{article.title}</h1>
        <p className="mt-4 max-w-3xl text-slate-300">{article.summary}</p>

        <div className="mt-10 space-y-6">
          {article.sections.map((section) => (
            <article key={section.heading} className="rounded-2xl border border-white/10 bg-[#1a1a1e] p-6">
              <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{section.body}</p>
              {section.bullets && (
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
              {section.snippet && (
                <div className="mt-5">
                  <CodeSnippet title={section.snippet.title} language={section.snippet.language} code={section.snippet.code} />
                </div>
              )}
            </article>
          ))}
        </div>

        <article className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-6">
          <h2 className="text-lg font-semibold text-cyan-100">Screenshot slots for this page</h2>
          <p className="mt-2 text-sm text-cyan-50">
            Put your screenshots inside <code className="rounded bg-black/20 px-1">public/app-screenshots</code> using these file names:
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs">
            {article.recommendedScreenshots.map((name) => (
              <li key={name} className="rounded-full border border-cyan-300/40 bg-black/20 px-3 py-1 text-cyan-100">
                {name}
              </li>
            ))}
          </ul>
          <Link to="/screenshots" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Image className="h-4 w-4" />
            Open screenshot gallery page
          </Link>
        </article>
      </section>
    </>
  );
}
