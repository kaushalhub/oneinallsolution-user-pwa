const SCRIPT_ID = 'cleanswift-google-maps-js';

let loadPromise: Promise<void> | null = null;

/**
 * Loads Maps JavaScript API once. Enable **Maps JavaScript API** + **Geocoding API** on the key.
 */
export function loadGoogleMapsJs(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.google?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const ok = () => {
      loadPromise = null;
      resolve();
    };
    const fail = (msg: string) => {
      loadPromise = null;
      reject(new Error(msg));
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.google?.maps) {
        loadPromise = null;
        resolve();
        return;
      }
      const poll = window.setInterval(() => {
        if (window.google?.maps) {
          window.clearInterval(poll);
          ok();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(poll);
        if (!window.google?.maps) fail('Google Maps load timeout');
      }, 20000);
      existing.addEventListener('error', () => {
        window.clearInterval(poll);
        fail('Google Maps script error');
      });
      return;
    }

    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    s.onload = () => ok();
    s.onerror = () => fail('Failed to load Google Maps');
    document.head.appendChild(s);
  });

  return loadPromise;
}
