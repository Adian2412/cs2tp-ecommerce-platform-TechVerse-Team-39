// Shared cart badge updater: shows count when >0, hides otherwise.
(function(){
  const CART_KEY = 'techverse_cart_v1';

  function loadCart(){
    const raw = localStorage.getItem(CART_KEY);
    if(!raw) return {};
    try{ return JSON.parse(raw); }catch(e){ return {}; }
  }

  function cartTotalCount(){
    const cart = loadCart(); let sum = 0;
    Object.values(cart).forEach(it => { sum += (it.qty||0); });
    return sum;
  }

  function refreshCartBadge(){
    const count = cartTotalCount();
    const els = document.querySelectorAll('#cart-count');
    els.forEach(el => {
      if(count > 0){ el.textContent = String(count); el.style.display = '';} else { el.textContent = ''; el.style.display = 'none'; }
    });
    const navCart = document.getElementById('nav-cart');
    if(navCart){ if(count>0) navCart.classList.add('has-items'); else navCart.classList.remove('has-items'); }
    return count;
  }

  // expose globally so other scripts can call after modifying cart
  window.refreshCartBadge = refreshCartBadge;

  // run on load and on storage events (cross-tab updates)
  document.addEventListener('DOMContentLoaded', refreshCartBadge);
  window.addEventListener('storage', function(e){ if(e.key === CART_KEY) refreshCartBadge(); });

})();
