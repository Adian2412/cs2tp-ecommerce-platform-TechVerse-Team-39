/*
 register.js
 - Handles account creation form submit
 - Attempts to call server `/register` or `/api/register` endpoint with form data
 - Fallback: when server is not available (local dev), store account locally in localStorage

 TODOs for backend integration:
 - Replace fallback logic with server POST /register that creates the user and returns user JSON
 - Add server-side validation and return helpful error messages
 - Ensure passwords are never stored client-side in production
*/

document.addEventListener('DOMContentLoaded', ()=>{
  const form = document.getElementById('register-form');
  const first = document.getElementById('reg-first');
  const last = document.getElementById('reg-last');
  const email = document.getElementById('reg-email');
  const password = document.getElementById('reg-password');
  const msg = document.getElementById('register-msg');

  function devFallbackRegister(user){
    // store account locally
    localStorage.setItem('techverse_account_v1', JSON.stringify({name:user.name,email:user.email,updated:Date.now()}));
    // also mark as signed in for demo
    localStorage.setItem('techverse_auth_user', JSON.stringify(user));
    location.href = 'account.html';
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent = '';
    const payload = { first_name: first.value.trim(), last_name: last.value.trim(), email: email.value.trim(), password: password.value };

    // Try server register endpoints (update to exact route when backend ready)
    try{
      const regUrls = ['/api/register','/register'];
      let resp = null;
      for(const url of regUrls){
        try{
          resp = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }catch(err){ resp = null; }
        if(resp) break;
      }
      if(resp && resp.ok){
        try{ const data = await resp.json(); if(data && (data.user || data.name)){ localStorage.setItem('techverse_auth_user', JSON.stringify(data.user||data)); }}catch(e){}
        location.href = 'account.html';
        return;
      }
    }catch(err){ console.warn('Server register failed or unreachable', err); }

    // Fallback dev behaviour
    if(payload.email && payload.password && payload.first_name){
      devFallbackRegister({ name: payload.first_name + (payload.last_name?(' '+payload.last_name):''), email: payload.email });
      return;
    }

    msg.textContent = 'Registration failed — please complete all fields.';
  });
});
