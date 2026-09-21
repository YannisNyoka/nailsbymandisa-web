import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.js';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';
import { formatHour } from '../lib/formatTime.js';
import { buildWhatsAppLink } from '../lib/whatsapp.js';
import { optimizedImageUrl, optimizedVideoUrl } from '../lib/cloudinaryUrl.js';
import './HomePage.css';

const WEEKDAY_LABELS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
];

// Condenses the full weekly schedule (settings.hours) into the compact "Sunday –
// Friday" / "9:00 am – 5:00 pm" shape a teaser card needs — the Contact page has the
// full day-by-day table this links out to for anyone whose hours genuinely vary by day.
function summarizeHours(hours) {
  const order = WEEKDAY_LABELS.map(([key]) => key);
  const labelOf = (key) => WEEKDAY_LABELS.find(([k]) => k === key)[1];
  const openSet = new Set(order.filter((key) => !hours[key].closed));
  if (openSet.size === 0) return { days: 'Closed', time: '' };

  const first = hours[order.find((key) => openSet.has(key))];
  const sameEveryDay = [...openSet].every((key) => hours[key].open === first.open && hours[key].close === first.close);
  const time = sameEveryDay ? `${formatHour(first.open)} – ${formatHour(first.close)}` : 'Varies by day';

  if (openSet.size === order.length) return { days: 'Every day', time };

  // A week wraps (e.g. open Sunday–Friday, closed only Saturday — not a "linear" range
  // in Mon..Sun order), so try every rotation and use whichever one turns the open days
  // into a clean unbroken prefix run.
  for (let start = 0; start < order.length; start += 1) {
    const rotated = [...order.slice(start), ...order.slice(0, start)];
    const runLength = rotated.findIndex((key) => !openSet.has(key));
    const effectiveRun = runLength === -1 ? rotated.length : runLength;
    if (effectiveRun === openSet.size) {
      const days = effectiveRun === 1 ? labelOf(rotated[0]) : `${labelOf(rotated[0])} – ${labelOf(rotated[effectiveRun - 1])}`;
      return { days, time };
    }
  }

  return { days: order.filter((key) => openSet.has(key)).map(labelOf).join(', '), time };
}

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
      src={optimizedVideoUrl(current.url, { width: 1920 })}
      autoPlay
      muted
      loop={items.length <= 1}
      onEnded={items.length > 1 ? advance : undefined}
      playsInline
      aria-hidden="true"
    />
  ) : (
    <img
      key={current.url}
      className="home__hero-media-el"
      src={optimizedImageUrl(current.url, { width: 1920 })}
      alt="Freshly done nails by NailsByMandisa"
    />
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
  const [settings, setSettings] = useState(null);
  useDocumentMeta(null, 'Book manicures, pedicures, gel, acrylic, polygel and nail art online with NailsByMandisa.', { path: '/' });

  useEffect(() => {
    apiClient
      .get('/services')
      .then(({ services: list }) => setServices(list))
      .catch(() => setServices([]));
    apiClient
      .get('/settings')
      .then(({ settings: s }) => {
        if (s.heroMediaItems?.length) setHeroMediaItems(s.heroMediaItems);
        setSettings(s);
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

  const hoursSummary = settings ? summarizeHours(settings.hours) : null;

  return (
    <main className="home">
      <section className="home__hero">
        <div className="home__hero-media">
          <HeroSlideshow items={heroMediaItems} />
          <div className="home__hero-overlay" />
        </div>
        <div className="home__hero-content">
          <h1 className="home__hero-tagline">Clean. Chic. Creative.</h1>
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
          <h2 className="home__work-eyebrow">Our work</h2>
        
          <p className="home__work-subtitle">Swipe to explore our gallery</p>
          <div className="home__work-scroller">
            <div className="home__work-scroller-inner">
              {workItems.map((item) => (
                <Link key={item.id} to="/gallery" className="home__work-card">
                  <div className="home__work-card-media">
                    {item.type === 'video' ? (
                      <>
                        <video src={optimizedVideoUrl(item.url, { width: 440 })} muted preload="metadata" aria-hidden="true" />
                        <span className="home__work-card-play" aria-hidden="true">&#9654;</span>
                      </>
                    ) : (
                      <img src={optimizedImageUrl(item.url, { width: 440 })} alt={item.caption || 'NailsByMandisa client work'} />
                    )}
                  </div>
                  <p className="home__work-card-caption">{item.caption || 'Our work'}</p>
                </Link>
              ))}
            </div>
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
                    <img src={optimizedImageUrl(s.imageUrl, { width: 120 })} alt={s.name} className="home__service-image" />
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

      {settings && (
        <section className="home__contact">
          <p className="home__contact-eyebrow">Find us</p>
          <h2 className="home__contact-title">Get in touch</h2>
          <div className="home__contact-scroller">
            <div className="home__contact-scroller-inner">
              <div className="home__contact-card">
                <span className="home__contact-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <h3>Location</h3>
                <p>{settings.contact.address}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.contact.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions &rarr;
                </a>
              </div>

              <div className="home__contact-card">
                <span className="home__contact-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <h3>Hours</h3>
                <p>
                  {hoursSummary.days}
                  {hoursSummary.time && (
                    <>
                      <br />
                      {hoursSummary.time}
                    </>
                  )}
                </p>
                <Link to="/book">Book Now &rarr;</Link>
              </div>

              <div className="home__contact-card">
                <span className="home__contact-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <h3>Call or WhatsApp</h3>
                <p>{settings.contact.phone}</p>
                <a
                  href={buildWhatsAppLink(settings.contact.whatsapp, 'Hi! I have a question about booking with NailsByMandisa.')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Us &rarr;
                </a>
              </div>

              <div className="home__contact-card">
                <span className="home__contact-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22 6 12 13 2 6" />
                  </svg>
                </span>
                <h3>Email</h3>
                <p>{settings.contact.email}</p>
                <a href={`mailto:${settings.contact.email}`}>Send Email &rarr;</a>
              </div>
            </div>
          </div>
          <p className="home__contact-swipe-hint">&larr; swipe to see more &rarr;</p>
        </section>
      )}
    </main>
  );
}
