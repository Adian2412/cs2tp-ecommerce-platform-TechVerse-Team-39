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

// Try to attach event listener immediately, or wait for DOM ready
function initRegisterForm() {
  const form = document.getElementById('register-form');

  if (!form) {
    console.error('Register form not found!');
    return;
  }

  // Get form elements
  const first = document.getElementById('reg-first');
  const last = document.getElementById('reg-last');
  const email = document.getElementById('reg-email');
  const password = document.getElementById('reg-password');
  const role = document.getElementById('reg-role');
  const adminCode = document.getElementById('reg-admin-code');
  const msg = document.getElementById('register-msg');

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

  console.log('Form elements found:', {
    first: !!first,
    last: !!last,
    email: !!email,
    password: !!password,
    role: !!role,
    msg: !!msg
  });


  // PASSWORD STRENGTH METER
  const pw = document.getElementById('reg-password');
  const text = document.getElementById('pw-strength-text');
  const bar  = document.getElementById('pw-strength-bar');

  // Initialize password strength display
  if (text && bar) {
    text.textContent = "";
    bar.style.width = "0";
    bar.style.background = "red";
  }

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
    updateButtonState();
  });

  // FORM VALIDATION AND BUTTON STATE MANAGEMENT
  const submitBtn = form.querySelector('button[type="submit"]');
  const captchaBox = document.getElementById('captcha-box');

  // Function to validate individual fields
  function validateField(field, fieldName) {
    const value = field.value.trim();
    let isValid = true;
    let errorMsg = '';

    switch(fieldName) {
      case 'first':
      case 'last':
        if (!value) {
          isValid = false;
          errorMsg = `${fieldName === 'first' ? 'First' : 'Last'} name is required`;
        } else if (value.length < 2) {
          isValid = false;
          errorMsg = `${fieldName === 'first' ? 'First' : 'Last'} name must be at least 2 characters`;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          isValid = false;
          errorMsg = 'Email is required';
        } else if (!emailRegex.test(value)) {
          isValid = false;
          errorMsg = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (!value) {
          isValid = false;
          errorMsg = 'Password is required';
        } else if (value.length < 8) {
          isValid = false;
          errorMsg = 'Password must be at least 8 characters';
        }
        break;
    }

    // Update field styling
    field.style.borderColor = isValid ? '#ccc' : '#d00';
    return { isValid, errorMsg };
  }

  // Function to validate all fields
  function validateAllFields() {
    const validations = [
      validateField(first, 'first'),
      validateField(last, 'last'),
      validateField(email, 'email'),
      validateField(password, 'password')
    ];

    const allValid = validations.every(v => v.isValid) && captchaBox.checked;
    const firstError = validations.find(v => !v.isValid);

    return {
      allValid,
      errorMsg: firstError ? firstError.errorMsg : (captchaBox.checked ? '' : 'Please complete the CAPTCHA')
    };
  }

  // Function to update button state
  function updateButtonState() {
    const validation = validateAllFields();
    const isEnabled = validation.allValid;

    if (submitBtn) {
      submitBtn.disabled = !isEnabled;
      submitBtn.style.opacity = isEnabled ? '1' : '0.5';
      submitBtn.style.cursor = isEnabled ? 'pointer' : 'not-allowed';
      submitBtn.style.background = isEnabled ? '#156082' : '#c1e5f5';
      submitBtn.style.color = isEnabled ? '#fff' : '#999';
    }
  }

  // Add input event listeners for real-time validation
  [first, last, email, password].forEach(field => {
    field.addEventListener('input', updateButtonState);
    field.addEventListener('blur', updateButtonState);
  });

  // Add change event listener for CAPTCHA
  if (captchaBox) {
    captchaBox.addEventListener('change', updateButtonState);
  }

  // Initialize button state
  updateButtonState();

 
  console.log('Adding submit event listener to form');
  form.addEventListener('submit', handleFormSubmit);

  // Also add direct button click handler as fallback
  // submitBtn is already declared above
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      console.log('Button clicked directly');
      // Let the form submit event handle it
    });
  }

  async function handleFormSubmit(e) {
    console.log('Form submit event triggered');
    e.preventDefault();
    e.stopPropagation();
    console.log('Prevented default form submission');

    // Validate all fields before submission
    const validation = validateAllFields();
    if (!validation.allValid) {
      console.log('Form validation failed:', validation.errorMsg);
      msg.textContent = validation.errorMsg;
      msg.style.color = '#d00';
      return;
    }
    console.log('Form validation passed');

    msg.textContent = '';
    msg.style.color = '#000';
    const fullName = (first.value.trim() + ' ' + last.value.trim()).trim();

    // Attempt real server registration
    try{
      const payload = {
        username: fullName || email.value.trim(),
        email: email.value.trim(),
        password: password.value,
        role: (role && role.value) ? role.value : 'customer'
      };
      if(adminCode && adminCode.value.trim()) payload.admin_code = adminCode.value.trim();

      const resp = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: API_BASE ? 'include' : 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(()=>({}));
      if(!resp.ok){
        msg.style.color = '#d00';
        msg.textContent = data.error || 'Registration failed';
        return;
      }

      if(data && data.user){
        localStorage.setItem('techverse_auth_user', JSON.stringify(data.user));
      }

      msg.style.color = '#0a0';
      msg.textContent = 'Registration successful! Redirecting...';

      // Reset form
      first.value = '';
      last.value = '';
      email.value = '';
      password.value = '';
      if (adminCode) adminCode.value = '';
      pw.textContent = '';
      bar.style.width = '0';

      // Redirect after delay
      setTimeout(() => location.href = 'account.html', 800);
    }catch(err){
      msg.style.color = '#d00';
      msg.textContent = 'Network error. Please try again.';
    }
  }
}

// Initialize the form
initRegisterForm();