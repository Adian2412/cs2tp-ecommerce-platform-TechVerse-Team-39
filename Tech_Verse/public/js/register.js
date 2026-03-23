document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = (() => {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = ((meta && meta.content) || '').trim();
      return raw ? raw.replace(/\/+$/, '') + '/api' : '/api';
    } catch (e) { return '/api'; }
  })();

  const form = document.getElementById('register-form');
  if (!form) return;

  const msgEl        = document.getElementById('register-msg');
  const firstEl      = document.getElementById('reg-first');
  const lastEl       = document.getElementById('reg-last');
  const emailEl      = document.getElementById('reg-email');
  const passwordEl   = document.getElementById('reg-password');
  const roleEl       = document.getElementById('reg-role');
  const adminCodeEl  = document.getElementById('reg-admin-code');
  const captchaEl    = document.getElementById('captcha-box');
  const privacyEl    = document.getElementById('privacy-consent'); // only on create.html
  const strengthText = document.getElementById('pw-strength-text');
  const strengthBar  = document.getElementById('pw-strength-bar');

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function setMessage(text, ok = false) {
    msgEl.textContent = text || '';
    msgEl.style.color = ok ? '#0a0' : '#d00';
  }

  function storeAuth(data, resp) {
    if (data && data.user) localStorage.setItem('techverse_auth_user', JSON.stringify(data.user));
    const sessionToken = (data && data.session_token) || resp.headers.get('X-Session-Token');
    if (sessionToken) localStorage.setItem('techverse_session_token', sessionToken);
  }

  function passwordStrength(password) {
    let score = 0;
    if (password.length >= 8)          score++;
    if (/[A-Z]/.test(password))        score++;
    if (/[a-z]/.test(password))        score++;
    if (/\d/.test(password))           score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }

  function updateStrength() {
    if (!passwordEl || !strengthBar || !strengthText) return;
    const password = passwordEl.value || '';
    const score = passwordStrength(password);
    const pct = Math.min(score * 20, 100);
    strengthBar.style.width = pct + '%';

    if (score <= 1) {
      strengthBar.style.background = '#d00';
      strengthText.textContent = password ? 'Password strength: weak' : '';
      strengthText.style.color = '#d00';
    } else if (score <= 3) {
      strengthBar.style.background = '#d48b00';
      strengthText.textContent = 'Password strength: medium';
      strengthText.style.color = '#d48b00';
    } else {
      strengthBar.style.background = '#0a8f3d';
      strengthText.textContent = 'Password strength: strong';
      strengthText.style.color = '#0a8f3d';
    }
  }

  if (passwordEl) passwordEl.addEventListener('input', updateStrength);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const first     = (firstEl?.value    || '').trim();
    const last      = (lastEl?.value     || '').trim();
    const email     = (emailEl?.value    || '').trim();
    const password  = passwordEl?.value  || '';
    const role      = (roleEl?.value     || 'customer').trim();
    const adminCode = (adminCodeEl?.value|| '').trim();
    const username  = [first, last].filter(Boolean).join(' ').trim();

    if (!username) {
      setMessage('Please enter your first name and surname.');
      return;
    }

    // Privacy consent — only required if the checkbox exists (create.html)
    if (privacyEl && !privacyEl.checked) {
      setMessage('Please read and accept the Privacy Policy to continue.');
      return;
    }

    if (!captchaEl || !captchaEl.checked) {
      setMessage('Please confirm the captcha checkbox.');
      return;
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    setMessage('');

    try {
      const resp = await fetch(`${API_BASE}/register`, {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          username,
          email,
          password,
          role,
          admin_code: adminCode || undefined,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || data.message || 'Registration failed.');

      storeAuth(data, resp);
      setMessage('Registration successful! Redirecting...', true);
      setTimeout(() => { location.href = 'index.html'; }, 700);
    } catch (error) {
      setMessage(error.message || 'Network error while creating account.');
    }
  });
});
