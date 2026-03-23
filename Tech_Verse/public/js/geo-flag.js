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
    // Strictly validate: must be exactly 2 ASCII alpha characters
    const cc = /^[A-Za-z]{2}$/.test(countryCode || '') ? countryCode.toUpperCase() : '';
    const ccLower = cc.toLowerCase();
    const emoji = (cc ? countryCodeToEmoji(cc) : null) || '🌐';

    // Clear element safely
    while (el.firstChild) el.removeChild(el.firstChild);

    const span = document.createElement('span');
    span.className = 'country-flag';

    if (cc) {
        const img = document.createElement('img');
        img.src = 'https://flagcdn.com/' + ccLower + '.svg';
        img.alt = cc + ' flag';
        img.width = 20;
        img.height = 14;
        img.loading = 'lazy';
        img.addEventListener('error', function () {
            // Fallback to emoji on image load failure
            while (span.firstChild) span.removeChild(span.firstChild);
            span.appendChild(document.createTextNode(emoji + ' ' + cc));
        });
        span.appendChild(img);
        span.appendChild(document.createTextNode(' ' + cc));
    } else {
        span.appendChild(document.createTextNode(emoji));
    }

    el.appendChild(span);
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
