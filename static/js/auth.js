// === Google Sign-In Handler ===
// === Google Sign-In Handler ===
function handleGoogleSignIn(response) {
  fetch('/login/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token: response.credential })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        window.location.href = '/';
      } else {
        alert('Login failed: ' + data.error);
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      alert('Login failed. Try again.');
    });
}

// === Show/Hide Logout Button ===
function showLogout() {
  const container = document.getElementById('logout-container');
  if (container) container.style.display = 'block';
}

function hideLogout() {
  const container = document.getElementById('logout-container');
  if (container) container.style.display = 'none';
}

// === Show Greeting Based on Settings Name ===
function fetchAndDisplayGreeting() {
  fetch('/api/settings', { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
      const name = data?.settings?.display_name;
      const greetingEl = document.getElementById('greeting-message');
      if (name && greetingEl) {
        greetingEl.textContent = ` Hello, ${name}!`;
      }
    })
    .catch(() => {
      console.log('⚠️ Could not load user greeting.');
    });
}

// === Check Login Status ===
function checkAuthStatus() {
  console.log("🔍 Checking login status...");

  fetch('/api/user', { credentials: 'include' })
    .then(async response => {
      const contentType = response.headers.get('Content-Type');

      if (!response.ok || !contentType || !contentType.includes('application/json')) {
        console.log("❌ Not logged in (response not JSON or not 200)");
        hideLogout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        console.log("✅ Logged in as:", data.user.name);
        showLogout();
        fetchAndDisplayGreeting();
      }
    })
    .catch(err => {
      console.log("❌ Error checking login:", err);
      hideLogout();
    });
}

// === Logout Handler ===
function logout() {
  fetch('/logout', {
    method: 'POST',
    credentials: 'include'
  })
    .then(() => window.location.href = '/')
    .catch(error => console.error('Logout error:', error));
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  hideLogout(); // Ensure it starts hidden

  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  checkAuthStatus();
});
