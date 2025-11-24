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
  const form = document.getElementById('login-form');
  const email = document.getElementById('login-email');
  const password = document.getElementById('login-password');
  const msg = document.getElementById('login-msg');

  function devFallbackLogin(user){
    // DEV fallback: store an auth marker so UI shows signed-in state
    localStorage.setItem('techverse_auth_user', JSON.stringify(user));
    // also store account record for demo purposes
    localStorage.setItem('techverse_account_v1', JSON.stringify({name:user.name,email:user.email,updated:Date.now()}));
    location.href = 'account.html';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const payload = { email: email.value.trim(), password: password.value };

    // Try server login endpoints (preferred when backend ready)
    try {
      // TODO: update the endpoint to match backend (e.g., '/login' or '/api/login')
      const loginUrls = ['/api/login','/login'];
      let resp = null;
      for(const url of loginUrls){
        try{
          resp = await fetch(url, {
            method: 'POST',
            credentials: 'include', // include cookies for session-based auth
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }catch(err){ resp = null; }
        if(resp) break;
      }

      if(resp && resp.ok){
        // Backend should return user info JSON or set a session cookie
        try{
          const data = await resp.json();
          // If server returns user object, save locally for UI until server-side session takes over
          if(data && data.user){
            localStorage.setItem('techverse_auth_user', JSON.stringify(data.user));
          } else if(data && data.name){
            localStorage.setItem('techverse_auth_user', JSON.stringify(data));
          }
        }catch(e){ /* response not JSON - ignore */ }
        location.href = 'account.html';
        return;
      }
    } catch (err) {
      console.warn('Server login failed or unreachable', err);
    }

    // Fallback local dev behavior: accept any non-empty credentials and store a demo user
    if(payload.email && payload.password){
      devFallbackLogin({ name: payload.email.split('@')[0] || payload.email, email: payload.email });
      return;
    }

    msg.textContent = 'Login failed. Check your credentials.';
  });
});
