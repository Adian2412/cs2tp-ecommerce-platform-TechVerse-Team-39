/*
  auth-modal.js
  Simple client-side modal that offers a sign-in iframe (local) and a
  "Checkout as guest" button. Exposes `attachAuthModalToCheckout(buttonId)`
  which binds to the specified button: if user is signed in it navigates
  straight to checkout; otherwise it shows the modal.

  The code uses the same localStorage key as `auth.js`: `techverse_auth_user`.
*/
(function(){
  const AUTH_KEY = 'techverse_auth_user';

  function createModal(){
    const overlay = document.createElement('div');
    overlay.id = 'tv-auth-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const box = document.createElement('div');
    box.style.width = '420px';
    box.style.maxWidth = '94%';
    box.style.background = '#fff';
    box.style.padding = '16px';
    box.style.borderRadius = '8px';
    box.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)';

    const title = document.createElement('h3');
    title.textContent = 'Sign in or continue as guest';
    title.style.marginTop = '0';

    // iframe that loads local signin page when possible
    const iframeWrap = document.createElement('div');
    iframeWrap.style.height = '260px';
    iframeWrap.style.marginBottom = '12px';
    iframeWrap.style.overflow = 'hidden';
    iframeWrap.style.border = '1px solid #eee';
    iframeWrap.style.borderRadius = '6px';

    const iframe = document.createElement('iframe');
    iframe.src = location.protocol === 'file:' ? 'signin.html' : '/login';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframeWrap.appendChild(iframe);

    // actions area: primary Sign In button and secondary Checkout as guest below
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.flexDirection = 'column';
    actions.style.gap = '8px';

    const signinBtn = document.createElement('button');
    signinBtn.className = 'btn-primary';
    signinBtn.textContent = 'Sign In';
    signinBtn.style.width = '100%';

    const guestBtn = document.createElement('button');
    guestBtn.className = 'btn-ghost';
    guestBtn.textContent = 'Checkout as guest';
    guestBtn.style.width = '100%';

    actions.appendChild(signinBtn);
    actions.appendChild(guestBtn);

    // top-right X close control (instead of a labeled Close button)
    const closeX = document.createElement('button');
    closeX.className = 'tv-auth-close-x';
    closeX.innerHTML = '&times;';
    closeX.setAttribute('aria-label', 'Close');
    closeX.style.position = 'absolute';
    closeX.style.top = '8px';
    closeX.style.right = '8px';
    closeX.style.border = '0';
    closeX.style.background = 'transparent';
    closeX.style.fontSize = '22px';
    closeX.style.cursor = 'pointer';
    closeX.style.lineHeight = '1';
    box.appendChild(closeX);

    box.appendChild(title);
    box.appendChild(iframeWrap);
    box.appendChild(actions);
    overlay.appendChild(box);

    // behaviors
    function removeModal(){ if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }

    // close X handler
    closeX.addEventListener('click', removeModal);
    // clicking outside the box closes as well
    overlay.addEventListener('click', function(e){ if(e.target === overlay) removeModal(); });

    signinBtn.addEventListener('click', function(){
      // navigate to full sign-in page in same tab (user flow)
      location.href = location.protocol === 'file:' ? 'signin.html' : '/login';
    });

    guestBtn.addEventListener('click', function(){
      // proceed to checkout as guest
      // don't allow other handlers to interfere
      removeModal();
      location.assign('checkout.html');
    });

    return overlay;
  }

  // show modal (adds to body). Creates new each time to avoid leftover state.
  function showAuthModal(){
    const modal = createModal();
    document.body.appendChild(modal);
  }

  // Attach behavior to a checkout button id. If logged in, navigate directly.
  function attachAuthModalToCheckout(buttonId){
    const btn = document.getElementById(buttonId);
    if(!btn) return;
    btn.addEventListener('click', function(ev){
      // if button is disabled let other handlers handle
      if(btn.disabled) return;
      // prevent other handlers from navigating away while we decide
      ev.preventDefault();
      ev.stopImmediatePropagation && ev.stopImmediatePropagation();
      const raw = localStorage.getItem(AUTH_KEY);
      if(raw){
        // signed in - go straight to checkout
        location.assign('checkout.html');
      } else {
        showAuthModal();
      }
    }, true);
  }

  // expose API
  window.tvAuthModal = { showAuthModal, attachAuthModalToCheckout };
})();
