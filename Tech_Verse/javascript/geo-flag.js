// geo-flag.js
// Replaces placeholder 'flag' text in the header with the visitor's country flag
// Uses IP geolocation (public API) with a graceful fallback to navigator.language

async function fetchCountryFromIP(){
  const urls = [
    'https://ipapi.co/json/',
    'https://ipinfo.io/json?token=demo' // ipinfo requires token; kept as fallback (may not work)
  ];
  for(const url of urls){
    try{
      const controller = new AbortController();
      const id = setTimeout(()=>controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if(!res.ok) continue;
      const data = await res.json();
      // ipapi returns country_code, ipinfo returns country
      const code = data.country || data.country_code;
      if(code) return code.toUpperCase();
    }catch(e){
      // try next provider
    }
  }
  return null;
}

function countryCodeToEmoji(code){
  if(!code || code.length !== 2) return '';
  const A = 0x1F1E6;
  const chars = [...code.toUpperCase()].map(c => A + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...chars);
}

function guessCountryFromLocale(){
  try{
    const lang = navigator.language || navigator.userLanguage || '';
    // format like en-US
    const parts = lang.split('-');
    if(parts.length > 1) return parts[1].toUpperCase();
  }catch(e){}
  return null;
}

// render flag: by default use CDN image (SVG) then fall back to emoji
function renderFlag(el, countryCode, opts = { useImage: true }){
  const cc = (countryCode || '').toLowerCase();
  const emoji = countryCodeToEmoji(countryCode) || '';
  if(opts.useImage && cc && cc.length === 2){
    // Use FlagCDN SVG - small, crisp, cacheable. Example: https://flagcdn.com/us.svg
    const src = `https://flagcdn.com/${cc}.svg`;
    const imgHtml = `<img src="${src}" alt="${cc.toUpperCase()} flag" width="20" height="14" loading="lazy">`;
    el.innerHTML = `<span class="country-flag">${imgHtml} ${cc.toUpperCase()}</span>`;
    // If the image fails to load (blocked CDN or CORS), fallback to emoji after a short timeout
    const imgEl = el.querySelector('img');
    if(imgEl){
      imgEl.addEventListener('error', ()=>{
        el.innerHTML = `<span class="country-flag">${emoji} ${countryCode || ''}</span>`;
      });
    }
    return;
  }
  // Fallback to emoji + code
  el.innerHTML = `<span class="country-flag">${emoji} ${countryCode || ''}</span>`;
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // find header placeholder elements that contain the word 'flag' (case-insensitive)
  const candidates = Array.from(document.querySelectorAll('li.static'))
    .filter(li => /flag/i.test(li.textContent));
  if(!candidates.length) return;
  const el = candidates[0];

  // If currency detection script already found the country, use it and listen for changes
  if(window.tvCurrency && window.tvCurrency.country){
    renderFlag(el, window.tvCurrency.country);
  } else {
    // First try IP-based lookup
    let code = null;
    try{ code = await fetchCountryFromIP(); }catch(e){ code = null; }
    if(!code) code = guessCountryFromLocale();
    if(!code){ el.innerHTML = '<span class="country-flag">🌐</span>'; }
    else renderFlag(el, code);
  }

  // Listen for currency/country detection events and update flag dynamically
  window.addEventListener && window.addEventListener('tvCountryDetected', function(ev){
    try{
      const cc = ev && ev.detail && ev.detail.country ? ev.detail.country : (window.tvCurrency && window.tvCurrency.country);
      if(cc) renderFlag(el, cc);
    }catch(e){}
  });
});

/* TODO (backend integration):
 - For privacy and reliability, consider having the server determine the visitor country
   (e.g., Laravel middleware using request IP and a geolocation service) and render
   the country on the server or expose it via `/api/user` or `/api/geo`.
 - If using server-side determination, replace the client-side fetch with a
   request to a trusted internal endpoint to avoid third-party API rate limits.
*/
