// account page behavior extracted from inline script
document.addEventListener('DOMContentLoaded', ()=>{
  // Resolve API base for deployed environments (supports meta tag or global override)
  function tvApiBase(){
    try{
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const metaVal = meta && meta.content ? meta.content.trim() : '';
      const override = (window.TV_API_BASE || window.__TV_API_BASE__ || metaVal || '').trim();
      if(override) return override.replace(/\/+$/, '');
    }catch(e){}
    // default: same-origin
    return '';
  }
  const API_BASE = tvApiBase();
  const nameEl = document.getElementById('acc-name');
  const emailEl = document.getElementById('acc-email');
  const roleEl = document.getElementById('acc-role');

  // Get current user from authentication system
  const currentUser = window.TechVerseAuth ? window.TechVerseAuth.getCurrentUser() : null;

  if(currentUser){
    nameEl.value = currentUser.username || '';
    emailEl.value = currentUser.email || '';
    if(roleEl) roleEl.textContent = currentUser.role || 'customer';
  } else {
    // Fallback to old system if no authenticated user
    const accKey = 'techverse_account_v1';
    const saved = localStorage.getItem(accKey);
    if(saved){
      try{const s=JSON.parse(saved); nameEl.value=s.name||''; emailEl.value=s.email||'';}catch(e){}
    }
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
    signoutBtn.addEventListener('click', async ()=>{
      try{
        // Try to logout from server
        const apiBase = API_BASE;
        await fetch(`${apiBase}/api/logout`, {
          method: 'POST',
          credentials: apiBase ? 'include' : 'same-origin'
        });
      }catch(e){
        // Silent failure
      }

      // Clear client-side auth
      localStorage.removeItem('techverse_auth_user');
      alert('Successfully signed out.');
      location.href='index.html';
    });
  }

  // SELLER LISTINGS INTERFACE
  const accountListWrap = document.getElementById('account-listings');
  const sellBtn = document.getElementById('sell-product');

  if(sellBtn) sellBtn.addEventListener('click', ()=>{ location.href = 'seller.html'; });

  // Load user's products from API
  async function loadUserProducts(){
    try {
      const resp = await fetch(`${API_BASE}/api/my-products`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      
      if(resp.ok){
        const data = await resp.json();
        // Handle paginated response or direct array
        if(Array.isArray(data)) return data;
        if(data.data && Array.isArray(data.data)) return data.data;
        if(data.products && Array.isArray(data.products)) return data.products;
        return [];
      } else if(resp.status === 401){
        return [];
      } else {
        return [];
      }
    } catch(e) {
      return [];
    }
  }

  // Update product via API
  async function updateProduct(productId, updates){
    try {
      const resp = await fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      });
      return resp.ok;
    } catch(e) {
      return false;
    }
  }

  // Delete product via API
  async function deleteProduct(productId){
    try {
      const resp = await fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      return resp.ok;
    } catch(e) {
      return false;
    }
  }

  // Helper to format price
  function formatPrice(price){
    if(typeof price === 'number') return '£' + price.toFixed(2);
    return price || '£0.00';
  }

  // Helper to get image URL
  function getProductImage(product){
    if(product.images && Array.isArray(product.images) && product.images.length > 0){
      const primaryImg = product.images.find(img => img.is_primary) || product.images[0];
      if(primaryImg && primaryImg.image_path) return primaryImg.image_path;
    }
    if(product.image_url) return product.image_url;
    return 'images/placeholder.png';
  }

  async function renderAccountListings(){
    accountListWrap.innerHTML = '<p class="muted">Loading your listings...</p>';
    
    const items = await loadUserProducts();
    accountListWrap.innerHTML = '';
    
    if(!items.length){ 
      accountListWrap.innerHTML = '<p class="muted">You have no listings yet. <a href="seller.html">Sell a product</a></p>'; 
      return; 
    }

    // Sort by created_at descending (newest first)
    const sortedItems = items.slice().sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    });

    sortedItems.forEach(it => {
      const card = document.createElement('div'); card.className = 'listing-card';
      const img = document.createElement('img'); img.className = 'listing-thumb'; 
      img.src = getProductImage(it);
      img.onerror = function(){ this.src = 'images/placeholder.png'; };
      
      const info = document.createElement('div'); info.className = 'listing-info';
      const titleEl = document.createElement('div'); titleEl.className = 'listing-title'; titleEl.textContent = it.name || 'Untitled Product';
      const priceEl = document.createElement('div'); priceEl.className = 'listing-price'; priceEl.textContent = formatPrice(it.price);
      const meta = document.createElement('div'); meta.className = 'listing-meta';
      meta.textContent = it.description || '';

      // Status badge
      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = 'display:inline-block;padding:2px 6px;border-radius:4px;font-size:12px;margin-left:8px;';
      if(it.is_sold){
        statusBadge.textContent = 'SOLD';
        statusBadge.style.background = '#d00';
        statusBadge.style.color = '#fff';
      } else if(it.is_active === false || it.is_active === 0){
        statusBadge.textContent = 'INACTIVE';
        statusBadge.style.background = '#999';
        statusBadge.style.color = '#fff';
      } else {
        statusBadge.textContent = 'ACTIVE';
        statusBadge.style.background = '#0a0';
        statusBadge.style.color = '#fff';
      }
      titleEl.appendChild(statusBadge);

      // Stock info
      const stockInfo = document.createElement('div');
      stockInfo.style.fontSize = '12px';
      stockInfo.style.marginTop = '4px';
      const stock = it.stock || 0;
      stockInfo.innerHTML = stock > 0 ? 
        `<span style="color:#0a0;">Stock: ${stock}</span>` : 
        '<span style="color:#d00;">Out of stock</span>';

      const actions = document.createElement('div'); actions.className = 'listing-actions';

      if(it.is_sold){
        const soldLabel = document.createElement('div'); soldLabel.textContent = 'Sold'; soldLabel.className = 'muted';
        
        // Show tracking link if exists
        if(it.tracking_link){
          const trackingDiv = document.createElement('div');
          trackingDiv.style.fontSize = '12px';
          trackingDiv.style.marginTop = '4px';
          const isUrl = /^https?:\/\//i.test(it.tracking_link);
          if(isUrl){
            trackingDiv.innerHTML = `<a href="${it.tracking_link}" target="_blank">📦 Tracking Link</a>`;
          } else {
            trackingDiv.textContent = '📦 ' + it.tracking_link;
          }
          actions.appendChild(trackingDiv);
        }
        
        // Add/Update tracking button
        const trackBtn = document.createElement('button'); 
        trackBtn.className = 'btn-small'; 
        trackBtn.textContent = it.tracking_link ? 'Update Tracking' : 'Add Tracking';
        trackBtn.addEventListener('click', async ()=>{
          const link = prompt('Enter tracking link:', it.tracking_link || '');
          if(link !== null){
            const success = await updateProduct(it.id, { tracking_link: link });
            if(success){
              renderAccountListings();
            } else {
              alert('Failed to update tracking link');
            }
          }
        });
        
        actions.appendChild(soldLabel);
        actions.appendChild(trackBtn);
      } else {
        // Mark as sold button
        const markBtn = document.createElement('button'); 
        markBtn.className = 'btn-small'; 
        markBtn.textContent = 'Mark as Sold';
        markBtn.addEventListener('click', async ()=>{
          if(confirm('Mark this product as sold?')){
            const success = await updateProduct(it.id, { is_sold: true });
            if(success){
              renderAccountListings();
            } else {
              alert('Failed to mark product as sold');
            }
          }
        });
        actions.appendChild(markBtn);
      }

      // Delete button (disabled for sold items)
      const delBtn = document.createElement('button'); 
      delBtn.className = 'btn-remove'; 
      delBtn.textContent = 'Delete';
      if(it.is_sold){ 
        delBtn.disabled = true; 
        delBtn.title = 'Cannot delete sold listing'; 
      }
      delBtn.addEventListener('click', async ()=>{
        if(it.is_sold) return;
        if(!confirm('Delete this listing? This cannot be undone.')) return;
        const success = await deleteProduct(it.id);
        if(success){
          renderAccountListings();
        } else {
          alert('Failed to delete product');
        }
      });
      actions.appendChild(delBtn);

      info.appendChild(titleEl); 
      info.appendChild(priceEl); 
      info.appendChild(stockInfo);
      info.appendChild(meta); 
      info.appendChild(actions);
      card.appendChild(img); 
      card.appendChild(info);
      accountListWrap.appendChild(card);
    });
  }

  // initial render
  renderAccountListings();
  renderPlacedOrders();

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