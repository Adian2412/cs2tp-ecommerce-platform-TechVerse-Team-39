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

  // PASSWORD STRENGTH METER
  const pw = document.getElementById('reg-password');
  const text = document.getElementById('pw-strength-text');
  const bar  = document.getElementById('pw-strength-bar');

  pw.addEventListener('input', () => {
    const v = pw.value;
    let strength = 0;

    if (v.length >= 8) strength++;
    if (/[A-Z]/.test(v)) strength++;
    if (/[0-9]/.test(v)) strength++;
    if (/[^A-Za-z0-9]/.test(v)) strength++;

    switch (strength) {
      case 0:
        text.textContent = "";
        bar.style.width = "0";
        bar.style.background = "red";
        break;
      case 1:
        text.textContent = "Weak";
        bar.style.width = "25%";
        bar.style.background = "red";
        break;
      case 2:
        text.textContent = "Fair";
        bar.style.width = "50%";
        bar.style.background = "orange";
        break;
      case 3:
        text.textContent = "Good";
        bar.style.width = "75%";
        bar.style.background = "gold";
        break;
      case 4:
        text.textContent = "Strong";
        bar.style.width = "100%";
        bar.style.background = "green";
        break;
    }
  });

 
  form.addEventListener('submit', async (e)=>{

   	// CAPTCHA CHECK
	const captcha = document.getElementById('captcha-box');
	if (!captcha.checked) {
		e.preventDefault();
		msg.textContent = "Please complete the CAPTCHA.";
		return;
	}
   
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


