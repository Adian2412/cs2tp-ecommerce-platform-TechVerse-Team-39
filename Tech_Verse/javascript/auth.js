// Authentication system with backend integration
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
  // Role-based navigation (only admin)
  const navAdmin = document.getElementById('nav-admin');

  // API base URL - use relative if same domain, absolute if file system
  const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:8000/api' : '/api';

  function setLoggedInUI(isLoggedIn, user){
    if(isLoggedIn && user){
      if(navMyAccount) navMyAccount.style.display = '';
      if(navWishlist) navWishlist.style.display = '';
      if(navCheckout) navCheckout.style.display = '';
      if(phoneNumber) phoneNumber.style.display = '';
      // when signed in: show favorite (heart) and user icon, hide cart icon
      if(navFav) navFav.style.display = '';
      if(navUser) navUser.style.display = '';
      if(navCart) navCart.style.display = 'none';

      // Show admin navigation only for admin users
      if(navAdmin && user.role === 'admin') navAdmin.style.display = '';
    }else{
      if(navMyAccount) navMyAccount.style.display = 'none';
      if(navWishlist) navWishlist.style.display = 'none';
      if(navCheckout) navCheckout.style.display = 'none';
      if(phoneNumber) phoneNumber.style.display = 'none';
      // when not signed in: hide favorite and user, show cart
      if(navFav) navFav.style.display = 'none';
      if(navUser) navUser.style.display = 'none';
      if(navCart) navCart.style.display = '';
      // hide role-based navigation
      if(navAdmin) navAdmin.style.display = 'none';
    }
  }

  function getCurrentUser(){
    const raw = localStorage.getItem(authKey);
    if(!raw) return null;
    try{
      return JSON.parse(raw);
    }catch(e){
      return null;
    }
  }

  function setCurrentUser(user){
    if(user){
      localStorage.setItem(authKey, JSON.stringify(user));
    }else{
      localStorage.removeItem(authKey);
    }
  }

  // Initialize auth state
  const currentUser = getCurrentUser();
  if(!signinBtn) return;

  if(currentUser){
    // show account name on the button but make it non-interactive; account icon handles navigation
    signinBtn.textContent = currentUser.username || 'Account';
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
      out.addEventListener('click', async ()=>{
        try{
          await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            credentials: window.location.protocol === 'file:' ? 'include' : 'same-origin'
          });
        }catch(e){
          console.warn('Logout API call failed:', e);
        }
        setCurrentUser(null);
        location.reload();
      });
      // avoid duplicating if already added
      if(!rightGroup.querySelector('.header-signout')) rightGroup.appendChild(out);
    }
    // show protected nav items for signed in user
    setLoggedInUI(true, currentUser);
  } else {
    // not signed in
    signinBtn.textContent = 'Sign In';
    signinBtn.onclick = () => { location.href = 'signin.html'; };
    setLoggedInUI(false);
  }

  // Handle login form if on login page
  const loginForm = document.getElementById('login-form');
  if(loginForm){
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const msgEl = document.getElementById('login-msg');

      try{
        const resp = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email, password}),
          credentials: window.location.protocol === 'file:' ? 'include' : 'same-origin'
        });

        const data = await resp.json();
        if(resp.ok){
          setCurrentUser(data.user);
          msgEl.style.color = '#0a0';
          msgEl.textContent = 'Login successful! Redirecting...';
          setTimeout(() => location.href = 'index.html', 1000);
        }else{
          msgEl.textContent = data.error || 'Login failed';
        }
      }catch(e){
        msgEl.textContent = 'Network error: ' + e.message;
      }
    });
  }

  // Handle register form if on login page
  const registerForm = document.getElementById('register-form');
  if(registerForm){
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const role = document.getElementById('reg-role').value;
      const msgEl = document.getElementById('register-msg');

      try{
        const resp = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({username, email, password, role}),
          credentials: window.location.protocol === 'file:' ? 'include' : 'same-origin'
        });

        const data = await resp.json();
        if(resp.ok){
          setCurrentUser(data.user);
          msgEl.style.color = '#0a0';
          msgEl.textContent = 'Registration successful! Redirecting...';
          setTimeout(() => location.href = 'index.html', 1000);
        }else{
          msgEl.textContent = data.error || 'Registration failed';
        }
      }catch(e){
        msgEl.textContent = 'Network error: ' + e.message;
      }
    });
  }
});

// Utility functions for other scripts
window.TechVerseAuth = {
  getCurrentUser: () => {
    const raw = localStorage.getItem('techverse_auth_user');
    if(!raw) return null;
    try{
      return JSON.parse(raw);
    }catch(e){
      return null;
    }
  },

  isAdmin: () => {
    const user = window.TechVerseAuth.getCurrentUser();
    return user && user.role === 'admin';
  },

  // All authenticated users can sell (no separate seller role)
  isSeller: () => {
    const user = window.TechVerseAuth.getCurrentUser();
    return user && user.role !== 'guest';
  }
};
