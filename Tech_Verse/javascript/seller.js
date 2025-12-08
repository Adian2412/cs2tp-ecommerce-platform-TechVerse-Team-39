document.addEventListener('DOMContentLoaded', ()=>{
  // Prevent double initialization if the script is injected/loaded more than once
  if(window.__tv_seller_init_done) return; window.__tv_seller_init_done = true;
  
  const input = document.getElementById('item-images');
  const preview = document.getElementById('preview');
  const publish = document.getElementById('publish');
  const title = document.getElementById('item-title');
  const price = document.getElementById('item-price');
  const desc = document.getElementById('item-desc');
  const categoryInput = document.getElementById('item-category');
  const quantityInput = document.getElementById('item-quantity');
  const listingForm = document.getElementById('listing-form');
  const authStatus = document.getElementById('auth-status');
  const sellerContent = document.getElementById('seller-content');

  let selectedFiles = [];
  
  // Session token key for cross-origin authentication
  const SESSION_TOKEN_KEY = 'techverse_session_token';

  // Resolve the API base URL
  const getApiBase = () => {
    try{
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const metaVal = meta && meta.content ? meta.content.trim() : '';
      const override = (window.TV_API_BASE || window.__TV_API_BASE__ || metaVal || '').trim();
      if(override) return override.replace(/\/+$/, '');
    }catch(e){}
    // For production: if we're not on localhost, use same origin
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.origin;
    }
    return 'https://cs2team39.cs2410-web01pvm.aston.ac.uk';
  };
  
  // Get headers for authenticated requests
  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      headers['X-Session-Token'] = token;
    }
    return headers;
  };

  // Handle image preview
  if(input) {
    input.addEventListener('change', async (e)=>{
      preview.innerHTML='';
      selectedFiles = Array.from(e.target.files);
      for(const f of selectedFiles){
        const url = await fileToDataUrl(f);
        const img = document.createElement('img'); 
        img.src = url; 
        img.style.width='120px'; 
        img.style.height='120px'; 
        img.style.objectFit='cover'; 
        img.style.borderRadius='8px';
        preview.appendChild(img);
      }
    });
  }

  // Simple authentication check using localStorage
  // The actual product creation will verify with the server
  function checkAuth() {
    // Check localStorage for cached user
    try {
      const raw = localStorage.getItem('techverse_auth_user');
      if(raw) {
        const user = JSON.parse(raw);
        if(user && typeof user === 'object' && (user.id || user._id || user.email || user.username)) {
          // User appears to be logged in - show the form
          authStatus.style.display = 'none';
          sellerContent.style.display = 'block';
          return;
        }
      }
    } catch(e) {
      console.warn('Failed to parse auth user from localStorage:', e);
    }

    // No cached user - redirect to sign in
    authStatus.textContent = 'Please sign in to sell products.';
    authStatus.style.color = '#d00';
    setTimeout(() => {
      window.location.href = 'signin.html';
    }, 2000);
  }

  // Run auth check
  checkAuth();

  // Publish button handler
  if(publish) {
    publish.addEventListener('click', async ()=>{
      // Disable button during submission
      if(publish.disabled) return;
      publish.disabled = true;
      const originalText = publish.textContent;
      publish.textContent = 'Publishing...';

      try {
        // Validation
        if(!title.value.trim()){ 
          alert('Please enter a product title/name');
          publish.disabled = false;
          publish.textContent = originalText;
          return; 
        }

        const priceValue = parseFloat(price.value.trim());
        if(isNaN(priceValue) || priceValue < 0){
          alert('Please enter a valid price (0 or greater)');
          publish.disabled = false;
          publish.textContent = originalText;
          return;
        }

        // Validate quantity
        let qty = 1;
        if(quantityInput){ 
          qty = parseInt(quantityInput.value, 10);
          if(isNaN(qty) || qty < 0){ 
            alert('Quantity must be 0 or greater'); 
            publish.disabled = false;
            publish.textContent = originalText;
            return; 
          }
        }

        // Build product data matching API expectations
        const productData = {
          name: title.value.trim(),
          price: priceValue,
          description: desc.value.trim() || '',
          category: categoryInput ? categoryInput.value.trim() : '',
          quantity: qty,
          stock: qty
        };

        // Add images as base64 data URLs
        if(selectedFiles.length > 0){
          productData.images = [];
          for(const f of selectedFiles){
            try {
              const dataUrl = await fileToDataUrl(f);
              productData.images.push(dataUrl);
            } catch(e) {
              console.warn('Failed to convert file to data URL:', e);
            }
          }
        }

        const apiBase = getApiBase();
        
        // POST to backend API - server will verify authentication
        // Uses both session cookie (if available) and X-Session-Token header
        const resp = await fetch(`${apiBase}/api/products`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(productData),
          credentials: 'include'
        });

        const data = await resp.json();

        if(resp.ok){
          // Success
          const createdProduct = data.product || data;
          
          // IMPORTANT: Clear the customer browse cache so the new product shows up immediately
          try {
            localStorage.removeItem('techverse_listings_v1');
          } catch(e) {
            // Silent failure
          }
          
          alert('Product created successfully! Your listing is now live on the Browse page.');
          
          // Reset form
          title.value = '';
          price.value = '';
          desc.value = '';
          if(input) input.value = '';
          preview.innerHTML = '';
          selectedFiles = [];
          if(categoryInput) categoryInput.value = '';
          if(quantityInput) quantityInput.value = '1';
          
        } else if(resp.status === 401) {
          // Session expired
          localStorage.removeItem('techverse_auth_user');
          alert('Your session has expired. Please sign in again.');
          window.location.href = 'signin.html';
        } else {
          // Other error
          const errorMsg = data.error || data.message || 'Failed to create product';
          console.error('Product creation failed:', data);
          
          let errorDetails = errorMsg;
          if(data.errors) {
            const errorList = Object.entries(data.errors).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join('\n');
            errorDetails = errorMsg + '\n\nDetails:\n' + errorList;
          }
          alert('Error: ' + errorDetails);
        }
      } catch(e) {
        console.error('Network error creating product:', e);
        alert('Network error: ' + e.message + '\nPlease check your connection and try again.');
      } finally {
        // Re-enable button
        publish.disabled = false;
        publish.textContent = originalText;
      }
    });
  }

  // Prevent the native form submit
  if(listingForm){
    listingForm.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      publish.click();
    });
  }

  function fileToDataUrl(file){
    return new Promise((res,rej)=>{
      const r = new FileReader();
      r.onload = ()=>res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
});
