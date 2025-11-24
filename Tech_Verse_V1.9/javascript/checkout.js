// Small client-side checkout display using localStorage fallback
(function(){
  const CART_KEY = 'techverse_cart_v1';
  function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); }catch(e){ return {}; } }
  function formatItem(it){
    const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
    const qty = Number(it.qty||0);
    const pnum = (it.price && String(it.price).replace(/[^0-9.]/g,'')) ? parseFloat(String(it.price).replace(/[^0-9.]/g,'')) : null;
    return `<div style="padding:8px;border:1px solid #eee;margin-bottom:8px;border-radius:6px">`+
      `<div style="font-weight:600">${it.name||it.id}</div>`+
      `<div>Qty: ${qty}</div>`+
      `<div>Price: ${pnum!==null?fmt(pnum):'N/A'}</div>`+
      `</div>`;
  }
  const items = loadCart(); const container = document.getElementById('checkout-items');
  if(!container) return;
  const keys = Object.keys(items);
  let subtotal = 0;
  if(!keys.length){ container.innerHTML = '<p class="muted">Your cart is empty.</p>'; document.getElementById('checkout-summary').innerHTML=''; }
  else{
    container.innerHTML = keys.map(k=>formatItem(items[k])).join('');
    subtotal = keys.reduce((s,k)=>{
      const p = items[k].price || '0';
      const num = parseFloat(String(p).replace(/[^0-9.]/g,'')) || 0;
      return s + num * (items[k].qty||0);
    },0);
    const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
    // Populate structured summary elements if present, otherwise fall back to replacing #checkout-summary
    const summarySubEl = document.getElementById('summary-subtotal');
    const checkoutSummaryEl = document.getElementById('checkout-summary');
    if(summarySubEl){
      summarySubEl.textContent = `Subtotal: ${fmt(subtotal)}`;
    } else if(checkoutSummaryEl){
      checkoutSummaryEl.innerHTML = `<div><strong>Subtotal:</strong> ${fmt(subtotal)}</div>`;
    }
  }

  // shipping and totals
  const shippingInputs = Array.from(document.querySelectorAll('input[name="shipping"]'));
  function getSelectedShippingCost(){
    const sel = shippingInputs.find(i=>i.checked);
    return sel ? parseFloat(sel.dataset.cost || '0') : 0;
  }
  function renderPaymentSummary(){
    const ship = getSelectedShippingCost();
    const total = subtotal + ship;
    const subEl = document.getElementById('summary-subtotal');
    const shipEl = document.getElementById('summary-shipping');
    const totEl = document.getElementById('summary-total');
    const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
    if(subEl) subEl.textContent = `Subtotal: ${fmt(subtotal)}`;
    if(shipEl) shipEl.textContent = `Shipping: ${fmt(ship)}`;
    if(totEl) totEl.textContent = `Total: ${fmt(total)}`;
    // Also ensure fallback #checkout-summary shows a minimal summary when structured elements aren't present
    const checkoutSummaryEl = document.getElementById('checkout-summary');
    if(checkoutSummaryEl && !subEl){ checkoutSummaryEl.innerHTML = `<div><strong>Subtotal:</strong> ${fmt(subtotal)}</div>`; }
  }
  // Update shipping labels to show local currency
  function refreshShippingLabels(){
    const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));
    shippingInputs.forEach(i=>{
      const span = i.parentElement && i.parentElement.querySelector('.shipping-cost');
      const cost = parseFloat(i.dataset.cost || '0');
      if(span) span.textContent = fmt(cost);
    });
  }

  shippingInputs.forEach(i=>i.addEventListener('change', renderPaymentSummary));
  // initial render and label refresh
  refreshShippingLabels();
  renderPaymentSummary();

  // Re-run label refresh and payment render when currency rates are ready
  window.addEventListener && window.addEventListener('tvCurrencyRatesReady', function(){ try{ refreshShippingLabels(); renderPaymentSummary(); }catch(e){} });

  document.getElementById('place-order').addEventListener('click', function(){
    // dummy action: show thank-you message for 30s then redirect to home
    const ship = getSelectedShippingCost();
    const total = subtotal + ship;
    const fmt = (window.tvCurrency && typeof window.tvCurrency.formatCurrency === 'function') ? window.tvCurrency.formatCurrency : (v=> (Number.isFinite(Number(v)) ? '£'+Number(v).toFixed(2) : String(v)));

    // disable place-order to prevent double clicks
    const placeBtn = document.getElementById('place-order');
    if(placeBtn){ placeBtn.disabled = true; placeBtn.classList.add('btn-disabled'); }

    let seconds = 30;
    const resultEl = document.getElementById('order-result');
    if(resultEl){
      resultEl.style.color = 'green';
      resultEl.textContent = `Thank you — your order has been placed. Redirecting to home in ${seconds} seconds...`;
    }

    // keep the cart contents and price breakdown visible during the countdown

    // update countdown every second
    const intervalId = setInterval(()=>{
      seconds -= 1;
      if(resultEl) resultEl.textContent = `Thank you — your order has been placed. Redirecting to home in ${seconds} second${seconds===1?'':'s'}...`;
      if(seconds <= 0){
        clearInterval(intervalId);
        // remove cart data now that countdown finished
        try{ localStorage.removeItem(CART_KEY); }catch(e){}
        // refresh shared badge (will hide it when cart is empty)
        if(window.refreshCartBadge) window.refreshCartBadge(); else {
          const cartCount = document.querySelectorAll('#cart-count');
          cartCount.forEach(el=>el.textContent='0');
        }
        // final redirect
        try{ window.location.href = 'index.html'; }catch(e){ /* ignore */ }
      }
    }, 1000);
    // do not modify the cart UI until countdown completes
  });
  // Guest checkout removed on checkout page; use place-order flow only.
})();
