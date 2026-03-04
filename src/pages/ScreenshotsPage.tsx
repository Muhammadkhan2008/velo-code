import {useState} from 'react';
import {Seo} from '../components/Seo';
import {screenshotSlots} from '../data/docsContent';
import {seoMetadata} from '../data/siteContent';

export function ScreenshotsPage() {
  const [missingImages, setMissingImages] = useState<Record<string, boolean>>({});

  return (
    <>
      <Seo
        title={`Screenshots | ${seoMetadata.title}`}
        description="Screenshot placeholders for Velo Code website pages and documentation modules."
        keywords={seoMetadata.keywords}
      />

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-white">Screenshot Asset Folder</h1>
        <p className="mt-4 max-w-3xl text-slate-300">
          Screenshots are loaded from <code className="rounded bg-white/10 px-1">public/app-screenshots</code>. Keep the same file
          names below so each card auto-loads correctly.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {screenshotSlots.map((slot) => {
            const imagePath = `/app-screenshots/${slot.fileName}`;
            const isMissing = missingImages[slot.fileName];

            return (
              <article
                key={slot.fileName}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1e] transition-shadow hover:shadow-2xl hover:shadow-cyan-500/20"
              >
                <div className="h-44 border-b border-white/10 bg-[#131318] transition-all duration-500 group-hover:h-72">
                  {isMissing ? (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
                      Screenshot not added yet
                    </div>
                  ) : (
                    <img
                      src={imagePath}
                      alt={slot.title}
                      className="h-full w-full origin-center object-cover transition-transform duration-500 ease-out group-hover:scale-125"
                      onError={() => setMissingImages((prev) => ({...prev, [slot.fileName]: true}))}
                    />
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-base font-semibold text-white">{slot.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{slot.purpose}</p>
                  <p className="mt-4 rounded-lg border border-white/10 bg-[#111114] px-3 py-2 text-xs text-cyan-200">
                    /app-screenshots/{slot.fileName}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
