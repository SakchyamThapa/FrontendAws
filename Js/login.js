import { storeToken } from './sessionStorage.js';
document.addEventListener('DOMContentLoaded', function () {
  const loginPage = document.getElementById('loginPage');
  const registerPage = document.getElementById('registerPage');
  const toRegister = document.getElementById('toRegister');
  const toLogin = document.getElementById('toLogin');
  const messageBox = document.getElementById('messageBox');
  const currentProjectId = new URLSearchParams(window.location.search).get("projectId");

document.querySelectorAll(".nav-link").forEach(link => {
  if (currentProjectId && !link.href.includes("projectId")) {
    const href = new URL(link.href);
    href.searchParams.set("projectId", currentProjectId);
    link.href = href.toString();
  }
});


  // 🔁 Switch between login and register UI
  toRegister?.addEventListener('click', function (e) {
    e.preventDefault();
    loginPage.classList.remove('active');
    setTimeout(() => registerPage.classList.add('active'), 50);
  });

  toLogin?.addEventListener('click', function (e) {
    e.preventDefault();
    registerPage.classList.remove('active');
    setTimeout(() => loginPage.classList.add('active'), 50);
  });

  // ✅ Show temporary message
  function showMessage(message, type) {
    messageBox.innerHTML = `<div class="${type}">${message}</div>`;
    messageBox.style.display = 'block';
    setTimeout(() => (messageBox.style.display = 'none'), 5000);
  }

  // ✅ Email validation
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ✅ Password strength checker
  function checkPasswordStrength(password) {
    const bar = document.getElementById('passwordStrength');
    const text = document.getElementById('strengthText');
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[@$!%*?&]/.test(password)) strength += 12.5;

    bar.style.width = `${strength}%`;

    if (strength < 50) {
      bar.style.background = '#e74c3c';
      text.textContent = 'Weak';
      text.style.color = '#e74c3c';
      return false;
    } else if (strength < 75) {
      bar.style.background = '#f39c12';
      text.textContent = 'Moderate';
      text.style.color = '#f39c12';
      return false;
    } else {
      bar.style.background = '#27ae60';
      text.textContent = 'Strong';
      text.style.color = '#27ae60';
      return true;
    }
  }

  // ✅ Reset error states
  function resetErrors(formId) {
    document.querySelectorAll(`#${formId} .input-error`).forEach(e => {
      e.style.display = 'none';
      e.textContent = '';
    });
    document.querySelectorAll(`#${formId} input`).forEach(i => i.classList.remove('error'));
  }

  function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input.classList.add('error');
    error.textContent = message;
    error.style.display = 'block';
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 800);
  }

  document.getElementById('password')?.addEventListener('input', function () {
    checkPasswordStrength(this.value);
  });

  // ✅ LOGIN FUNCTIONALITY
  document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    resetErrors('loginForm');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email) return showError('loginEmail', 'loginEmailError', 'Email is required');
    if (!validateEmail(email)) return showError('loginEmail', 'loginEmailError', 'Invalid email');
    if (!password) return showError('loginPassword', 'loginPasswordError', 'Password is required');

    try {
      const res = await fetch('https://localhost:7150/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return showMessage('Invalid response from server', 'error');
      }

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        storeToken(data.token);
        showMessage(data.message || 'Login successful!', 'success');
        setTimeout(() => {
          location.assign("/Html/Home.html"); // 👈 change this to your dashboard/home page
        }, 300);
      } else {
        if (data.message?.includes('Invalid Email')) showError('loginEmail', 'loginEmailError', 'Email not found');
        else if (data.message?.includes('Invalid Password')) showError('loginPassword', 'loginPasswordError', 'Incorrect password');
        else showMessage(data.message || 'Login failed', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      showMessage('Check your connection and try again.', 'error');
    }
  });

  // ✅ REGISTRATION FUNCTIONALITY
  document.getElementById('registerForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    resetErrors('registerForm');

    const username = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    let isValid = true;

    if (!username || username.length < 3) {
      isValid = false;
      showError('fullName', 'fullNameError', 'Full name is required and must be at least 3 characters');
    }
    if (!email || !validateEmail(email)) {
      isValid = false;
      showError('email', 'emailError', 'Valid email is required');
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      isValid = false;
      showError('password', 'passwordError', 'Password must be strong (8+ characters, upper/lowercase, number, symbol)');
    }

    if (!confirmPassword || confirmPassword !== password) {
      isValid = false;
      showError('confirmPassword', 'confirmPasswordError', 'Passwords do not match');
    }

    if (!isValid) return;

    try {
      const res = await fetch('https://localhost:7150/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return showMessage('Invalid response from server', 'error');
      }

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage(data.message || 'Registration successful!', 'success');
        document.getElementById('registerForm').reset();
        document.getElementById('passwordStrength').style.width = '0%';
        document.getElementById('strengthText').textContent = '';

        setTimeout(() => {
          registerPage.classList.remove('active');
          setTimeout(() => loginPage.classList.add('active'), 50);
        }, 1500);
      } else {
        if (data.message?.includes('email already exists')) {
          showError('email', 'emailError', 'This email is already registered');
        } else {
          showMessage(data.message || 'Registration failed. Try again.', 'error');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      showMessage('Check your connection and try again.', 'error');
    }
  });

  // Real-time email & confirm password validation
  document.querySelectorAll('input[type="email"]').forEach(field =>
    field.addEventListener('blur', function () {
      if (this.value && !validateEmail(this.value)) {
        showError(this.id, this.id === 'loginEmail' ? 'loginEmailError' : 'emailError', 'Please enter a valid email');
      }
    })
  );

  document.getElementById('confirmPassword')?.addEventListener('input', function () {
    const pass = document.getElementById('password').value;
    if (this.value && this.value !== pass) {
      showError('confirmPassword', 'confirmPasswordError', 'Passwords do not match');
    } else {
      this.classList.remove('error');
      document.getElementById('confirmPasswordError').style.display = 'none';
    }
  });
});
