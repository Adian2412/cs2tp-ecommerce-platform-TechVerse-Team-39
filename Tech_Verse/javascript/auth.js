// Authentication system with backend integration
document.addEventListener('DOMContentLoaded', () => {
  const authKey = 'techverse_auth_user';
  const sessionTokenKey = 'techverse_session_token';
  const signinBtn = document.getElementById('signin');
  const rightGroup = signinBtn ? signinBtn.parentElement : null;
  
  // Get auth headers including session token for cross-origin requests
  function getAuthHeaders() {
    const headers = { 'Accept': 'application/json' };
    const token = localStorage.getItem(sessionTokenKey);
    if (token) {
      headers['X-Session-Token'] = token;
    }
    return headers;
  }

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

  // Helper function to get API base URL consistently (defined before use)
  function getApiBaseUrl() {
    const metaApiBase = document.querySelector('meta[name="tv-api-base"]');
    let metaApiValue = metaApiBase ? metaApiBase.content.trim() : '';
    
    // If meta tag value exists, ensure it ends with /api
    if (metaApiValue && !metaApiValue.endsWith('/api')) {
      metaApiValue = metaApiValue.replace(/\/+$/, '') + '/api';
    }
    
    // Determine API_BASE: use meta tag value if present, otherwise use fallback
    // Use localhost instead of 127.0.0.1 for better cookie support in browsers
    return metaApiValue || (window.location.protocol === 'file:' ? 'https://cs2team39.cs2410-web01pvm.aston.ac.uk/api' : '/api');
  }

  // API base URL - use helper function for consistency
  const API_BASE = getApiBaseUrl();

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
            credentials: 'include',
            headers: getAuthHeaders()
          });
        }catch(e){
          console.warn('Logout API call failed:', e);
        }
        setCurrentUser(null);
        localStorage.removeItem(sessionTokenKey); // Clear session token on logout
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
          credentials: 'include' // Always use 'include' for cross-origin requests to send/receive cookies
        });

        const data = await resp.json();
        if(resp.ok){
          setCurrentUser(data.user);
          // Store session token for cross-origin requests
          const sessionToken = data.session_token || resp.headers.get('X-Session-Token');
          if(sessionToken){
            localStorage.setItem(sessionTokenKey, sessionToken);
          }
          msgEl.style.color = '#0a0';
          msgEl.textContent = 'Login successful! Redirecting...';
          setTimeout(() => location.href = 'index.html', 500);
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
          credentials: 'include' // Always use 'include' for cross-origin requests to send/receive cookies
        });

        const data = await resp.json();
        if(resp.ok){
          setCurrentUser(data.user);
          // Store session token for cross-origin requests
          const sessionToken = data.session_token || resp.headers.get('X-Session-Token');
          if(sessionToken){
            localStorage.setItem(sessionTokenKey, sessionToken);
          }
          msgEl.style.color = '#0a0';
          msgEl.textContent = 'Registration successful! Redirecting...';
          setTimeout(() => location.href = 'index.html', 500);
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
// NOTE: These functions read from localStorage cache only.
// For authentication decisions, always verify with the API (/api/user endpoint).
// localStorage is used as a cache for optimistic UI, not as the source of truth.

// Helper function to get API base URL consistently
function getApiBaseUrl() {
  const metaApiBase = document.querySelector('meta[name="tv-api-base"]');
  let metaApiValue = metaApiBase ? metaApiBase.content.trim() : '';
  
  // If meta tag value exists, ensure it ends with /api
  if (metaApiValue && !metaApiValue.endsWith('/api')) {
    metaApiValue = metaApiValue.replace(/\/+$/, '') + '/api';
  }
  
  // Determine API_BASE: use meta tag value if present, otherwise use fallback
  // Use localhost instead of 127.0.0.1 for better cookie support in browsers
  return metaApiValue || (window.location.protocol === 'file:' ? 'https://cs2team39.cs2410-web01pvm.aston.ac.uk/api' : '/api');
}

window.TechVerseAuth = {
  // Get cached user from localStorage (may be stale - always verify with API)
  getCurrentUser: () => {
    const raw = localStorage.getItem('techverse_auth_user');
    if(!raw) return null;
    try{
      return JSON.parse(raw);
    }catch(e){
      return null;
    }
  },

  // Check if cached user is admin (verify with API for actual auth decisions)
  isAdmin: () => {
    const user = window.TechVerseAuth.getCurrentUser();
    return user && user.role === 'admin';
  },

  // All authenticated users can sell (no separate seller role)
  // NOTE: This checks localStorage cache - verify with API before allowing actions
  isSeller: () => {
    const user = window.TechVerseAuth.getCurrentUser();
    return user && user.role !== 'guest';
  },
  
  // Verify authentication with API (single source of truth)
  // Returns Promise that resolves to user object if authenticated, null otherwise
  verifyWithAPI: async () => {
    try {
      const API_BASE = getApiBaseUrl();
      
      // Include session token header for cross-origin requests
      const headers = { 'Accept': 'application/json' };
      const sessionToken = localStorage.getItem('techverse_session_token');
      if (sessionToken) {
        headers['X-Session-Token'] = sessionToken;
      }

      const resp = await fetch(`${API_BASE}/user`, {
        credentials: 'include',
        headers: headers
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data && data.user) {
          // Update cache with fresh data
          localStorage.setItem('techverse_auth_user', JSON.stringify(data.user));
          return data.user;
        } else {
          console.warn('API returned OK but no user data');
        }
      } else {
        console.warn('Authentication verification failed with status:', resp.status);
      }

      // Not authenticated - clear cache but keep session token (might be valid)
      localStorage.removeItem('techverse_auth_user');
      return null;
    } catch (error) {
      console.error('Failed to verify authentication with API:', error);
      return null;
    }
  },

  // Attempt to recover session by re-authenticating with stored credentials
  // Returns Promise that resolves to user object if recovery successful, null otherwise
  recoverSession: async () => {
    try {
      // Check if we have cached credentials
      const cachedUser = window.TechVerseAuth.getCurrentUser();
      if (!cachedUser || !cachedUser.email) {
        return null;
      }

      // Try to re-login with cached credentials (this will create a new session)
      const API_BASE = getApiBaseUrl();
      const resp = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({
          email: cachedUser.email,
          password: 'CACHED_SESSION_RECOVERY' // Special marker - backend should handle this
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data && data.user) {
          localStorage.setItem('techverse_auth_user', JSON.stringify(data.user));
          return data.user;
        }
      }

      return null;
    } catch (error) {
      console.error('Session recovery failed:', error);
      return null;
    }
  },

  // Check if user is authenticated with fallback options
  // Returns Promise that resolves to user object if authenticated, null otherwise
  checkAuthStatus: async (options = {}) => {
    const { allowRecovery = true, maxRetries = 1 } = options;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      // First try direct API verification
      const user = await window.TechVerseAuth.verifyWithAPI();
      if (user) {
        return user;
      }

      // If direct verification failed and recovery is allowed, try session recovery
      if (allowRecovery && attempt === 1) {
        const recoveredUser = await window.TechVerseAuth.recoverSession();
        if (recoveredUser) {
          return recoveredUser;
        }
      }

      // Wait before retrying (except on last attempt)
      if (attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return null;
  },

  // Debug utility for authentication issues
  debug: async () => {
    // Debug functionality - returns data for programmatic use
    const debugInfo = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      protocol: window.location.protocol,
      cachedUser: window.TechVerseAuth.getCurrentUser(),
      hasCookies: !!document.cookie
    };

    try {
      const API_BASE = getApiBaseUrl();
      debugInfo.apiBase = API_BASE;

      const debugResp = await fetch(`${API_BASE}/debug-session`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (debugResp.ok) {
        debugInfo.sessionDebug = await debugResp.json();
      }

      const authResp = await fetch(`${API_BASE}/user`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      debugInfo.authStatus = authResp.status;
      debugInfo.sessionActive = authResp.headers.get('X-Session-Active');
      debugInfo.userAuthenticated = authResp.headers.get('X-User-Authenticated');

      if (authResp.ok) {
        debugInfo.authData = await authResp.json();
      }
    } catch (error) {
      debugInfo.error = error.message;
    }

    return debugInfo;
  }
};
