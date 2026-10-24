document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (isAuthenticated()) {
        const user = getUser();
        if (user.role === 'ADMIN') {
            window.location.href = '/templates/dashboard.html';
        } else {
            window.location.href = '/templates/index.html';
        }
        return;
    }
    
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', function() {
            window.location.href = '/templates/forgot-password.html';
        });
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';
    
    try {
        const data = await login(email, password);
        
        showSuccess('Login successful!');
        
        // Redirect based on role
        setTimeout(() => {
            if (data.user.role === 'ADMIN') {
                window.location.href = '/templates/dashboard.html';
            } else {
                window.location.href = '/templates/index.html';
            }
        }, 500);
        
    } catch (error) {
        showError(error.message || 'Login failed. Please check your credentials.');
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Log In';
    }
}