let currentDeleteUserId = null;
let currentEditUser = null;

// Initialize admin users page
async function initAdminUsers() {
    if (!requireAuth()) return;
    
    const user = getUser();
    if (user.role !== 'ADMIN') {
        showError('Access denied. Admin only.');
        setTimeout(() => window.location.href = '/templates/index.html', 2000);
        return;
    }
    
    await loadUsers();
    setupEventHandlers();
}

// Setup event handlers
function setupEventHandlers() {
    document.getElementById('searchBtn').addEventListener('click', searchUsers);
    document.getElementById('searchUser').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchUsers();
    });
}

// Load all users
async function loadUsers() {
    try {
        const users = await apiRequest('/api/users?limit=1000');
        renderUsers(users);
    } catch (error) {
        showError('Failed to load users');
        console.error(error);
    }
}

// Search users
async function searchUsers() {
    const query = document.getElementById('searchUser').value.trim();
    if (!query) {
        await loadUsers();
        return;
    }
    
    try {
        // Use admin endpoint that doesn't filter admins
        const users = await apiRequest('/api/users?limit=1000');
        const filtered = users.filter(u => 
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase()) ||
            u.role.toLowerCase().includes(query.toLowerCase())
        );
        renderUsers(filtered);
    } catch (error) {
        showError('Search failed');
        console.error(error);
    }
}

// Render users table
function renderUsers(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No users found</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${user.role}</span></td>
            <td><span class="badge bg-${user.last_login_at ? 'success' : 'secondary'}">${user.last_login_at ? 'Active' : 'Inactive'}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditUserModal(${user.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="openDeleteModal(${user.id}, '${escapeHtml(user.name)}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get badge color for role
function getRoleBadgeColor(role) {
    switch(role) {
        case 'ADMIN': return 'danger';
        case 'FACULTY': return 'primary';
        case 'STUDENT': return 'info';
        default: return 'secondary';
    }
}

// Toggle role-specific fields
function toggleRoleFields(prefix) {
    const role = document.getElementById(`${prefix}-role`).value;
    
    document.getElementById(`${prefix}-course-field`).style.display = role === 'STUDENT' ? 'block' : 'none';
    document.getElementById(`${prefix}-position-field`).style.display = role === 'FACULTY' ? 'block' : 'none';
    document.getElementById(`${prefix}-job-field`).style.display = role === 'ADMIN' ? 'block' : 'none';
}

// Create user
async function createUser() {
    const email = document.getElementById('create-email').value.trim();
    const name = document.getElementById('create-name').value.trim();
    const password = document.getElementById('create-password').value;
    const role = document.getElementById('create-role').value;
    
    if (!email || !name || !password) {
        showError('Please fill all required fields');
        return;
    }
    
    const userData = { email, name, password, role };
    
    if (role === 'STUDENT') {
        const course = document.getElementById('create-course').value.trim();
        if (!course) {
            showError('Course is required for students');
            return;
        }
        userData.course = course;
    } else if (role === 'FACULTY') {
        const position = document.getElementById('create-position').value.trim();
        if (!position) {
            showError('Academic position is required for faculty');
            return;
        }
        userData.academic_position = position;
    } else if (role === 'ADMIN') {
        userData.job_title = document.getElementById('create-job').value.trim() || null;
    }
    
    const btn = document.getElementById('createUserSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
    
    try {
        await apiRequest('/api/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        showSuccess('User created successfully!');
        bootstrap.Modal.getInstance(document.getElementById('createUserModal')).hide();
        
        // Clear form
        document.getElementById('create-email').value = '';
        document.getElementById('create-name').value = '';
        document.getElementById('create-password').value = '';
        document.getElementById('create-course').value = '';
        document.getElementById('create-position').value = '';
        document.getElementById('create-job').value = '';
        
        await loadUsers();
        
    } catch (error) {
        showError(error.message || 'Failed to create user');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create User';
    }
}

// Open edit user modal
async function openEditUserModal(userId) {
    try {
        const user = await apiRequest(`/api/users/${userId}`);
        currentEditUser = user;
        
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-bio').value = user.bio || '';
        
        // Show/hide role-specific fields
        document.getElementById('edit-course-field').style.display = user.role === 'STUDENT' ? 'block' : 'none';
        document.getElementById('edit-position-field').style.display = user.role === 'FACULTY' ? 'block' : 'none';
        document.getElementById('edit-job-field').style.display = user.role === 'ADMIN' ? 'block' : 'none';
        
        if (user.role === 'STUDENT') {
            document.getElementById('edit-course').value = user.course || '';
        } else if (user.role === 'FACULTY') {
            document.getElementById('edit-position').value = user.academic_position || '';
        } else if (user.role === 'ADMIN') {
            document.getElementById('edit-job').value = user.job_title || '';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();
        
    } catch (error) {
        showError('Failed to load user details');
        console.error(error);
    }
}

// Save user edit
async function saveUserEdit() {
    const userId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    
    const updateData = { name, bio };
    
    if (currentEditUser.role === 'STUDENT') {
        updateData.course = document.getElementById('edit-course').value.trim();
    } else if (currentEditUser.role === 'FACULTY') {
        updateData.academic_position = document.getElementById('edit-position').value.trim();
    } else if (currentEditUser.role === 'ADMIN') {
        updateData.job_title = document.getElementById('edit-job').value.trim() || null;
    }
    
    try {
        await apiRequest(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        showSuccess('User updated successfully!');
        bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
        await loadUsers();
        
    } catch (error) {
        showError(error.message || 'Failed to update user');
    }
}

// Open delete modal
function openDeleteModal(userId, userName) {
    currentDeleteUserId = userId;
    document.getElementById('deleteUserName').textContent = userName;
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
}

// Confirm delete
async function confirmDelete() {
    if (!currentDeleteUserId) return;
    
    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true;
    
    try {
        await apiRequest(`/api/users/${currentDeleteUserId}`, {
            method: 'DELETE'
        });
        
        showSuccess('User deleted successfully');
        bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
        await loadUsers();
        
    } catch (error) {
        showError(error.message || 'Failed to delete user');
    } finally {
        btn.disabled = false;
        currentDeleteUserId = null;
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.initAdminUsers = initAdminUsers;
    window.toggleRoleFields = toggleRoleFields;
    window.createUser = createUser;
    window.openEditUserModal = openEditUserModal;
    window.saveUserEdit = saveUserEdit;
    window.openDeleteModal = openDeleteModal;
    window.confirmDelete = confirmDelete;
}