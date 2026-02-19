
document.addEventListener('DOMContentLoaded', () => {
    const form           = document.getElementById('register-form');
    const first          = document.getElementById('reg-first');
    const last           = document.getElementById('reg-last');
    const email          = document.getElementById('reg-email');
    const password       = document.getElementById('reg-password');
    const msg            = document.getElementById('register-msg');
    const privacyConsent = document.getElementById('privacy-consent');
    const captchaBox     = document.getElementById('captcha-box');

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function showMsg(text, isError = true) {
        msg.textContent = text;
        msg.style.color = isError ? '#d00' : 'green';
    }

    // ── Password strength meter ───────────────────────────────────────────────
    const strengthText = document.getElementById('pw-strength-text');
    const strengthBar  = document.getElementById('pw-strength-bar');

    password.addEventListener('input', () => {
        const v = password.value;
        let score = 0;
        if (v.length >= 8)           score++;
        if (/[A-Z]/.test(v))         score++;
        if (/[0-9]/.test(v))         score++;
        if (/[^A-Za-z0-9]/.test(v))  score++;

        const levels = [
            { label: '',       width: '0',    color: 'transparent' },
            { label: 'Weak',   width: '25%',  color: '#e53e3e' },
            { label: 'Fair',   width: '50%',  color: '#dd6b20' },
            { label: 'Good',   width: '75%',  color: '#d69e2e' },
            { label: 'Strong', width: '100%', color: '#38a169' },
        ];
        const level = levels[score] || levels[0];
        strengthText.textContent     = level.label;
        strengthBar.style.width      = level.width;
        strengthBar.style.background = level.color;
    });

    // ── Form submission ───────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMsg('');

        if (privacyConsent && !privacyConsent.checked) {
            showMsg('Please read and accept the Privacy Policy to continue.');
            return;
        }
        if (captchaBox && !captchaBox.checked) {
            showMsg('Please complete the CAPTCHA.');
            return;
        }

        const firstName = first.value.trim();
        const lastName  = last.value.trim();
        const emailVal  = email.value.trim();
        const passVal   = password.value;

        if (!firstName || !emailVal || !passVal) {
            showMsg('Please fill in all required fields.');
            return;
        }
        if (passVal.length < 8) {
            showMsg('Password must be at least 8 characters.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
            showMsg('Please enter a valid email address.');
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method:      'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    name:     `${firstName} ${lastName}`.trim(),
                    email:    emailVal,
                    password: passVal,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // Laravel validation errors come back as data.errors object
                if (data.errors) {
                    const firstErr = Object.values(data.errors)[0];
                    showMsg(Array.isArray(firstErr) ? firstErr[0] : firstErr);
                } else {
                    showMsg(data.message || data.error || 'Registration failed.');
                }
                return;
            }

            showMsg('Account created! Redirecting to sign in...', false);
            setTimeout(() => { window.location.href = 'signin.html'; }, 1500);

        } catch (err) {
            showMsg('Network error. Please try again.');
        }
    });
});
