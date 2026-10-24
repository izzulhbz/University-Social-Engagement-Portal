const API_BASE_URL = 'http://localhost:8000';

// Token management
function getToken() {
    return localStorage.getItem('access_token');
}

function setToken(token) {
    localStorage.setItem('access_token', token);
}

function removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function isAuthenticated() {
    return !!getToken();
}

// API Request wrapper
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            removeToken();
            window.location.href = '/templates/login.html';
            throw new Error('Unauthorized');
        }
        
        // Parse JSON response
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API calls
async function login(email, password) {
    const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    
    setToken(data.access_token);
    setUser(data.user);
    return data;
}

async function logout() {
    removeToken();
    window.location.href = '/templates/login.html';
}

async function getCurrentUser() {
    return await apiRequest('/api/auth/me');
}

// Check auth on page load
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/templates/login.html';
        return false;
    }
    return true;
}

// Display user info in navbar
function displayUserInfo() {
    const user = getUser();
    if (user) {
        const nameElements = document.querySelectorAll('.user-name');
        nameElements.forEach(el => {
            el.textContent = user.name;
        });
        
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(el => {
            if (user.image_url) {
                el.src = user.image_url;
            }
        });
    }
}

// Show error message
function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0 position-fixed top-0 end-0 m-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    setTimeout(() => toast.remove(), 5000);
}

// Show success message
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    setTimeout(() => toast.remove(), 3000);
}

// Format timestamp - handles both seconds and milliseconds
function formatTimestamp(timestamp) {
    // Convert to milliseconds if needed 
    const msTimestamp = timestamp > 10000000000 ? timestamp : timestamp * 1000;
    
    const date = new Date(msTimestamp);
    const now = new Date();
    const diff = now - date;
    
    // Handle invalid dates
    if (isNaN(date.getTime())) {
        return 'Unknown';
    }
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    
    // For older dates, show actual date
    return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}