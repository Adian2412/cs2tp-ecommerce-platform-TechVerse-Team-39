document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const subjectInput = document.getElementById('contact-subject');
  const messageInput = document.getElementById('contact-message');
  const submitBtn = form.querySelector('button[type="submit"]');

  function apiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const raw = (window.TV_API_BASE || window.__TV_API_BASE__ || (meta && meta.content) || '').trim();
      return raw ? raw.replace(/\/+$/, '') : '';
    } catch (e) { return ''; }
  }

  function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  let statusEl = document.getElementById('contact-status');
  if (!statusEl) {
    statusEl = document.createElement('p');
    statusEl.id = 'contact-status';
    statusEl.className = 'muted';
    statusEl.style.marginTop = '10px';
    form.appendChild(statusEl);
  }

  async function prefillFromSession() {
    try {
      const res = await fetch(`${apiBase()}/api/auth/me`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': getCsrfToken() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          if (nameInput && !nameInput.value) nameInput.value = data.user.name || '';
          if (emailInput && !emailInput.value) emailInput.value = data.user.email || '';
        }
      }
    } catch (e) {}
  }

  prefillFromSession();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name:    (nameInput?.value    || '').trim(),
      email:   (emailInput?.value   || '').trim(),
      subject: (subjectInput?.value || '').trim(),
      message: (messageInput?.value || '').trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      statusEl.style.color = '#b42318';
      statusEl.textContent = 'Please fill in all fields before sending.';
      return;
    }

    submitBtn.disabled = true;
    statusEl.style.color = '#667085';
    statusEl.textContent = 'Sending your message…';

    try {
      const response = await fetch(`${apiBase()}/api/contact-messages`, {
        method: 'POST', credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Unable to send message.');

      form.reset();
      prefillFromSession();
      statusEl.style.color = '#1f6a2e';
      statusEl.textContent = 'Thanks — your message has been sent to the admin inbox.';
    } catch (error) {
      statusEl.style.color = '#b42318';
      statusEl.textContent = error.message;
    } finally {
      submitBtn.disabled = false;
    }
  });
});
