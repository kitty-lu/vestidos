document.addEventListener('DOMContentLoaded', function() {
  // Password validation for register form
  const registerForm = document.querySelector('#register form');
  if (registerForm) {
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const mismatchMessage = document.querySelector('.password-mismatch');
    
    function validatePassword() {
      if (passwordInput.value !== confirmPasswordInput.value) {
        mismatchMessage.style.display = 'block';
        confirmPasswordInput.classList.add('is-invalid');
        return false;
      } else {
        mismatchMessage.style.display = 'none';
        confirmPasswordInput.classList.remove('is-invalid');
        return true;
      }
    }
    
    passwordInput.addEventListener('input', validatePassword);
    confirmPasswordInput.addEventListener('input', validatePassword);
    
    registerForm.addEventListener('submit', function(e) {
      if (!validatePassword()) {
        e.preventDefault();
      }
    });
  }
  
  // Toggle password visibility
  function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentNode.querySelector('.eye-icon');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  }
  
  // Tab functionality
  const tabButtons = document.querySelectorAll('.auth-tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Hide all tab panes
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active', 'show');
      });
      
      // Show selected tab pane
      const targetPane = document.querySelector(this.getAttribute('data-bs-target'));
      targetPane.classList.add('active', 'show');
    });
  });
  
  // Close alert messages
  const alertCloseButtons = document.querySelectorAll('.alert-close');
  alertCloseButtons.forEach(button => {
    button.addEventListener('click', function() {
      this.parentElement.style.display = 'none';
    });
  });
  
  // Add floating animation delay to decorative elements
  const floatingElements = document.querySelectorAll('.decorative-circle');
  floatingElements.forEach((element, index) => {
    element.style.animationDelay = `${index * -1.5}s`;
  });
});