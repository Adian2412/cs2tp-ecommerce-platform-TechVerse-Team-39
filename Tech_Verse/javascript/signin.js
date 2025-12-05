/*
 signin.js
 - Handles login form submit
 - Attempts to call server `/login` or `/api/login` endpoint with credentials (credentials included for cookie sessions)
 - Fallback: when server is not available (local dev), uses localStorage to simulate authentication

 TODOs for backend integration (leave these comments for backend devs):
 - Replace fallback logic with real server response handling.
 - Ensure server sets a secure, httpOnly session cookie on successful login.
 - Optionally return user JSON so the client can store/display user info.
 - Implement CSRF protection: either read token from <meta name="csrf-token"> or rely on cookie-based CSRF handling.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Resolve API base for deployed environments (meta tag or global override)
  function tvApiBase(){
    try{
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const metaVal = meta && meta.content ? meta.content.trim() : '';
      const override = (window.TV_API_BASE || window.__TV_API_BASE__ || metaVal || '').trim();
      if(override) return override.replace(/\/+$/, '');
    }catch(e){}
    return '';
  }
  const API_BASE = tvApiBase();

  const form = document.getElementById('login-form');
  const email = document.getElementById('login-email');
  const password = document.getElementById('login-password');
  const msg = document.getElementById('login-msg');


  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const payload = { email: email.value.trim(), password: password.value };

    // Simple validation
    if (!email.value.trim() || !password.value.trim()) {
      msg.textContent = 'Please enter both email and password';
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
      msg.textContent = 'Please enter a valid email address';
      return;
    }

    // Attempt real server login
    try{
      const resp = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: API_BASE ? 'include' : 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(()=>({}));
      if(!resp.ok){
        msg.style.color = '#d00';
        msg.textContent = data.error || 'Login failed';
        return;
      }
      if(data && data.user){
        localStorage.setItem('techverse_auth_user', JSON.stringify(data.user));
      }
      msg.style.color = '#0a0';
      msg.textContent = 'Login successful! Redirecting...';
      setTimeout(() => location.href = 'index.html', 800);
    }catch(err){
      msg.style.color = '#d00';
      msg.textContent = 'Network error. Please try again.';
    }
  });
});
