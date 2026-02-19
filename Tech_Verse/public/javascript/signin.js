

document.addEventListener('DOMContentLoaded', () => {
    const form    = document.getElementById('login-form');
    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    const msgEl   = document.getElementById('login-msg');

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    function showMsg(text, isError = true) {
        msgEl.textContent = text;
        msgEl.style.color = isError ? '#d00' : 'green';
    }

    // ── Step 1: Password login ────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMsg('');

        try {
            const res = await fetch('/api/auth/login', {
                method:      'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    email:    emailEl.value.trim(),
                    password: passEl.value,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                showMsg(data.message || data.error || 'Login failed.');
                return;
            }

            if (data.mfa_required) {
                showOtpStep(data.message);
            } else {
                window.location.href = 'account.html';
            }

        } catch (err) {
            showMsg('Network error. Please try again.');
        }
    });

    // ── Step 2: OTP entry ─────────────────────────────────────────────────────
    function showOtpStep(infoMessage) {
        form.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'wrapper';

        const heading = document.createElement('h1');
        heading.textContent = 'Verify your identity';
        wrapper.appendChild(heading);

        const info = document.createElement('p');
        info.style.cssText = 'text-align:center;margin-bottom:16px';
        info.textContent = infoMessage;
        wrapper.appendChild(info);

        const inputBox = document.createElement('div');
        inputBox.className = 'input_box';

        const otpInput = document.createElement('input');
        otpInput.type         = 'text';
        otpInput.inputMode    = 'numeric';
        otpInput.maxLength    = 6;
        otpInput.placeholder  = '6-digit code';
        otpInput.autocomplete = 'one-time-code';
        inputBox.appendChild(otpInput);
        wrapper.appendChild(inputBox);

        const otpMsg = document.createElement('div');
        otpMsg.style.cssText = 'margin-top:8px;color:#d00;text-align:center';
        wrapper.appendChild(otpMsg);

        const submitBtn = document.createElement('button');
        submitBtn.type      = 'button';
        submitBtn.className = 'button';
        submitBtn.textContent = 'Verify';
        submitBtn.style.marginTop = '16px';
        wrapper.appendChild(submitBtn);

        form.parentNode.insertBefore(wrapper, form.nextSibling);
        otpInput.focus();

        submitBtn.addEventListener('click', () => submitOtp(otpInput, otpMsg, submitBtn));
        otpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitOtp(otpInput, otpMsg, submitBtn);
        });
    }

    async function submitOtp(otpInput, otpMsg, submitBtn) {
        otpMsg.textContent = '';
        const otp = otpInput.value.trim();

        if (!/^\d{6}$/.test(otp)) {
            otpMsg.textContent = 'Please enter the 6-digit code from your email.';
            return;
        }

        submitBtn.disabled    = true;
        submitBtn.textContent = 'Verifying...';

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method:      'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ otp }),
            });

            const data = await res.json();

            if (!res.ok) {
                otpMsg.textContent    = data.message || data.error || 'Invalid code.';
                submitBtn.disabled    = false;
                submitBtn.textContent = 'Verify';
                otpInput.value        = '';
                otpInput.focus();
                return;
            }

            window.location.href = 'account.html';

        } catch (err) {
            otpMsg.textContent    = 'Network error. Please try again.';
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Verify';
        }
    }
});
