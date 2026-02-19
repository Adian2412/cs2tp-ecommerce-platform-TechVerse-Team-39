// currency.js
// Country/currency detection now uses your own server endpoint (/api/geo)
// instead of sending user IPs to third-party services (ipapi.co, ipinfo.io).
// Falls back to navigator.language if the server call fails.
(function () {
    const DEFAULT        = { code: 'GBP', locale: 'en-GB' };
    const BASE_CURRENCY  = 'GBP';
    const RATES_CACHE_KEY = 'tvfx_rates_' + BASE_CURRENCY;
    const RATES_TTL_MS   = 1000 * 60 * 60 * 12; // 12 hours

    const COUNTRY_CURRENCY = {
        'US':'USD','CA':'CAD','GB':'GBP','AU':'AUD',
        'DE':'EUR','FR':'EUR','ES':'EUR','IT':'EUR','NL':'EUR','BE':'EUR',
        'IE':'EUR','PT':'EUR','GR':'EUR','AT':'EUR','FI':'EUR','LU':'EUR',
        'EE':'EUR','LV':'EUR','LT':'EUR','CY':'EUR','SI':'EUR','SK':'EUR',
        'JP':'JPY','CN':'CNY','IN':'INR','MX':'MXN','BR':'BRL','ZA':'ZAR',
        'NG':'NGN','KR':'KRW','HK':'HKD','SG':'SGD','NZ':'NZD','CH':'CHF',
        'SE':'SEK','NO':'NOK','DK':'DKK','RU':'RUB','TR':'TRY',
    };

    // ── Country detection (server-side only — no third-party IP calls) ────────
    async function fetchCountryFromServer() {
        try {
            const controller = new AbortController();
            const timeout    = setTimeout(() => controller.abort(), 3000);
            const res = await fetch('/api/geo', {
                credentials: 'include',
                signal:      controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) return null;
            const data = await res.json();
            return data.country ? String(data.country).toUpperCase() : null;
        } catch (e) {
            return null;
        }
    }

    function guessCountryFromLocale() {
        try {
            const lang  = navigator.language || navigator.userLanguage || '';
            const parts = lang.split('-');
            if (parts.length > 1) return parts[1].toUpperCase();
        } catch (e) {}
        return null;
    }

    function getCurrencyForCountry(code) {
        if (!code) return DEFAULT.code;
        return COUNTRY_CURRENCY[code] || DEFAULT.code;
    }

    function makeFormatter(locale, currency) {
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 });
        } catch (e) {
            return new Intl.NumberFormat(DEFAULT.locale, { style: 'currency', currency: DEFAULT.code, maximumFractionDigits: 2 });
        }
    }

    // ── Rate cache ────────────────────────────────────────────────────────────
    function readCachedRates() {
        try {
            const obj = JSON.parse(localStorage.getItem(RATES_CACHE_KEY) || 'null');
            if (!obj || !obj.timestamp || !obj.rates) return null;
            if (Date.now() - obj.timestamp > RATES_TTL_MS) return null;
            return obj.rates;
        } catch (e) { return null; }
    }

    function writeCachedRates(rates) {
        try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates })); } catch (e) {}
    }

    async function fetchRates(symbols) {
        try {
            const url = 'https://api.exchangerate.host/latest?base=' + encodeURIComponent(BASE_CURRENCY)
                + (symbols ? '&symbols=' + encodeURIComponent(symbols.join(',')) : '');
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) throw new Error('rate error');
            const data = await res.json();
            if (data && data.rates) return data.rates;
        } catch (e) {}
        return null;
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    async function init() {
        // Try server first, fall back to locale guess
        let country = await fetchCountryFromServer();
        if (!country) country = guessCountryFromLocale();

        const target = getCurrencyForCountry(country);
        const locale = navigator.language || DEFAULT.locale;

        window.tvCurrency = {
            base:      BASE_CURRENCY,
            target,
            locale,
            code:      target,
            country:   country || null,
            rate:      target === BASE_CURRENCY ? 1 : null,
            formatter: makeFormatter(locale, target),

            formatCurrency(v) {
                const num  = Number(v);
                if (Number.isNaN(num)) return String(v);
                const rate = window.tvCurrency.rate || 1;
                try { return window.tvCurrency.formatter.format(num * rate); } catch (e) { return (num * rate).toFixed(2); }
            },

            async refreshRates() {
                if (window.tvCurrency.target === window.tvCurrency.base) { window.tvCurrency.rate = 1; return true; }
                const cached = readCachedRates();
                if (cached && cached[window.tvCurrency.target]) {
                    window.tvCurrency.rate = cached[window.tvCurrency.target];
                    return true;
                }
                const rates = await fetchRates([window.tvCurrency.target]);
                if (rates && rates[window.tvCurrency.target]) {
                    writeCachedRates(rates);
                    window.tvCurrency.rate      = rates[window.tvCurrency.target];
                    window.tvCurrency.formatter = makeFormatter(window.tvCurrency.locale, window.tvCurrency.target);
                    try { window.dispatchEvent(new CustomEvent('tvCurrencyRatesReady', { detail: { target: window.tvCurrency.target, rate: window.tvCurrency.rate } })); } catch (e) {}
                    return true;
                }
                return false;
            },
        };

        try { window.dispatchEvent(new CustomEvent('tvCountryDetected', { detail: { country: window.tvCurrency.country, target: window.tvCurrency.target } })); } catch (e) {}

        const cached = readCachedRates();
        if (cached && cached[window.tvCurrency.target]) {
            window.tvCurrency.rate      = cached[window.tvCurrency.target];
            window.tvCurrency.formatter = makeFormatter(locale, window.tvCurrency.target);
            setTimeout(() => { window.tvCurrency.refreshRates().catch(() => {}); }, 0);
        } else {
            try { await window.tvCurrency.refreshRates(); } catch (e) {}
        }
    }

    init().catch(() => {
        window.tvCurrency = {
            base: BASE_CURRENCY, target: DEFAULT.code, locale: DEFAULT.locale, rate: 1,
            formatCurrency: v => new Intl.NumberFormat(DEFAULT.locale, { style: 'currency', currency: DEFAULT.code }).format(Number(v) || 0),
        };
    });

})();
