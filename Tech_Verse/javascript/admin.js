// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('auth-status');
  const adminContent = document.getElementById('admin-content');

  // Helper function to get API base
  function getApiBase() {
    try {
      const meta = document.querySelector('meta[name="tv-api-base"]');
      const metaVal = meta && meta.content ? meta.content.trim() : '';
      const override = (window.TV_API_BASE || window.__TV_API_BASE__ || metaVal || '').trim();
      if(override) return override.replace(/\/+$/, '');
    } catch(e) {}
    return '';
  }

  // Helper function to get current user (check both localStorage and API)
  async function getCurrentUser() {
    // First check localStorage - trust it if present
    if (window.TechVerseAuth && typeof window.TechVerseAuth.getCurrentUser === 'function') {
      const user = window.TechVerseAuth.getCurrentUser();
      if (user && (user.id || user._id || user.email || user.username)) {
        return user;
      }
    }
    
    // If not in localStorage, check API
    const apiBase = getApiBase();
    if (apiBase) {
      try {
        const resp = await fetch(`${apiBase}/api/user`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.user) {
            // Save to localStorage for future use
            localStorage.setItem('techverse_auth_user', JSON.stringify(data.user));
            return data.user;
          }
        }
        // If API returns 401, user is not authenticated
        if (resp.status === 401) {
          return null;
        }
      } catch (e) {
        // Network error - if no localStorage user, return null
        return null;
      }
    }
    
    return null;
  }

  // Check if user is authenticated and is admin
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    authStatus.textContent = 'You must be signed in to access the admin dashboard. Redirecting to sign in...';
    authStatus.style.color = '#d00';
    setTimeout(() => {
      window.location.href = 'signin.html';
    }, 1500);
    return;
  }

  if (currentUser.role !== 'admin') {
    authStatus.textContent = 'Access denied. Admin privileges required. Redirecting...';
    authStatus.style.color = '#d00';
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return;
  }

  // User is authenticated and is admin
  authStatus.style.display = 'none';
  adminContent.style.display = 'block';

  // Add any additional admin-specific functionality here
});
