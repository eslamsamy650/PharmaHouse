// Load API utility first
const script = document.createElement('script');
script.src = './assets/js/api.js';
document.head.appendChild(script);

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotForm = document.getElementById('forgot-password-form');
const notification = document.getElementById('notification');

document.addEventListener('DOMContentLoaded', () => {
  createParticles();
});

function createParticles() {
  const particlesContainer = document.querySelector('.molecular-particles');
  if (!particlesContainer) return;
  
  const particleCount = 12;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    const size = Math.random() * 12 + 5;
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    const duration = Math.random() * 20 + 15;
    const delay = Math.random() * 10;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.opacity = Math.random() * 0.5 + 0.3;
    
    particlesContainer.appendChild(particle);
  }
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  if (!notification) return;
  
  const icon = notification.querySelector('i');
  const messageEl = notification.querySelector('.notification-message');
  
  messageEl.textContent = message;
  notification.className = `notification ${type}`;
  icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.remove('active');
    t.classList.add('animate__animated', 'animate__fadeIn');
  });
  
  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  forgotForm.classList.add('hidden');

  if (tab === 'login') {
    document.querySelector('.auth-tab:nth-child(1)').classList.add('active');
    loginForm.classList.remove('hidden');
    loginForm.classList.add('animate__animated', 'animate__fadeIn');
  } else if (tab === 'register') {
    document.querySelector('.auth-tab:nth-child(2)').classList.add('active');
    registerForm.classList.remove('hidden');
    registerForm.classList.add('animate__animated', 'animate__fadeIn');
  }
  
  setTimeout(() => {
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.remove('animate__animated', 'animate__fadeIn');
    });
  }, 500);
}

function showForgotPassword() {
  loginForm.classList.add('hidden');
  forgotForm.classList.remove('hidden');
  forgotForm.classList.add('animate__animated', 'animate__fadeIn');
}

function animateButton(btn) {
  const btnText = btn.querySelector('.btn-text');
  const btnIcon = btn.querySelector('.btn-icon');
  
  if (btnText) btnText.style.display = 'inline-block';
  if (btnIcon) btnIcon.style.display = 'none';
  
  btn.disabled = true;
  btn.style.opacity = '0.8';
  
  setTimeout(() => {
    if (btnText) btnText.style.display = 'none';
    if (btnIcon) btnIcon.style.display = 'inline-block';
    btn.classList.add('animate__animated', 'animate__pulse');
  }, 100);
}

function resetButton(btn) {
  const btnText = btn.querySelector('.btn-text');
  const btnIcon = btn.querySelector('.btn-icon');
  
  btn.disabled = false;
  btn.style.opacity = '1';
  if (btnText) btnText.style.display = 'inline-block';
  if (btnIcon) btnIcon.style.display = 'none';
  btn.classList.remove('animate__animated', 'animate__pulse');
}

async function login() {
  const btn = event.target;
  animateButton(btn);

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  
  if (!email || !password) {
    showNotification('Please fill in all fields', 'error');
    resetButton(btn);
    return;
  }

  try {
    // Wait for API to be available
    if (typeof authAPI === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const result = await authAPI.login(email, password);
    showNotification('Login successful!');
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  } catch (error) {
    showNotification(error.message || 'Login failed. Please check your credentials.', 'error');
    loginForm.classList.add('animate__animated', 'animate__shakeX');
    setTimeout(() => {
      loginForm.classList.remove('animate__animated', 'animate__shakeX');
      resetButton(btn);
    }, 600);
  }
}

async function register() {
  const btn = event.target;
  const startTime = performance.now();
  animateButton(btn);

  const name = document.getElementById('pharmacy-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value.trim();
  
  if (!name || !email || !password) {
    showNotification('Please fill in all fields', 'error');
    resetButton(btn);
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showNotification('Please enter a valid email', 'error');
    resetButton(btn);
    return;
  }

  if (password.length < 6) {
    showNotification('Password must be at least 6 characters', 'error');
    resetButton(btn);
    return;
  }

  try {
    // Wait for API to be available
    if (typeof authAPI === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const result = await authAPI.register(name, email, password, name, 'user');
    showNotification('Registration successful!');
    
    document.querySelector('.auth-container').classList.add('animate__animated', 'animate__pulse');
    setTimeout(() => {
      document.querySelector('.auth-container').classList.remove('animate__animated', 'animate__pulse');
      document.getElementById('pharmacy-name').value = '';
      document.getElementById('register-email').value = '';
      document.getElementById('register-password').value = '';
      resetButton(btn);
      switchTab('login');
    }, 800);
    
  } catch (error) {
    showNotification(error.message || 'Registration failed. Please try again.', 'error');
    resetButton(btn);
  }
}

function resetPassword() {
  const btn = event.target;
  animateButton(btn);
  
  const email = document.getElementById('reset-email').value.trim();
  
  if (!email) {
    showNotification('Please enter your email', 'error');
    resetButton(btn);
    return;
  }

  showNotification('Password reset link sent to your email');
  
  forgotForm.classList.add('animate__animated', 'animate__fadeOut');
  setTimeout(() => {
    document.getElementById('reset-email').value = '';
    switchTab('login');
    forgotForm.classList.remove('animate__animated', 'animate__fadeOut');
    resetButton(btn);
  }, 600);
}
