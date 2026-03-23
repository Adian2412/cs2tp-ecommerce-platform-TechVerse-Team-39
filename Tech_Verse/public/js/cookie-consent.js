/*
  cookie-consent.js
  GDPR cookie consent banner with three options:
    - Accept All
    - Essential Only
    - Preferences (opens granular modal per cookie category)
  Stores choice in localStorage and logs to server via POST /api/consent.
*/

(function () {
  const CONSENT_KEY = 'tv_cookie_consent';
  const existing = localStorage.getItem(CONSENT_KEY);
  if (existing) return; // already decided

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  async function recordConsent(choice, detail) {
    const payload = { consent_type: choice };
    if (detail) payload.detail = detail;
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, detail: detail || null, ts: Date.now() }));
    try {
      await fetch('/api/consent', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
    } catch (e) { /* non-critical */ }
  }

  // ── Preferences modal ──────────────────────────────────────────────────────
  function showPreferencesModal() {
    if (document.getElementById('tv-prefs-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'tv-prefs-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.55)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'z-index:10000', 'padding:16px',
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
      'background:#fff', 'border-radius:12px', 'padding:28px 24px',
      'max-width:480px', 'width:100%',
      'box-shadow:0 8px 32px rgba(0,0,0,0.18)',
      'font-family:system-ui,sans-serif', 'color:#111',
    ].join(';');

    const title = document.createElement('h3');
    title.textContent = 'Cookie Preferences';
    title.style.cssText = 'margin:0 0 8px;font-size:18px';

    const intro = document.createElement('p');
    intro.textContent = 'Choose which cookies you allow. Essential cookies are always active as they are required for the site to work.';
    intro.style.cssText = 'margin:0 0 20px;font-size:14px;color:#555;line-height:1.5';

    const categories = [
      {
        id: 'essential',
        label: 'Essential',
        desc: 'Session management, security (CSRF), authentication. Required for the site to function.',
        locked: true,
        checked: true,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        desc: 'Anonymous usage data to help us improve the site. No personal data shared with third parties.',
        locked: false,
        checked: false,
      },
      {
        id: 'preferences',
        label: 'Preferences',
        desc: 'Remembers your settings such as currency and language choices.',
        locked: false,
        checked: false,
      },
    ];

    const toggleState = {};
    categories.forEach(c => { toggleState[c.id] = c.checked; });

    const rows = document.createElement('div');
    rows.style.cssText = 'display:flex;flex-direction:column;gap:14px;margin-bottom:24px';

    categories.forEach(cat => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px';

      const textWrap = document.createElement('div');
      textWrap.style.flex = '1';

      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-weight:600;font-size:14px;margin-bottom:4px';
      lbl.textContent = cat.label + (cat.locked ? ' (Always on)' : '');

      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:13px;color:#555;line-height:1.4';
      desc.textContent = cat.desc;

      textWrap.appendChild(lbl);
      textWrap.appendChild(desc);

      // Toggle switch
      const toggleLabel = document.createElement('label');
      toggleLabel.style.cssText = 'position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;margin-top:2px';
      toggleLabel.title = cat.locked ? 'Always active' : ('Toggle ' + cat.label);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = cat.locked || toggleState[cat.id];
      checkbox.disabled = cat.locked;
      checkbox.style.cssText = 'opacity:0;width:0;height:0;position:absolute';

      const track = document.createElement('span');
      track.style.cssText = [
        'position:absolute', 'inset:0', 'border-radius:24px',
        'cursor:' + (cat.locked ? 'not-allowed' : 'pointer'),
        'transition:background 0.2s',
        'background:' + (checkbox.checked ? '#156082' : '#ccc'),
      ].join(';');

      const knob = document.createElement('span');
      knob.style.cssText = [
        'position:absolute', 'height:18px', 'width:18px',
        'left:' + (checkbox.checked ? '23px' : '3px'), 'top:3px',
        'background:#fff', 'border-radius:50%',
        'transition:left 0.2s', 'box-shadow:0 1px 3px rgba(0,0,0,0.3)',
      ].join(';');

      track.appendChild(knob);
      toggleLabel.appendChild(checkbox);
      toggleLabel.appendChild(track);

      checkbox.addEventListener('change', () => {
        toggleState[cat.id] = checkbox.checked;
        track.style.background = checkbox.checked ? '#156082' : '#ccc';
        knob.style.left = checkbox.checked ? '23px' : '3px';
      });

      row.appendChild(textWrap);
      row.appendChild(toggleLabel);
      rows.appendChild(row);
    });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';

    const bs = 'padding:10px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;border:none';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = bs + ';background:#f3f4f6;color:#333';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save preferences';
    saveBtn.style.cssText = bs + ';background:#156082;color:#fff';
    saveBtn.addEventListener('click', async () => {
      const detail = {};
      categories.forEach(c => { detail[c.id] = c.locked ? true : toggleState[c.id]; });
      overlay.remove();
      removeBanner();
      await recordConsent('custom', detail);
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);

    box.appendChild(title);
    box.appendChild(intro);
    box.appendChild(rows);
    box.appendChild(btnRow);
    overlay.appendChild(box);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // Expose for privacy.html "Manage cookie preferences" button
  window.tvCookieConsent = { showPreferences: showPreferencesModal };

  // ── Banner ─────────────────────────────────────────────────────────────────
  const banner = document.createElement('div');
  banner.id = 'tv-cookie-banner';
  banner.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'right:0',
    'background:#1a1a2e', 'color:#fff', 'padding:16px 24px',
    'display:flex', 'flex-wrap:wrap', 'align-items:center',
    'gap:12px', 'z-index:9999', 'font-size:14px',
    'box-shadow:0 -4px 12px rgba(0,0,0,0.3)',
  ].join(';');

  const text = document.createElement('span');
  text.style.flex = '1';
  text.innerHTML = 'We use cookies to improve your experience. See our ' +
    '<a href="privacy.html" style="color:#90cdf4">Privacy Policy</a> for details.';

  const bs = 'padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600';

  function removeBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
  }

  const acceptAll = document.createElement('button');
  acceptAll.textContent = 'Accept All';
  acceptAll.style.cssText = bs + ';background:#38a169;color:#fff';
  acceptAll.addEventListener('click', async () => { removeBanner(); await recordConsent('all'); });

  const essentialOnly = document.createElement('button');
  essentialOnly.textContent = 'Essential Only';
  essentialOnly.style.cssText = bs + ';background:#4a5568;color:#fff';
  essentialOnly.addEventListener('click', async () => { removeBanner(); await recordConsent('essential'); });

  const prefsBtn = document.createElement('button');
  prefsBtn.textContent = 'Preferences';
  prefsBtn.style.cssText = bs + ';background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.6)';
  prefsBtn.addEventListener('click', () => showPreferencesModal());

  banner.appendChild(text);
  banner.appendChild(acceptAll);
  banner.appendChild(essentialOnly);
  banner.appendChild(prefsBtn);

  if (document.readyState !== 'loading') {
    document.body.appendChild(banner);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(banner));
  }
})();
