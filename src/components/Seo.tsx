import {useEffect} from 'react';

interface SeoProps {
  title: string;
  description: string;
  keywords: string[];
}

export function Seo({title, description, keywords}: SeoProps) {
  useEffect(() => {
    document.title = title;

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta');
      descriptionMeta.setAttribute('name', 'description');
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.setAttribute('content', description);

    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta');
      keywordsMeta.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute('content', keywords.join(', '));
  }, [title, description, keywords]);

  return null;
}
