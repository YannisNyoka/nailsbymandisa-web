import { useEffect } from 'react';

const SITE_NAME = 'NailsByMandisa';
const SITE_URL = 'https://nailsbymandisa.com';
const DEFAULT_IMAGE = `${SITE_URL}/brand/logo-lockup.png`;

function upsertTag(tagName, findAttr, findValue, contentAttr, contentValue) {
  let el = document.querySelector(`${tagName}[${findAttr}="${findValue}"]`);
  const existed = Boolean(el);
  const previousContent = existed ? el.getAttribute(contentAttr) : null;
  if (!el) {
    el = document.createElement(tagName);
    el.setAttribute(findAttr, findValue);
    document.head.appendChild(el);
  }
  el.setAttribute(contentAttr, contentValue);
  return () => {
    if (existed) el.setAttribute(contentAttr, previousContent);
    else el.remove();
  };
}

// §4.1 — per-page meta tags: title, description, canonical, Open Graph/Twitter previews,
// and an optional noindex directive for transactional/dead-end pages (login, password
// reset, payment retry, 404) that shouldn't show up in search results. This is a
// client-rendered SPA without SSR, so a crawler that doesn't execute JS — including the
// WhatsApp/Facebook/Twitter link-preview bots, which never run JS at all — won't see any
// of this; Googlebot does execute JS so this still helps real search ranking/snippets,
// and it's the honest ceiling of what's achievable without taking on server rendering.
export function useDocumentMeta(title, description, options = {}) {
  const { path, image = DEFAULT_IMAGE, noindex = false, type = 'website' } = options;

  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Nail Salon in Strubensvalley, Roodepoort`;
    const previousTitle = document.title;
    document.title = fullTitle;

    const restores = [];
    const set = (tagName, findAttr, findValue, contentAttr, contentValue) => {
      restores.push(upsertTag(tagName, findAttr, findValue, contentAttr, contentValue));
    };

    if (description) set('meta', 'name', 'description', 'content', description);
    set('meta', 'property', 'og:title', 'content', fullTitle);
    if (description) set('meta', 'property', 'og:description', 'content', description);
    set('meta', 'property', 'og:type', 'content', type);
    set('meta', 'property', 'og:site_name', 'content', SITE_NAME);
    set('meta', 'property', 'og:image', 'content', image);
    set('meta', 'name', 'twitter:card', 'content', 'summary_large_image');
    set('meta', 'name', 'twitter:title', 'content', fullTitle);
    if (description) set('meta', 'name', 'twitter:description', 'content', description);
    set('meta', 'name', 'twitter:image', 'content', image);

    if (path) {
      const url = `${SITE_URL}${path}`;
      set('link', 'rel', 'canonical', 'href', url);
      set('meta', 'property', 'og:url', 'content', url);
    }

    // Applied even without `path` so a transactional page still gets flagged if the
    // caller forgets to also pass a canonical path.
    if (noindex) set('meta', 'name', 'robots', 'content', 'noindex, nofollow');

    return () => {
      document.title = previousTitle;
      restores.forEach((restore) => restore());
    };
  }, [title, description, path, image, noindex, type]);
}
