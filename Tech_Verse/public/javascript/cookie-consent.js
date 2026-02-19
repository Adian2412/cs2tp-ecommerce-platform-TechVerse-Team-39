/*
  cookie-consent.js
  Shows GDPR cookie consent banner on first visit.
  Stores choice in localStorage and logs to server via POST /api/consent.
*/

(function () {
    const CONSENT_KEY = 'tv_cookie_consent';
    const existing    = localStorage.getItem(CONSENT_KEY);
    if (existing) return; // already decided

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    async function recordConsent(choice) {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, ts: Date.now() }));
        try {
            await fetch('/api/consent', {
                method:      'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ consent_type: choice }),
            });
        } catch (e) { /* non-critical */ }
        banner.remove();
    }

    const banner = document.createElement('div');
    banner.id    = 'tv-cookie-banner';
    banner.style.cssText = [
        'position:fixed', 'bottom:0', 'left:0', 'right:0',
        'background:#1a1a2e', 'color:#fff', 'padding:16px 24px',
        'display:flex', 'flex-wrap:wrap', 'align-items:center',
        'gap:12px', 'z-index:9999', 'font-size:14px',
        'box-shadow:0 -4px 12px rgba(0,0,0,0.3)',
    ].join(';');

    const text = document.createElement('span');
    text.style.flex = '1';
    text.innerHTML  = 'We use cookies to improve your experience. See our ' +
        '<a href="privacy.html" style="color:#90cdf4">Privacy Policy</a> for details.';

    const btnStyle = 'padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600';

    const acceptAll = document.createElement('button');
    acceptAll.textContent = 'Accept All';
    acceptAll.style.cssText = btnStyle + ';background:#38a169;color:#fff';
    acceptAll.addEventListener('click', () => recordConsent('all'));

    const essentialOnly = document.createElement('button');
    essentialOnly.textContent = 'Essential Only';
    essentialOnly.style.cssText = btnStyle + ';background:#4a5568;color:#fff';
    essentialOnly.addEventListener('click', () => recordConsent('essential'));

    const preferences = document.createElement('button');
    preferences.textContent = 'Preferences';
    preferences.style.cssText = btnStyle + ';background:transparent;color:#fff;border:1px solid #fff';
    preferences.addEventListener('click', () => recordConsent('preferences'));

    banner.appendChild(text);
    banner.appendChild(acceptAll);
    banner.appendChild(essentialOnly);
    banner.appendChild(preferences);

    document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(banner);
    });

    if (document.readyState !== 'loading') {
        document.body.appendChild(banner);
    }
})();
