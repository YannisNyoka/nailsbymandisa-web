import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.js';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';
import './HomePage.css';

// Matches api/src/models/settings.js DEFAULT_SETTINGS.heroMediaItems — used only until
// the real value loads from GET /api/settings, so there's no flash of an empty hero.
const FALLBACK_HERO_MEDIA_ITEMS = [
  {
    url: 'https://res.cloudinary.com/akrzser7/image/upload/f_auto,q_auto,c_fill,g_auto,w_1920,h_1200/v1789408147/nailsbymandisa/gallery/ldge1cwpb9zji2j0tvlm.jpg',
    type: 'image',
  },
];

const IMAGE_SLIDE_MS = 5000;

// Plays the admin-uploaded hero items in sequence, looping back to the first — a video
// advances when it finishes, an image advances after IMAGE_SLIDE_MS. With only one item
// this just plays/loops it like the hero always used to (no advancing needed).
function HeroSlideshow({ items }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  function advance() {
    setIndex((i) => (i + 1) % items.length);
  }

  useEffect(() => {
    setIndex(0);
  }, [items]);

  const current = items[index] ?? items[0];

  useEffect(() => {
    if (items.length <= 1 || current.type !== 'image') return undefined;
    timerRef.current = setTimeout(advance, IMAGE_SLIDE_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length, current.type]);

  return current.type === 'video' ? (
    <video
      key={current.url}
      className="home__hero-media-el"
      src={current.url}
      autoPlay
      muted
      loop={items.length <= 1}
      onEnded={items.length > 1 ? advance : undefined}
      playsInline
      aria-hidden="true"
    />
  ) : (
    <img key={current.url} className="home__hero-media-el" src={current.url} alt="Freshly done nails by NailsByMandisa" />
  );
}

// Hero copy is still placeholder text (§2). The hero background is admin-editable (real
// photography by default — an actual NailsByMandisa manicure hosted on Cloudinary; see
// /admin/homepage and HomePage.css). The services list below is real (live from the
// SERVICES API), not a placeholder. Contact-and-directions section is still deferred —
// see §4.1.
// Home page teaser pulls from the same public /gallery + /client-gallery endpoints the
// full Gallery page uses (curated admin posts + approved client submissions) — no new
// content type, just a shorter, horizontally-scrollable slice of the same data.
const WORK_ITEM_LIMIT = 10;

export function HomePage() {
  const [services, setServices] = useState(null);
  const [heroMediaItems, setHeroMediaItems] = useState(FALLBACK_HERO_MEDIA_ITEMS);
  const [workItems, setWorkItems] = useState(null);
  useDocumentMeta(null, 'Book manicures, pedicures, gel, acrylic, polygel and nail art online with NailsByMandisa.');

  useEffect(() => {
    apiClient
      .get('/services')
      .then(({ services: list }) => setServices(list))
      .catch(() => setServices([]));
    apiClient
      .get('/settings')
      .then(({ settings }) => {
        if (settings.heroMediaItems?.length) setHeroMediaItems(settings.heroMediaItems);
      })
      .catch(() => {});
    Promise.all([apiClient.get('/gallery'), apiClient.get('/client-gallery')])
      .then(([{ gallery }, { submissions }]) => {
        const curated = gallery.map((i) => ({ id: i._id, url: i.mediaUrl, type: i.mediaType, caption: i.caption }));
        const client = submissions.map((i) => ({ id: i._id, url: i.imageUrl, type: 'image', caption: i.caption }));
        setWorkItems([...curated, ...client].slice(0, WORK_ITEM_LIMIT));
      })
      .catch(() => setWorkItems([]));
  }, []);

  return (
    <main className="home">
      <section className="home__hero">
        <div className="home__hero-media">
          <HeroSlideshow items={heroMediaItems} />
          <div className="home__hero-overlay" />
        </div>
        <div className="home__hero-content">
          <p className="home__hero-tagline">Clean. Chic. Creative.</p>
          <p className="home__hero-subtitle">Manicures, pedicures, gel, acrylic, polygel &amp; nail art — booked online.</p>
          <div className="home__hero-actions">
            <Link className="home__cta home__cta--primary" to="/book">
              Book an appointment
            </Link>
            <Link className="home__cta home__cta--secondary" to="/gallery">
              View gallery
            </Link>
          </div>
        </div>
      </section>

      {workItems && workItems.length > 0 && (
        <section className="home__work">
          <h1 className="home__work-eyebrow">Our work</h1>
        
          <p className="home__work-subtitle">Swipe to explore our gallery</p>
          <div className="home__work-scroller">
            {workItems.map((item) => (
              <Link key={item.id} to="/gallery" className="home__work-card">
                <div className="home__work-card-media">
                  {item.type === 'video' ? (
                    <>
                      <video src={item.url} muted preload="metadata" aria-hidden="true" />
                      <span className="home__work-card-play" aria-hidden="true">&#9654;</span>
                    </>
                  ) : (
                    <img src={item.url} alt={item.caption || 'NailsByMandisa client work'} />
                  )}
                </div>
                <p className="home__work-card-caption">{item.caption || 'Our work'}</p>
              </Link>
            ))}
          </div>
          <p className="home__work-swipe-hint">&larr; swipe to see more &rarr;</p>
        </section>
      )}

      {services && services.length > 0 && (
        <section className="home__services">
          <h2>Our services</h2>
          <ul className="home__service-list">
            {services.map((s) => (
              <li key={s._id}>
                <Link to={`/book?service=${s._id}`} className="home__service">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="" className="home__service-image" />
                  ) : (
                    <span className="home__service-image home__service-image--empty" aria-hidden="true" />
                  )}
                  <span className="home__service-body">
                    <span className="home__service-name">{s.name}</span>
                    <span className="home__service-meta">
                      {s.durationMinutes} min &middot; R{(s.priceCents / 100).toFixed(2)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
