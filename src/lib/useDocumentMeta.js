import { useEffect } from 'react';

const SITE_NAME = 'NailsByMandisa';

// §4.1 — per-page meta tags. This is a client-rendered SPA without SSR, so a crawler
// that doesn't execute JS won't see these — a real launch would want prerendering or
// SSR for full SEO benefit. This still helps: browser tab titles, social link previews
// for crawlers that do run JS, and it's the honest ceiling of what's achievable without
// taking on a server-rendering framework here.
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content');
    if (description && meta) meta.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      if (previousDescription && meta) meta.setAttribute('content', previousDescription);
    };
  }, [title, description]);
}
