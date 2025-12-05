// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
  const authStatus = document.getElementById('auth-status');
  const adminContent = document.getElementById('admin-content');

  // Check if user is authenticated and is admin
  const currentUser = window.TechVerseAuth ? window.TechVerseAuth.getCurrentUser() : null;

  if (!currentUser) {
    authStatus.textContent = 'Please sign in to access the admin dashboard.';
    authStatus.style.color = '#d00';
    return;
  }

  if (currentUser.role !== 'admin') {
    authStatus.textContent = 'Access denied. Admin privileges required.';
    authStatus.style.color = '#d00';
    return;
  }

  // User is authenticated and is admin
  authStatus.style.display = 'none';
  adminContent.style.display = 'block';

  // Add any additional admin-specific functionality here
  console.log('Admin dashboard loaded for user:', currentUser.username);
});
