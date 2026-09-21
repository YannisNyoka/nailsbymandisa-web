import { render, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { useDocumentMeta } from './useDocumentMeta.js';

function Probe({ title, description, options }) {
  useDocumentMeta(title, description, options);
  return null;
}

function metaContent(selector) {
  return document.querySelector(selector)?.getAttribute('content') ?? null;
}

beforeEach(() => {
  document.head.innerHTML = '<meta name="description" content="default description" />';
  document.title = 'NailsByMandisa';
});

afterEach(cleanup);

describe('useDocumentMeta', () => {
  it('sets the tab title, description, and Open Graph/Twitter tags', () => {
    render(<Probe title="Gallery" description="See our work." options={{ path: '/gallery' }} />);

    expect(document.title).toBe('Gallery · NailsByMandisa');
    expect(metaContent('meta[name="description"]')).toBe('See our work.');
    expect(metaContent('meta[property="og:title"]')).toBe('Gallery · NailsByMandisa');
    expect(metaContent('meta[property="og:description"]')).toBe('See our work.');
    expect(metaContent('meta[name="twitter:title"]')).toBe('Gallery · NailsByMandisa');
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(
      'https://nailsbymandisa.com/gallery'
    );
    expect(metaContent('meta[property="og:url"]')).toBe('https://nailsbymandisa.com/gallery');
  });

  it('adds a noindex robots tag for transactional pages', () => {
    render(<Probe title="Log in" options={{ noindex: true }} />);
    expect(metaContent('meta[name="robots"]')).toBe('noindex, nofollow');
  });

  it('does not add a robots tag when noindex is not set', () => {
    render(<Probe title="Gallery" options={{ path: '/gallery' }} />);
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('restores the previous title and description, and removes tags it created, on unmount', () => {
    const { unmount } = render(<Probe title="Gallery" description="See our work." options={{ path: '/gallery' }} />);
    expect(document.title).toBe('Gallery · NailsByMandisa');

    unmount();

    expect(document.title).toBe('NailsByMandisa');
    expect(metaContent('meta[name="description"]')).toBe('default description');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
  });
});
