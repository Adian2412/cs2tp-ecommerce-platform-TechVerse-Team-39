document.addEventListener('DOMContentLoaded', ()=>{
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

  publish.addEventListener('click', async ()=>{
    if(!title.value.trim()){ alert('Enter a title'); return; }
    // validate quantity
    let qty = 1;
    if(quantityInput){ qty = parseInt(quantityInput.value, 10) || 0; if(qty < 0){ alert('Quantity must be 0 or greater'); return; } }
    const images = [];
    for(const f of selectedFiles){
      const data = await fileToDataUrl(f);
      images.push(data);
    }
    const listing = { id: 'L'+Date.now(), title: title.value.trim(), price: price.value.trim(), desc: desc.value.trim(), images, category: (categoryInput && categoryInput.value.trim())||'', quantity: qty, created: Date.now() };
    saveListing(listing);
    renderSellerListings();
    // reset
    title.value=''; price.value=''; desc.value=''; input.value=''; preview.innerHTML=''; selectedFiles=[];
    if(categoryInput) categoryInput.value='';
    if(quantityInput) quantityInput.value = '1';
    alert('Listing published (stored in browser for demo).');
  });

  function saveListing(listing){
    const raw = localStorage.getItem(LISTINGS_KEY); let all = [];
    if(raw){ try{all = JSON.parse(raw);}catch(e){all=[];} }
    all.push(listing);
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(all));
  }

  function loadListings(){
    const raw = localStorage.getItem(LISTINGS_KEY);
    if(!raw) return [];
    try{return JSON.parse(raw);}catch(e){return []}
  }

  function renderSellerListings(){
    const items = loadListings();
    sellerListings.innerHTML='';
    if(!items.length){ sellerListings.innerHTML = '<p style="color:#666">You have no listings yet.</p>'; return; }
    items.slice().reverse().forEach(it=>{
      const el = document.createElement('div'); el.className='review-item';
      el.style.display='flex'; el.style.gap='12px'; el.style.alignItems='center';
      const img = document.createElement('img'); img.src = (it.images && it.images[0]) || '';
      img.style.width='80px'; img.style.height='80px'; img.style.objectFit='cover'; img.style.borderRadius='6px';
      const info = document.createElement('div');
      // format price using tvCurrency if available, otherwise show raw
      const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
      const pnum = (it.price && String(it.price).replace(/[^0-9.]/g,'')) ? parseFloat(String(it.price).replace(/[^0-9.]/g,'')) : null;
      const priceHtml = pnum!==null ? fmt(pnum) : escapeHtml(it.price||'');
      const catHtml = it.category ? `<div style="font-size:12px;color:#666">${escapeHtml(it.category)}</div>` : '';
      const qtyHtml = (typeof it.quantity !== 'undefined') ? `<div style="font-size:12px;color:#666">Quantity: ${escapeHtml(String(it.quantity))}</div>` : '';
      info.innerHTML = `<strong>${escapeHtml(it.title)}</strong><div style="color:#666">${priceHtml}</div>${catHtml}${qtyHtml}<div style="font-size:13px;color:#333">${escapeHtml(it.desc)}</div>`;
      el.appendChild(img); el.appendChild(info);
      // delete button (disabled for sold listings)
      const del = document.createElement('button'); del.className='btn-remove'; del.textContent='Delete';
      if(it.sold){ del.disabled = true; del.title = 'Cannot delete sold listing'; }
      del.addEventListener('click', ()=>{
        if(it.sold) return; // safety
        if(!confirm('Delete this listing?')) return;
        const all = loadListings();
        const idx = all.findIndex(x=>x.id===it.id);
        if(idx===-1) return;
        // remove from storage
        const removed = all[idx];
        const filtered = all.filter(x=>x.id !== it.id);
        localStorage.setItem(LISTINGS_KEY, JSON.stringify(filtered));
        renderSellerListings();
        // store last removed for undo
        __tv_lastRemoved = { item: removed, key: LISTINGS_KEY };
        showUndoSnackbar('Listing deleted', ()=>{
          // undo -> restore
          const cur = loadListings(); cur.push(removed); localStorage.setItem(LISTINGS_KEY, JSON.stringify(cur)); renderSellerListings(); __tv_lastRemoved = null; clearUndoSnackbar();
        });
      });
      el.appendChild(del);
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