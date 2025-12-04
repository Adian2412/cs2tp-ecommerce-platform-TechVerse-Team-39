/* currency.js
   Determine visitor currency based on IP or locale and expose
   window.tvCurrency.formatCurrency(number) for consistent formatting.
*/
(function(){
  const DEFAULT = { code: 'GBP', locale: 'en-GB' };
  const BASE_CURRENCY = 'GBP'; // site base currency for stored prices (changed to GBP)
  const RATES_CACHE_KEY = 'tvfx_rates_' + BASE_CURRENCY;
  const RATES_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

  // minimal mapping from country -> currency code
  const COUNTRY_CURRENCY = {
    'US':'USD','CA':'CAD','GB':'GBP','AU':'AUD','DE':'EUR','FR':'EUR','ES':'EUR','IT':'EUR','NL':'EUR','BE':'EUR','IE':'EUR','PT':'EUR','GR':'EUR','AT':'EUR','FI':'EUR','LU':'EUR','EE':'EUR','LV':'EUR','LT':'EUR','CY':'EUR','SI':'EUR','SK':'EUR',
    'JP':'JPY','CN':'CNY','IN':'INR','MX':'MXN','BR':'BRL','ZA':'ZAR','NG':'NGN','KR':'KRW','HK':'HKD','SG':'SGD','NZ':'NZD','CH':'CHF','SE':'SEK','NO':'NOK','DK':'DKK','RU':'RUB','TR':'TRY'
  };

  async function fetchCountryFromIP(){
    const urls = ['https://ipapi.co/json/','https://ipinfo.io/json?token=demo'];
    for(const url of urls){
      try{
        const controller = new AbortController();
        const id = setTimeout(()=>controller.abort(), 3000);
        const res = await fetch(url,{signal:controller.signal});
        clearTimeout(id);
        if(!res.ok) continue;
        const data = await res.json();
        const code = data.country || data.country_code;
        if(code) return code.toUpperCase();
      }catch(e){/*ignore*/}
    }
    return null;
  }

  function guessCountryFromLocale(){
    try{
      const lang = navigator.language || navigator.userLanguage || '';
      const parts = lang.split('-');
      if(parts.length>1) return parts[1].toUpperCase();
    }catch(e){}
    return null;
  }

  function getCurrencyForCountry(code){
    if(!code) return DEFAULT.code;
    return COUNTRY_CURRENCY[code] || (code==='EU' ? 'EUR' : DEFAULT.code);
  }

  function makeFormatter(locale, currency){
    try{
      return new Intl.NumberFormat(locale, { style:'currency', currency, maximumFractionDigits: 2 });
    }catch(e){
      return new Intl.NumberFormat(DEFAULT.locale, { style:'currency', currency: DEFAULT.code, maximumFractionDigits:2 });
    }
  }

  // Rates cache helpers
  function readCachedRates(){
    try{
      const raw = localStorage.getItem(RATES_CACHE_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || !obj.timestamp || !obj.rates) return null;
      if(Date.now() - obj.timestamp > RATES_TTL_MS) return null;
      return obj.rates;
    }catch(e){ return null; }
  }

  function writeCachedRates(rates){
    try{ localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), rates })); }catch(e){}
  }

  async function fetchRates(symbols){
    // Use exchangerate.host which is free and doesn't require an API key
    try{
      const url = 'https://api.exchangerate.host/latest?base=' + encodeURIComponent(BASE_CURRENCY) + (symbols ? '&symbols=' + encodeURIComponent(symbols.join(',')) : '');
      const res = await fetch(url,{cache:'no-cache'});
      if(!res.ok) throw new Error('rate fetch error');
      const data = await res.json();
      if(data && data.rates) return data.rates;
    }catch(e){/*ignore*/}
    return null;
  }

  async function init(){
    let country = null;
    try{ country = await fetchCountryFromIP(); }catch(e){ country = null; }
    if(!country) country = guessCountryFromLocale();

    const target = getCurrencyForCountry(country);
    const locale = navigator.language || DEFAULT.locale;

    // prepare tvCurrency object immediately so other scripts can call it
    window.tvCurrency = {
      base: BASE_CURRENCY,
      target,
      locale,
      code: target,
      country: country || null,
      rate: (target === BASE_CURRENCY ? 1 : null),
      formatter: makeFormatter(locale, target),
      // format a value expressed in base currency -> convert to target then format
      formatCurrency(v){
        const num = Number(v);
        if(Number.isNaN(num)) return String(v);
        const rate = window.tvCurrency.rate || 1;
        const converted = num * rate;
        try{ return window.tvCurrency.formatter.format(converted); }catch(e){ return converted.toFixed(2); }
      },
      // force refresh rates (returns true if obtained)
      async refreshRates(){
        if(window.tvCurrency.target === window.tvCurrency.base){ window.tvCurrency.rate = 1; return true; }
        const cached = readCachedRates();
        if(cached && cached[window.tvCurrency.target]){ window.tvCurrency.rate = cached[window.tvCurrency.target]; return true; }
        const rates = await fetchRates([window.tvCurrency.target]);
        if(rates && rates[window.tvCurrency.target]){
          writeCachedRates(rates);
          window.tvCurrency.rate = rates[window.tvCurrency.target];
          // update formatter to use the target code (in case it changed)
          window.tvCurrency.formatter = makeFormatter(window.tvCurrency.locale, window.tvCurrency.target);
          // dispatch event signal that rates are ready
          try{ window.dispatchEvent(new CustomEvent('tvCurrencyRatesReady', { detail: { target: window.tvCurrency.target, rate: window.tvCurrency.rate } })); }catch(e){}
          return true;
        }
        return false;
      }
    };

    // notify listeners about detected country (useful for header flag and other integrations)
    try{
      window.dispatchEvent(new CustomEvent('tvCountryDetected', { detail: { country: window.tvCurrency.country, target: window.tvCurrency.target } }));
    }catch(e){}

    // try to use cached rates first, then fetch in background if needed
    const cached = readCachedRates();
    if(cached && cached[window.tvCurrency.target]){
      window.tvCurrency.rate = cached[window.tvCurrency.target];
      window.tvCurrency.formatter = makeFormatter(window.tvCurrency.locale, window.tvCurrency.target);
      // still attempt to refresh in background if TTL expired was handled earlier
      setTimeout(()=>{ window.tvCurrency.refreshRates().catch(()=>{}); }, 0);
    } else {
      // fetch now
      try{ await window.tvCurrency.refreshRates(); }catch(e){}
    }
  }

  // initialize but don't block page scripts; other modules can listen for 'tvCurrencyRatesReady'
  init().catch(()=>{ window.tvCurrency = { base: BASE_CURRENCY, target: DEFAULT.code, locale: DEFAULT.locale, rate:1, formatCurrency: (v)=> new Intl.NumberFormat(DEFAULT.locale,{style:'currency',currency:DEFAULT.code}).format(Number(v)||0) }; });
})();
