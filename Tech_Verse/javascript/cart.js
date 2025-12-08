(function(){
  const CART_KEY = 'techverse_cart_v1';
  function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); }catch(e){ return {}; } }
  function saveCart(cart){ try{ localStorage.setItem(CART_KEY, JSON.stringify(cart || {})); }catch(e){} }

  function formatRow(item){
    const image = item.image || 'images/placeholder.png';
    const name = item.name || item.id;
    const price = item.price || 'N/A';
    const qty = Number(item.qty || 0);
    const unitNum = (item.price && String(item.price).replace(/[^0-9.]/g,'')) ? parseFloat(String(item.price).replace(/[^0-9.]/g,'')) : null;
    const totalNum = unitNum !== null ? unitNum * qty : null;
    const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
    const available = (item.available || item.stock || item.units || item.quantityAvailable || null);
    return `
      <div class="cart-row">
        <img src="${image}" alt="${name}">
        <div class="meta">
          <div class="title">${name}</div>
          <div class="meta-sub">SKU: ${item.id || ''}</div>
          <div class="meta-sub">Available: ${available!==null?String(available):'—'}</div>
          <div class="meta-sub">Unit price: ${unitNum!==null?fmt(unitNum):String(price)}</div>
        </div>
        <div class="price">${totalNum===null?'N/A':fmt(totalNum)}</div>
        <div class="actions">
          <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
            <button class="btn-ghost" onclick="decreaseQty('${item.id}')">−</button>
            <div style="min-width:34px;text-align:center;font-weight:600">${qty}</div>
            <button class="btn-ghost" onclick="increaseQty('${item.id}')">+</button>
            <button class="btn-remove" style="margin-left:12px" onclick="removeFromCart('${item.id}')">Remove</button>
          </div>
        </div>
      </div>`;
  }

  function renderCart(){
    const items = loadCart(); const container = document.getElementById('cart-items');
    if(!container) return;
    const keys = Object.keys(items);
    if(!keys.length){ container.innerHTML = '<p class="muted">Your cart is empty.</p>'; document.getElementById('cart-summary').innerHTML=''; }
    else{
      container.innerHTML = keys.map(k=>formatRow(items[k])).join('');
      const subtotal = keys.reduce((s,k)=>{
        const p = items[k].price || '0';
        const num = parseFloat(String(p).replace(/[^0-9.]/g,'')) || 0;
        return s + num * (items[k].qty||0);
      },0);
      // Use site currency formatter when available
      const format = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function')
        ? window.tvCurrency.formatCurrency
        : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));

      document.getElementById('cart-summary').innerHTML = `
        <div class="sticky-box">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:14px;color:var(--muted)">Items</div>
            <div style="font-weight:700">${keys.length}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:16px;color:#111">Subtotal</div>
            <div class="subtotal">${format(subtotal)}</div>
          </div>
          <div class="muted" style="font-size:13px">Shipping & taxes calculated at checkout</div>
        </div>`;
    }

    const toCheckout = document.getElementById('to-checkout');
    const totalQty = keys.reduce((s,k)=>s + (items[k].qty||0), 0);
    if(toCheckout){
      // disable/enable based on cart contents
      toCheckout.disabled = (totalQty === 0);
      if(toCheckout.disabled) toCheckout.classList.add('btn-disabled'); else toCheckout.classList.remove('btn-disabled');
      // set a single onclick handler (replace previous) that respects disabled state
      toCheckout.onclick = function(){ if(this.disabled) return; location.href = 'checkout.html'; };
    }

    if(window.refreshCartBadge){ window.refreshCartBadge(); }
    else {
      const cartCountEls = document.querySelectorAll('#cart-count');
      const totalQty = keys.reduce((s,k)=>s + (items[k].qty||0), 0);
      cartCountEls.forEach(el => el.textContent = String(totalQty));
    }
  }

  // expose render for external triggers (e.g., when currency rates are ready)
  window.renderCart = renderCart;

  // re-render when currency rates become available so UI updates to converted values
  window.addEventListener && window.addEventListener('tvCurrencyRatesReady', function(){ try{ renderCart(); }catch(e){} });

  window.removeFromCart = function(id){
    try{
      const cart = loadCart();
      if(!cart[id]) return;
      delete cart[id];
      saveCart(cart);
      renderCart();
      if(window.refreshCartBadge) window.refreshCartBadge();
    }catch(e){ /* Silent error */ }
  };

  // increase item quantity by 1
  window.increaseQty = function(id){
    try{
      const cart = loadCart();
      if(!cart[id]) return;
      cart[id].qty = (Number(cart[id].qty) || 0) + 1;
      saveCart(cart);
      renderCart();
      if(window.refreshCartBadge) window.refreshCartBadge();
    }catch(e){ /* Silent error */ }
  };

  // decrease item quantity by 1 (min 1). If quantity goes to 0, remove item.
  window.decreaseQty = function(id){
    try{
      const cart = loadCart();
      if(!cart[id]) return;
      const current = Number(cart[id].qty) || 0;
      if(current <= 1){
        // remove item
        delete cart[id];
      } else {
        cart[id].qty = current - 1;
      }
      saveCart(cart);
      renderCart();
      if(window.refreshCartBadge) window.refreshCartBadge();
    }catch(e){ /* Silent error */ }
  };

  document.addEventListener('DOMContentLoaded', function(){ renderCart(); });
})();
