document.addEventListener('DOMContentLoaded', ()=>{
  // Prevent double initialization if the script is injected/loaded more than once
  if(window.__tv_seller_init_done) return; window.__tv_seller_init_done = true;
  const input = document.getElementById('item-images');
  const preview = document.getElementById('preview');
  const publish = document.getElementById('publish');
  const title = document.getElementById('item-title');
  const price = document.getElementById('item-price');
  const desc = document.getElementById('item-desc');
  const categoryInput = document.getElementById('item-category');
  const quantityInput = document.getElementById('item-quantity');
  const sellerListings = document.getElementById('seller-listings');
  const LISTINGS_KEY = 'techverse_listings_v1';
  const listingForm = document.getElementById('listing-form');

  let selectedFiles = [];
  // undo state for deletions
  let __tv_lastRemoved = null;
  let __tv_undoTimer = null;

  input.addEventListener('change', async (e)=>{
    preview.innerHTML='';
    selectedFiles = Array.from(e.target.files);
    for(const f of selectedFiles){
      const url = await fileToDataUrl(f);
      const img = document.createElement('img'); img.src = url; img.style.width='120px'; img.style.height='120px'; img.style.objectFit='cover'; img.style.borderRadius='8px';
      preview.appendChild(img);
    }
  });

  // Resolve the API base URL so we always talk to the Laravel backend even when
  // the static site is served from a different port (e.g. Live Server :5500) or
  // on a deployed host (Virtualmin). Supports:
  // - <meta name="tv-api-base" content="https://api.example.com">
  // - window.TV_API_BASE / window.__TV_API_BASE__
  // - same-origin fallback when none provided.
  const getApiBase = () => {
    try{
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const metaVal = meta && meta.content ? meta.content.trim() : '';
      const override = (window.TV_API_BASE || window.__TV_API_BASE__ || metaVal || '').trim();
      if(override) return override.replace(/\/+$/, '');
    }catch(e){}
    return '';
  };

  publish.addEventListener('click', async ()=>{
    if(!title.value.trim()){ alert('Enter a title'); return; }
    // validate quantity
    let qty = 1;
    if(quantityInput){ qty = parseInt(quantityInput.value, 10) || 0; if(qty < 0){ alert('Quantity must be 0 or greater'); return; } }

    const productData = {
      name: title.value.trim(),
      price: parseFloat(price.value.trim()) || 0,
      description: desc.value.trim(),
      category: categoryInput ? categoryInput.value.trim() : '',
      quantity: qty
    };

    // Add images as base64 data URLs
    if(selectedFiles.length > 0){
      productData.images = [];
      for(const f of selectedFiles){
        const dataUrl = await fileToDataUrl(f);
        productData.images.push(dataUrl);
      }
    }

    // Try to POST to backend API
    try{
      const apiBase = getApiBase();
      const resp = await fetch(`${apiBase}/api/products`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(productData),
        credentials: 'include'
      });

      const data = await resp.json();
      if(resp.ok){
        alert('Product created successfully!');
        // reset form
        title.value=''; price.value=''; desc.value=''; input.value=''; preview.innerHTML=''; selectedFiles=[];
        if(categoryInput) categoryInput.value='electronics';
        if(quantityInput) quantityInput.value = '1';
        // refresh listings
        loadUserProducts();
      }else{
        alert('Error: ' + (data.error || 'Failed to create product'));
      }
    }catch(e){
      alert('Network error: ' + e.message);
    }
  });

  // Prevent the native form submit (Enter key) from performing a full page reload.
  // Route form submissions to the same publish handler instead.
  if(listingForm){
    listingForm.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      // trigger the publish button flow
      publish.click();
    });
  }

  function saveListing(listing){
    const raw = localStorage.getItem(LISTINGS_KEY); let all = [];
    if(raw){ try{all = JSON.parse(raw);}catch(e){all=[];} }
    all.push(listing);
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(all));
  }

  // --- Server syncing helpers ---
  async function tryPostListingToServer(listing){
    // endpoints to try (best-effort)
    const apiBase = getApiBase();
    const endpoints = [`${apiBase}/api/products`];
    // Prepare payload mapping to common backend product fields
    const payload = {
      name: listing.title,
      title: listing.title,
      price: (typeof listing.price === 'string' ? listing.price.replace(/[^0-9.]/g,'') : listing.price),
      description: listing.desc,
      images: listing.images,
      category: listing.category,
      quantity: listing.quantity
    };
    for(const ep of endpoints){
      try{
        // For cross-origin requests (different port), omit credentials; for same-origin use it
        const isCrossOrigin = ep.startsWith('http://') || ep.startsWith('https://');

        const fetchOpts = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        };
        if(!isCrossOrigin) fetchOpts.credentials = 'same-origin';

        // Always send as JSON, convert files to data URLs if present
        if(selectedFiles && selectedFiles.length){
          payload.images = [];
          for(const f of selectedFiles){
            const dataUrl = await fileToDataUrl(f);
            payload.images.push(dataUrl);
          }
        }

        fetchOpts.body = JSON.stringify(payload);
        const resp = await fetch(ep, fetchOpts);
        if(!resp.ok){
          // log response details for debugging
          try{ const txt = await resp.text(); console.warn('POST', ep, 'failed', resp.status, txt); }catch(e){ console.warn('POST', ep, 'failed', resp.status); }
          continue;
        }
        // if server returns created object, we don't need to store it locally
        // as we'll refresh the listings from the server
        try{
          const js = await resp.json();
          console.log('Server response:', js);
        }catch(e){}
        return true;
      }catch(e){
        // network/fetch level error
        console.error('Fetch error posting to', ep, e);
        continue;
      }
    }
    return false;
  }

  async function tryFetchListingsFromServer(){
    // prevent concurrent or repeated fetches
    if(window.__tv_fetch_listings_in_progress) return false;
    window.__tv_fetch_listings_in_progress = true;
    const apiBase = getApiBase();
    const endpoints = [`${apiBase}/api/products`];
    for(const ep of endpoints){
      try{
        const isCrossOrigin = ep.startsWith('http://') || ep.startsWith('https://');
        const fetchOpts = {};
        if(!isCrossOrigin) fetchOpts.credentials = 'same-origin';
        
        const resp = await fetch(ep, fetchOpts);
        if(!resp.ok) continue;
        const json = await resp.json();
        let list = null;
        if(Array.isArray(json)) list = json;
        else if(json && Array.isArray(json.data)) list = json.data;
        else if(json && Array.isArray(json.products)) list = json.products;
        else if(json && Array.isArray(json.items)) list = json.items;
        if(!list) continue;
        // normalize to our listing shape and store locally for rendering
        const normalized = list.map(it=>({
          id: it.id || it._id || it.sku || it.slug || ('p'+(Date.now()+Math.floor(Math.random()*9999))),
          title: it.title || it.name || it.product_name || it.label || ('Product'),
          price: (typeof it.price !== 'undefined') ? it.price : (it.price_cents? Number(it.price_cents)/100 : null),
          desc: it.description || it.desc || '',
          images: (it.images && Array.isArray(it.images)) ? it.images : (it.image? [it.image] : []),
          category: it.category || it.category_slug || null,
          quantity: it.quantity || 0
        }));
        try{ localStorage.setItem(LISTINGS_KEY, JSON.stringify(normalized)); }catch(e){}
        window.__tv_fetch_listings_in_progress = false;
        return true;
        }catch(e){ window.__tv_fetch_listings_in_progress = false; continue; }
    }
    window.__tv_fetch_listings_in_progress = false;
    return false;
  }


  // Load seller page with authentication check
  (function initSellerPage(){
    const authStatus = document.getElementById('auth-status');
    const sellerContent = document.getElementById('seller-content');

    // Wait a bit for auth system to initialize, then check authentication
    setTimeout(() => {
      // Check if user is authenticated
      const currentUser = window.TechVerseAuth ? window.TechVerseAuth.getCurrentUser() : null;

      if (!currentUser) {
        // User is not authenticated, redirect to signin
        authStatus.textContent = 'You must be signed in to access this page.';
        setTimeout(() => {
          location.href = 'signin.html';
        }, 2000);
        return;
      }

      // User is authenticated, show seller content
      authStatus.style.display = 'none';
      sellerContent.style.display = 'block';

      renderSellerListings();
    }, 100); // Small delay to ensure auth.js has loaded
  })();

  async function loadUserProducts(){
    try{
      // Use the /api/my-products endpoint to get only the current user's products
      const apiBase = getApiBase();
      const resp = await fetch(`${apiBase}/api/my-products`, {
        credentials: 'include'
      });
      if(resp.ok){
        const data = await resp.json();
        return data.data || [];
      } else if(resp.status === 401){
        console.warn('User not authenticated - cannot load their products');
        return [];
      }
    }catch(e){
      console.warn('Failed to load user products from API:', e);
    }
    return [];
  }

  async function renderSellerListings(){
    const items = await loadUserProducts();
    sellerListings.innerHTML='';

    if(!items.length){
      sellerListings.innerHTML = '<p style="color:#666">You have no listings yet.</p>';
      return;
    }

    items.slice().reverse().forEach(it=>{
      const el = document.createElement('div');
      el.className='review-item';
      el.style.display='flex';
      el.style.gap='12px';
      el.style.alignItems='center';
      el.style.padding='12px';
      el.style.border='1px solid #ddd';
      el.style.borderRadius='8px';
      el.style.marginBottom='8px';

      const img = document.createElement('img');
      img.src = (it.images && it.images[0] && it.images[0].image_path) ? it.images[0].image_path : '';
      img.style.width='80px';
      img.style.height='80px';
      img.style.objectFit='cover';
      img.style.borderRadius='6px';

      const info = document.createElement('div');
      info.style.flex='1';

      // format price
      const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ?
        window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
      const priceHtml = fmt(it.price);

      const statusBadge = it.is_sold ?
        '<span style="background:#d00;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">SOLD</span>' :
        '<span style="background:#0a0;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;">ACTIVE</span>';

      info.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
          <strong>${escapeHtml(it.name)}</strong>
          ${statusBadge}
        </div>
        <div style="color:#666;margin-bottom:4px;">${priceHtml}</div>
        <div style="font-size:13px;color:#333;margin-bottom:4px;">${escapeHtml(it.description)}</div>
        ${it.tracking_link ? `<div style="font-size:12px;"><a href="${escapeHtml(it.tracking_link)}" target="_blank">📦 Tracking Link</a></div>` : ''}
      `;

      el.appendChild(img);
      el.appendChild(info);

      // Action buttons
      const actionsDiv = document.createElement('div');
      actionsDiv.style.display='flex';
      actionsDiv.style.flexDirection='column';
      actionsDiv.style.gap='4px';

      // Mark as sold/unsold button
      const soldBtn = document.createElement('button');
      soldBtn.className='btn-ghost';
      soldBtn.textContent = it.is_sold ? 'Mark Available' : 'Mark Sold';
      soldBtn.style.fontSize='12px';
      soldBtn.addEventListener('click', async ()=>{
        try{
          // Use relative URLs if served from same domain, absolute if from file system
          const apiBase = getApiBase();
          const resp = await fetch(`${apiBase}/api/products/${it.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({is_sold: !it.is_sold}),
            credentials: window.location.protocol === 'file:' ? 'include' : 'same-origin'
          });
          if(resp.ok){
            renderSellerListings();
          }else{
            alert('Failed to update product status');
          }
        }catch(e){
          alert('Network error: ' + e.message);
        }
      });
      actionsDiv.appendChild(soldBtn);

      // Add tracking link button
      const trackingBtn = document.createElement('button');
      trackingBtn.className='btn-ghost';
      trackingBtn.textContent = it.tracking_link ? 'Update Tracking' : 'Add Tracking';
      trackingBtn.style.fontSize='12px';
      trackingBtn.addEventListener('click', ()=>{
        const link = prompt('Enter tracking link:', it.tracking_link || '');
        if(link !== null){
          // Use relative URLs if served from same domain, absolute if from file system
          const apiBase = getApiBase();
          fetch(`${apiBase}/api/products/${it.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({tracking_link: link}),
            credentials: window.location.protocol === 'file:' ? 'include' : 'same-origin'
          }).then(resp => {
            if(resp.ok) renderSellerListings();
            else alert('Failed to update tracking link');
          }).catch(e => alert('Network error: ' + e.message));
        }
      });
      actionsDiv.appendChild(trackingBtn);

      // Delete button (disabled for sold listings)
      const del = document.createElement('button');
      del.className='btn-remove';
      del.textContent='Delete';
      del.style.fontSize='12px';
      if(it.is_sold){
        del.disabled = true;
        del.title = 'Cannot delete sold listing';
      }
      del.addEventListener('click', async ()=>{
        if(it.is_sold) return;
        if(!confirm('Delete this listing? This action cannot be undone.')) return;

        try{
          // Use relative URLs if served from same domain, absolute if from file system
          const apiBase = getApiBase();
          const resp = await fetch(`${apiBase}/api/products/${it.id}`, {
            method: 'DELETE',
            credentials: window.location.protocol === 'file:' ? 'include' : 'same-origin'
          });
          if(resp.ok){
            renderSellerListings();
          }else{
            alert('Failed to delete product');
          }
        }catch(e){
          alert('Network error: ' + e.message);
        }
      });
      actionsDiv.appendChild(del);

      el.appendChild(actionsDiv);
      sellerListings.appendChild(el);
    });
  }

  function fileToDataUrl(file){
    return new Promise((res,rej)=>{
      const r = new FileReader();
      r.onload = ()=>res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // undo snackbar helpers (single-slot)
  function showUndoSnackbar(message, onUndo){
    let bar = document.getElementById('tv-undo-snackbar');
    if(!bar){
      bar = document.createElement('div'); bar.id = 'tv-undo-snackbar';
      bar.style.position = 'fixed'; bar.style.right = '20px'; bar.style.bottom = '20px'; bar.style.background = '#111'; bar.style.color = '#fff'; bar.style.padding = '10px 12px'; bar.style.borderRadius = '8px'; bar.style.display='flex'; bar.style.alignItems='center'; bar.style.gap='8px'; bar.style.boxShadow='0 6px 18px rgba(0,0,0,0.2)';
      document.body.appendChild(bar);
    }
    bar.innerHTML = '';
    const msg = document.createElement('div'); msg.textContent = message; msg.style.fontSize='14px';
    const undo = document.createElement('button'); undo.textContent = 'Undo'; undo.className='btn-ghost'; undo.style.padding='6px 10px';
    undo.addEventListener('click', ()=>{ if(onUndo) onUndo(); clearUndoSnackbar(); });
    const close = document.createElement('button'); close.textContent = '×'; close.className='btn-remove'; close.style.padding='6px 8px';
    close.addEventListener('click', ()=>{ clearUndoSnackbar(); });
    bar.appendChild(msg); bar.appendChild(undo); bar.appendChild(close);
    if(__tv_undoTimer) clearTimeout(__tv_undoTimer);
    __tv_undoTimer = setTimeout(()=>{ clearUndoSnackbar(); __tv_lastRemoved = null; }, 8000);
  }
  function clearUndoSnackbar(){ const b = document.getElementById('tv-undo-snackbar'); if(b) b.remove(); if(__tv_undoTimer) clearTimeout(__tv_undoTimer); __tv_undoTimer=null; }

  function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

  renderSellerListings();
});