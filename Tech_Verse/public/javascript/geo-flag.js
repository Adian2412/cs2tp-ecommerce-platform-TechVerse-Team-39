// geo-flag.js
// Displays the visitor's country flag in the header.
// Relies on currency.js to detect the country via the server (/api/geo)
// — no direct third-party IP calls from this file.

function countryCodeToEmoji(code) {
    if (!code || code.length !== 2) return '';
    const A = 0x1F1E6;
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => A + c.charCodeAt(0) - 65));
}

function guessCountryFromLocale() {
    try {
        const parts = (navigator.language || navigator.userLanguage || '').split('-');
        if (parts.length > 1) return parts[1].toUpperCase();
    } catch (e) {}
    return null;
}

function renderFlag(el, countryCode) {
    const cc    = (countryCode || '').toLowerCase();
    const emoji = countryCodeToEmoji(countryCode) || '🌐';
    if (cc && cc.length === 2) {
        const src    = `https://flagcdn.com/${cc}.svg`;
        el.innerHTML = `<span class="country-flag"><img src="${src}" alt="${cc.toUpperCase()} flag" width="20" height="14" loading="lazy"> ${cc.toUpperCase()}</span>`;
        const img    = el.querySelector('img');
        if (img) img.addEventListener('error', () => {
            el.innerHTML = `<span class="country-flag">${emoji} ${countryCode || ''}</span>`;
        });
    } else {
        el.innerHTML = `<span class="country-flag">${emoji}</span>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const candidates = Array.from(document.querySelectorAll('li.static'))
        .filter(li => /flag/i.test(li.textContent));
    if (!candidates.length) return;
    const el = candidates[0];

    function applyCountry(code) {
        if (code) renderFlag(el, code);
        else el.innerHTML = '<span class="country-flag">🌐</span>';
    }

    // If currency.js already ran and has a country, use it immediately
    if (window.tvCurrency && window.tvCurrency.country) {
        applyCountry(window.tvCurrency.country);
    } else {
        // Fall back to locale guess while waiting for currency.js
        const localeGuess = guessCountryFromLocale();
        if (localeGuess) applyCountry(localeGuess);
    }

    // Update when currency.js fires its country event (from server /api/geo call)
    window.addEventListener('tvCountryDetected', function (ev) {
        try {
            const cc = ev && ev.detail && ev.detail.country ? ev.detail.country
                : (window.tvCurrency && window.tvCurrency.country);
            if (cc) applyCountry(cc);
        } catch (e) {}
    });
});
