// account page behavior extracted from inline script
const accKey = 'techverse_account_v1';
document.addEventListener('DOMContentLoaded', ()=>{
  const nameEl = document.getElementById('acc-name');
  const emailEl = document.getElementById('acc-email');
  const saved = localStorage.getItem(accKey);
  if(saved){
    try{const s=JSON.parse(saved); nameEl.value=s.name||''; emailEl.value=s.email||'';}catch(e){}
  }
  document.getElementById('save-account').addEventListener('click', ()=>{
    const obj={name:nameEl.value.trim(), email:emailEl.value.trim(), updated:Date.now()};
    localStorage.setItem(accKey, JSON.stringify(obj));
    alert('Account details saved locally.');
  });
  document.getElementById('change-pass').addEventListener('click', ()=>{
    // no real password handling - placeholder
    const cur=document.getElementById('acc-curpass').value;
    const nw=document.getElementById('acc-newpass').value;
    if(!nw) return alert('Enter a new password.');
    alert('Password change simulated (no backend).');
    document.getElementById('acc-curpass').value=''; document.getElementById('acc-newpass').value='';
  });
  const signoutBtn = document.getElementById('signout');
  if(signoutBtn){
    signoutBtn.addEventListener('click', ()=>{
      // clear client-side auth flag (server auth will be handled by Laravel later)
      try{ localStorage.removeItem('techverse_auth_user'); }catch(e){}
      alert('Signed out (simulated).');
      location.href='index.html';
    });
  }

  // SELLER LISTINGS INTERFACE
  const SELLINGS_KEY = 'techverse_listings_v1';
  const accountListWrap = document.getElementById('account-listings');
  const sellBtn = document.getElementById('sell-product');

  if(sellBtn) sellBtn.addEventListener('click', ()=>{ location.href = 'seller.html'; });

  function loadListings(){
    const raw = localStorage.getItem(SELLINGS_KEY);
    if(!raw) return [];
    try{return JSON.parse(raw);}catch(e){return []}
  }

  function saveListings(items){ localStorage.setItem(SELLINGS_KEY, JSON.stringify(items)); }

  function renderAccountListings(){
    const items = loadListings();
    accountListWrap.innerHTML = '';
    if(!items.length){ accountListWrap.innerHTML = '<p class="muted">You have no listings yet.</p>'; return; }
    items.slice().reverse().forEach(it => {
      const card = document.createElement('div'); card.className = 'listing-card';
      const img = document.createElement('img'); img.className = 'listing-thumb'; img.src = (it.images && it.images[0]) || '';
      const info = document.createElement('div'); info.className = 'listing-info';
      const title = document.createElement('div'); title.className = 'listing-title'; title.textContent = it.title;
      const price = document.createElement('div'); price.className = 'listing-price'; price.textContent = it.price;
      const meta = document.createElement('div'); meta.className = 'listing-meta';
      meta.textContent = it.desc || '';

      const actions = document.createElement('div'); actions.className = 'listing-actions';

      if(it.sold){
        const soldLabel = document.createElement('div'); soldLabel.textContent = 'Sold'; soldLabel.className = 'muted';
        const trackingWrap = document.createElement('div'); trackingWrap.className = 'listing-meta';

        function renderTrackingUI(listing){
          trackingWrap.innerHTML = '';
          const label = document.createElement('div'); label.style.marginBottom='6px';
          if(!listing.tracking){
            // show placeholder input to add tracking
            const input = document.createElement('input'); input.className = 'tracking-input'; input.placeholder = 'Tracking link';
            const saveBtn = document.createElement('button'); saveBtn.className='btn-small'; saveBtn.textContent='Save';
            saveBtn.addEventListener('click', ()=>{
              const val = input.value.trim(); if(!val) return alert('Enter a tracking link or cancel');
              const all = loadListings(); const idx = all.findIndex(x=>x.id===listing.id); if(idx===-1) return alert('Listing not found');
              all[idx].tracking = val;
              // set edit allowance after first entry
              all[idx].trackingEditsRemaining = 3;
              saveListings(all); renderAccountListings();
            });
            const cancel = document.createElement('button'); cancel.className='btn-small'; cancel.textContent='Cancel';
            cancel.addEventListener('click', ()=>{ renderAccountListings(); });
            trackingWrap.appendChild(input); trackingWrap.appendChild(saveBtn); trackingWrap.appendChild(cancel);
          } else {
            // show tracking link (as anchor if looks like a URL)
            const isUrl = /^(https?:)?\/\//i.test(listing.tracking) || /^https?:\/\//i.test(listing.tracking);
            if(isUrl){
              const a = document.createElement('a'); a.href = listing.tracking; a.target='_blank'; a.textContent = listing.tracking; a.style.display='block'; a.style.marginBottom='6px';
              trackingWrap.appendChild(a);
            } else {
              const tdiv = document.createElement('div'); tdiv.textContent = listing.tracking; tdiv.style.marginBottom='6px'; trackingWrap.appendChild(tdiv);
            }

            const editsLeft = (typeof listing.trackingEditsRemaining === 'number') ? listing.trackingEditsRemaining : 0;
            const info = document.createElement('div'); info.className='muted'; info.style.fontSize='12px'; info.textContent = 'Edits left: '+editsLeft; info.style.marginBottom='6px';
            trackingWrap.appendChild(info);

            const editBtn = document.createElement('button'); editBtn.className='btn-small'; editBtn.textContent='Edit';
            if(editsLeft <= 0) { editBtn.disabled = true; editBtn.title = 'No edits remaining'; }
            editBtn.addEventListener('click', ()=>{
              // replace with input + save/cancel
              trackingWrap.innerHTML = '';
              const input = document.createElement('input'); input.className='tracking-input'; input.value = listing.tracking || ''; input.placeholder='Tracking link';
              const saveBtn = document.createElement('button'); saveBtn.className='btn-small'; saveBtn.textContent='Save';
              const cancel = document.createElement('button'); cancel.className='btn-small'; cancel.textContent='Cancel';
              saveBtn.addEventListener('click', ()=>{
                const val = input.value.trim(); if(!val) return alert('Enter a tracking link or cancel');
                const all = loadListings(); const idx = all.findIndex(x=>x.id===listing.id); if(idx===-1) return alert('Listing not found');
                // only decrement if value changed
                if(all[idx].tracking !== val){
                  if(typeof all[idx].trackingEditsRemaining !== 'number') all[idx].trackingEditsRemaining = 3;
                  if(all[idx].trackingEditsRemaining > 0) all[idx].trackingEditsRemaining = all[idx].trackingEditsRemaining - 1;
                  all[idx].tracking = val;
                  saveListings(all);
                }
                renderAccountListings();
              });
              cancel.addEventListener('click', ()=>{ renderAccountListings(); });
              trackingWrap.appendChild(input); trackingWrap.appendChild(saveBtn); trackingWrap.appendChild(cancel);
            });
            trackingWrap.appendChild(editBtn);
          }
        }

        renderTrackingUI(it);
        actions.appendChild(soldLabel); actions.appendChild(trackingWrap);
    } else {
        const trackInput = document.createElement('input'); trackInput.className = 'tracking-input'; trackInput.placeholder = 'Tracking link';
        const markBtn = document.createElement('button'); markBtn.className = 'btn-small'; markBtn.textContent = 'Mark as sold';
        markBtn.addEventListener('click', ()=>{
          // set sold and save tracking if provided
          const all = loadListings();
          const idx = all.findIndex(x=>x.id===it.id);
          if(idx===-1) return alert('Listing not found');
          all[idx].sold = true;
          const t = trackInput.value.trim(); if(t){ all[idx].tracking = t; all[idx].trackingEditsRemaining = 3; }
          all[idx].soldDate = Date.now();
          saveListings(all);
          renderAccountListings();
        });
        actions.appendChild(trackInput); actions.appendChild(markBtn);
    }

    // delete control for all listings (placed after branch)
    const delBtn = document.createElement('button'); delBtn.className = 'btn-remove'; delBtn.textContent = 'Delete';
    if(it.sold){ delBtn.disabled = true; delBtn.title = 'Cannot delete sold listing'; }
    delBtn.addEventListener('click', ()=>{
      if(it.sold) return;
      if(!confirm('Delete this listing?')) return;
      const all = loadListings();
      const idx = all.findIndex(x=>x.id===it.id);
      if(idx===-1) return;
      const removed = all[idx];
      const filtered = all.filter(x=>x.id !== it.id);
      saveListings(filtered);
      renderAccountListings();
      __tv_lastRemoved = { item: removed, key: SELLINGS_KEY };
      showUndoSnackbar('Listing deleted', ()=>{
        const cur = loadListings(); cur.push(removed); saveListings(cur); renderAccountListings(); __tv_lastRemoved = null; clearUndoSnackbar();
      });
    });
    actions.appendChild(delBtn);

      info.appendChild(title); info.appendChild(price); info.appendChild(meta); info.appendChild(actions);
      card.appendChild(img); card.appendChild(info);
      accountListWrap.appendChild(card);
    });
  }

  // initial render
  renderAccountListings();
  renderPlacedOrders();

  // undo snackbar helpers (single-slot)
  let __tv_lastRemoved = null;
  let __tv_undoTimer = null;
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

  // ORDERS UI
  const ORDERS_KEY = 'techverse_orders_v1';
  const ordersWrap = document.getElementById('placed-orders');

  function seedOrders(){
    const sample = [
      { id: 'TV-1001', title: 'Wireless Headphones', thumb:'images/headphones.jpg', status:'in_transit', tracking:'TRK123456', placed: Date.now()-5*24*3600*1000, returnable:true },
      { id: 'TV-1002', title: 'Mechanical Keyboard', thumb:'images/keyboard.jpg', status:'delivered', tracking:'TRK654321', placed: Date.now()-20*24*3600*1000, returnable:true },
      { id: 'TV-1003', title: 'Smart Lamp', thumb:'images/lamp.jpg', status:'out_for_delivery', tracking:'TRK998877', placed: Date.now()-1*24*3600*1000, returnable:false }
    ];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(sample));
    return sample;
  }

  function loadOrders(){
    const raw = localStorage.getItem(ORDERS_KEY);
    if(!raw) return seedOrders();
    try{return JSON.parse(raw);}catch(e){return seedOrders()}
  }

  function saveOrders(arr){ localStorage.setItem(ORDERS_KEY, JSON.stringify(arr)); }

  function formatDate(ts){ const d=new Date(ts); return d.toLocaleDateString(); }

  function renderPlacedOrders(){
    const orders = loadOrders();
    ordersWrap.innerHTML = '';
    if(!orders.length){ ordersWrap.innerHTML = '<p class="muted">You have no orders yet.</p>'; return; }
    orders.slice().reverse().forEach(o=>{
      const card = document.createElement('div'); card.className='order-card';
      const head = document.createElement('div'); head.className='order-head';
      const id = document.createElement('div'); id.className='order-id'; id.textContent = o.id;
      const status = document.createElement('div'); status.className='order-status';
      if(o.status==='delivered'){ status.textContent='Delivered'; status.classList.add('status-delivered'); }
      else if(o.status==='in_transit'){ status.textContent='In transit'; status.classList.add('status-transit'); }
      else if(o.status==='out_for_delivery'){ status.textContent='Out for delivery'; status.classList.add('status-out'); }
      head.appendChild(id); head.appendChild(status);

      const meta = document.createElement('div'); meta.className='order-meta'; meta.textContent = 'Placed: '+formatDate(o.placed)+' · Tracking: '+(o.tracking||'N/A');

      const row = document.createElement('div'); row.className='order-items';
      const img = document.createElement('img'); img.className='order-thumb'; img.src = o.thumb || 'images/default-product.png';
      const info = document.createElement('div'); info.className='order-info';
      const title = document.createElement('div'); title.className='listing-title'; title.textContent = o.title;
      info.appendChild(title); info.appendChild(meta);
      row.appendChild(img); row.appendChild(info);

      const actions = document.createElement('div'); actions.className='order-actions';
      const view = document.createElement('button'); view.className='btn-view'; view.textContent='View Order';
      view.addEventListener('click', ()=>{ location.href = 'checkout.html?order='+encodeURIComponent(o.id); });
      actions.appendChild(view);
      if(o.returnRequested){
        const rlabel = document.createElement('div'); rlabel.className='muted'; rlabel.textContent='Return requested'; actions.appendChild(rlabel);
      } else if(o.returnable){
        const ret = document.createElement('button'); ret.className='btn-return'; ret.textContent='Return';
        ret.addEventListener('click', ()=>{
          if(!confirm('Start a return for order '+o.id+'?')) return;
          const all = loadOrders(); const idx = all.findIndex(x=>x.id===o.id); if(idx===-1) return alert('Order not found');
          all[idx].returnRequested = true; saveOrders(all); renderPlacedOrders();
          // redirect to returns flow with order id
          location.href = 'returns.html?order='+encodeURIComponent(o.id);
        });
        actions.appendChild(ret);
      }

      card.appendChild(head); card.appendChild(row); card.appendChild(actions);
      ordersWrap.appendChild(card);
    });
  }
});