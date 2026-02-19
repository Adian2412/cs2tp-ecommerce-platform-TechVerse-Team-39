/*
  auth-modal.js
  Shows a sign-in prompt or "Checkout as guest" option when the user
  tries to proceed to checkout without being authenticated.

  Auth check uses the server session (POST /api/auth/me) to stay
  consistent with the rest of the app — NOT localStorage.
*/
(function () {

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    async function isLoggedIn() {
        try {
            const res = await fetch('/api/auth/me', {
                method:      'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
            });
            if (!res.ok) return false;
            const data = await res.json();
            return !!(data.authenticated && data.user);
        } catch (e) {
            return false;
        }
    }

    function createModal() {
        const overlay = document.createElement('div');
        overlay.id = 'tv-auth-overlay';
        overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';

        const box = document.createElement('div');
        box.style.cssText = 'width:420px;max-width:94%;background:#fff;padding:24px;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,0.2);position:relative';

        // Close X
        const closeX = document.createElement('button');
        closeX.innerHTML = '&times;';
        closeX.setAttribute('aria-label', 'Close');
        closeX.style.cssText = 'position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:22px;cursor:pointer;line-height:1;color:#666';
        closeX.addEventListener('click', removeModal);

        const title = document.createElement('h3');
        title.textContent = 'Sign in to continue';
        title.style.marginTop = '0';

        const info = document.createElement('p');
        info.style.color = '#6b7280';
        info.style.fontSize = '14px';
        info.textContent = 'You need to be signed in to proceed to checkout.';

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:16px';

        const signinBtn = document.createElement('button');
        signinBtn.className = 'btn-primary';
        signinBtn.textContent = 'Sign In';
        signinBtn.style.width = '100%';
        signinBtn.addEventListener('click', () => {
            location.href = 'signin.html';
        });

        const guestBtn = document.createElement('button');
        guestBtn.className = 'btn-ghost';
        guestBtn.textContent = 'Continue as guest';
        guestBtn.style.width = '100%';
        guestBtn.addEventListener('click', () => {
            removeModal();
            location.assign('checkout.html');
        });

        actions.appendChild(signinBtn);
        actions.appendChild(guestBtn);

        box.appendChild(closeX);
        box.appendChild(title);
        box.appendChild(info);
        box.appendChild(actions);
        overlay.appendChild(box);

        // Click outside closes
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) removeModal();
        });

        function removeModal() {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }

        return overlay;
    }

    function showAuthModal() {
        const modal = createModal();
        document.body.appendChild(modal);
    }

    // Attach to a checkout button: if logged in go straight to checkout,
    // otherwise show the modal. Uses server session check, not localStorage.
    function attachAuthModalToCheckout(buttonId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.addEventListener('click', async function (ev) {
            if (btn.disabled) return;
            ev.preventDefault();
            ev.stopImmediatePropagation && ev.stopImmediatePropagation();

            const loggedIn = await isLoggedIn();
            if (loggedIn) {
                location.assign('checkout.html');
            } else {
                showAuthModal();
            }
        }, true);
    }

    window.tvAuthModal = { showAuthModal, attachAuthModalToCheckout };

})();
