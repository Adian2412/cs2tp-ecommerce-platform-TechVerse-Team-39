/*
Backend integration notes (to do later when Laravel backend is available):

- Replace the localStorage-based detection and fallback with an authenticated
  call to `GET /api/user`. Example flow:
    - Client calls `GET /api/user`.
    - Server returns 200 + user JSON when authenticated, or 401 when not.
    - Client updates header based on the response.

- For sign-out in production, call `POST /logout` or an appropriate endpoint
  to clear the server session, then reload the page.

- Listings, reviews, and uploads should call the APIs described in `BACKEND_TODO.md`.

TODOs when backend is ready:
 - Update `getLoginUrl()` behavior to point to the correct server login route.
 - Try calling `/api/user` first; if it returns 200 use that user info.
 - Update sign-out to POST `/logout` and handle redirecting to homepage.
 - Remove localStorage usage (only keep a helpful dev fallback if needed).
*/

// Lightweight client-side auth shim to adapt header for server-side auth later
document.addEventListener('DOMContentLoaded', () => {
  const authKey = 'techverse_auth_user';
  const signinBtn = document.getElementById('signin');
  const rightGroup = signinBtn ? signinBtn.parentElement : null;
  // Topnav elements that should be hidden when not signed in
  const navMyAccount = document.getElementById('nav-myaccount');
  const navWishlist = document.getElementById('nav-wishlist');
  const navCheckout = document.getElementById('nav-checkout');
  const phoneNumber = document.getElementById('phone-number');
  // Midnav elements (icons) to correlate on home page
  const navFav = document.getElementById('nav-fav');
  const navCart = document.getElementById('nav-cart');
  const navUser = document.getElementById('nav-user');

  function getLoginUrl(){
    // If served from file system, fall back to local signin page; otherwise point to server login route
    return location.protocol === 'file:' ? 'signin.html' : '/login';
  }

  const raw = localStorage.getItem(authKey);
  if(!signinBtn) return;
  function setLoggedInUI(isLoggedIn, user){
    if(isLoggedIn){
      if(navMyAccount) navMyAccount.style.display = '';
      if(navWishlist) navWishlist.style.display = '';
      if(navCheckout) navCheckout.style.display = '';
      if(phoneNumber) phoneNumber.style.display = '';
      // when signed in: show favorite (heart) and user icon, hide cart icon
      if(navFav) navFav.style.display = '';
      if(navUser) navUser.style.display = '';
      if(navCart) navCart.style.display = 'none';
    }else{
      if(navMyAccount) navMyAccount.style.display = 'none';
      if(navWishlist) navWishlist.style.display = 'none';
      if(navCheckout) navCheckout.style.display = 'none';
      if(phoneNumber) phoneNumber.style.display = 'none';
      // when not signed in: hide favorite and user, show cart
      if(navFav) navFav.style.display = 'none';
      if(navUser) navUser.style.display = 'none';
      if(navCart) navCart.style.display = '';
    }
  }

  // default: hide those items until we know the auth state
  setLoggedInUI(false);

  if(raw){
    try{
      const user = JSON.parse(raw);
      // show account name on the button but make it non-interactive; account icon handles navigation
      signinBtn.textContent = user.name || 'Account';
      // disable the button so it is not interactive
      signinBtn.disabled = true;
      signinBtn.setAttribute('aria-disabled', 'true');
      signinBtn.onclick = null;

      // create small sign out button next to it (skip on account page — sign out is available in Account Actions)
      const isAccountPage = typeof location !== 'undefined' && (location.href.indexOf('account.html') !== -1 || (location.pathname && /account\.html$/i.test(location.pathname)));
      if(!isAccountPage){
        let out = document.createElement('button');
        out.className = 'btn-ghost header-signout';
        out.textContent = 'Sign Out';
        out.addEventListener('click', ()=>{
          localStorage.removeItem(authKey);
          // reload to reflect new state
          location.reload();
        });
        // avoid duplicating if already added
        if(!rightGroup.querySelector('.header-signout')) rightGroup.appendChild(out);
      }
      // show protected nav items for signed in user
      setLoggedInUI(true, user);
    }catch(e){
      // if parse failed, treat as not signed in
      signinBtn.textContent = 'Sign In';
      signinBtn.onclick = () => { location.href = getLoginUrl(); };
    }
  } else {
    // not signed in - send to server login route (or local signin.html when developing)
    signinBtn.textContent = 'Sign In';
    signinBtn.onclick = () => { location.href = getLoginUrl(); };
  }
});
