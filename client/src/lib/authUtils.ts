export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export async function logout() {
  try {
    // Call the logout API
    await fetch('/api/auth/logout', {
      method: 'GET',
      credentials: 'include'
    });
    
    // Clear language modal session storage for next login
    sessionStorage.removeItem('languageModalShown');
    
    // Redirect to home page
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    // Even if API fails, clear session storage and redirect
    sessionStorage.removeItem('languageModalShown');
    window.location.href = '/';
  }
}