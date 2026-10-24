let currentConnectionId = null;

// Initialize friends module
async function initFriends() {
    if (!requireAuth()) return;
    
    displayUserInfo();
    await loadConnections();
    await loadPendingRequests();
}

// Load pending friend requests
async function loadPendingRequests() {
    try {
        const requests = await apiRequest('/api/connections/pending');
        renderRequests(requests);
    } catch (error) {
        showError('Failed to load friend requests');
        console.error(error);
    }
}

// Load connections
async function loadConnections() {
    try {
        const connections = await apiRequest('/api/connections');
        renderConnections(connections);
    } catch (error) {
        showError('Failed to load connections');
        console.error(error);
    }
}

// Render pending requests
function renderRequests(requests) {
    const container = document.getElementById('requests-list');
    const template = document.getElementById('request-item-template');
    
    if (!container || !template) return;
    
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="text-muted">No pending requests</p>';
        return;
    }
    
    requests.forEach(request => {
        const clone = template.content.cloneNode(true);
        
        // Requester info
        clone.querySelector('.request-avatar').src = request.requester_image_url || 'https://via.placeholder.com/64';
        clone.querySelector('.request-name').textContent = request.requester_name;
        clone.querySelector('.request-role').textContent = request.requester_role;
        
        // Make card clickable to view profile
        const clickableArea = clone.querySelector('.request-clickable');
        clickableArea.addEventListener('click', () => {
            viewUserProfile(request.requester_id);
        });
        
        // Accept button
        clone.querySelector('.btn-accept').addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card click
            await acceptRequest(request.id);
        });
        
        // Decline button
        clone.querySelector('.btn-decline').addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent card click
            await declineRequest(request.id);
        });
        
        container.appendChild(clone);
    });
}

// Render connections (friends)
function renderConnections(connections) {
    const container = document.getElementById('connections-list');
    const template = document.getElementById('connection-item-template');
    
    if (!container || !template) return;
    
    container.innerHTML = '';
    
    if (connections.length === 0) {
        container.innerHTML = '<p class="text-muted">No connections yet</p>';
        return;
    }
    
    const currentUser = getUser();
    
    connections.forEach(conn => {
        const clone = template.content.cloneNode(true);
        
        // Determine the other connection
        const friend = conn.requester_id === currentUser.id ? {
            name: conn.receiver_name,
            image_url: conn.receiver_image_url,
            role: conn.receiver_role,
            id: conn.receiver_id
        } : {
            name: conn.requester_name,
            image_url: conn.requester_image_url,
            role: conn.requester_role,
            id: conn.requester_id
        };
        
        // Friend info
        clone.querySelector('.connection-avatar').src = friend.image_url || 'https://via.placeholder.com/64';
        clone.querySelector('.connection-name').textContent = friend.name;
        clone.querySelector('.connection-role').textContent = friend.role;
        
        // Make card clickable to view profile
        const clickableArea = clone.querySelector('.connection-clickable');
        clickableArea.addEventListener('click', () => {
            viewUserProfile(friend.id);
        });
        
        // Delete button
        clone.querySelector('.btn-delete-connection').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click
            confirmDeleteConnection(conn.id);
        });
        
        container.appendChild(clone);
    });
}

// View user profile in modal
async function viewUserProfile(userId) {
    try {
        // Fetch user details
        const user = await apiRequest(`/api/users/${userId}`);
        
        // Populate modal
        document.getElementById('profile-modal-avatar').src = user.image_url || 'https://via.placeholder.com/120';
        document.getElementById('profile-modal-name').textContent = user.name;
        document.getElementById('profile-modal-email').textContent = user.email;
        document.getElementById('profile-modal-role').textContent = user.role;
        
        const detailsContainer = document.getElementById('profile-modal-details');
        detailsContainer.innerHTML = '';
        
        // Role-specific details
        if (user.role === 'student') {
            detailsContainer.innerHTML = `
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-mortarboard me-2"></i>Course</h6>
                    <p class="mb-0">${user.course || 'Not specified'}</p>
                </div>
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-person-lines-fill me-2"></i>Bio</h6>
                    <p class="mb-0">${user.bio || 'No bio available'}</p>
                </div>
            `;
        } else if (user.role === 'faculty') {
            detailsContainer.innerHTML = `
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-briefcase me-2"></i>Academic Position</h6>
                    <p class="mb-0">${user.academic_position || 'Not specified'}</p>
                </div>
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-person-lines-fill me-2"></i>Bio</h6>
                    <p class="mb-0">${user.bio || 'No bio available'}</p>
                </div>
            `;
        } else {
            detailsContainer.innerHTML = `
                <div class="mb-3">
                    <h6 class="text-muted mb-2"><i class="bi bi-person-lines-fill me-2"></i>Bio</h6>
                    <p class="mb-0">${user.bio || 'No bio available'}</p>
                </div>
            `;
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
        modal.show();
        
    } catch (error) {
        showError('Failed to load user profile');
        console.error(error);
    }
}

// Accept friend request
async function acceptRequest(connectionId) {
    try {
        await apiRequest(`/api/connections/${connectionId}/accept`, {
            method: 'POST'
        });
        
        showSuccess('Friend request accepted!');
        await loadPendingRequests();
        await loadConnections();
        
    } catch (error) {
        showError(error.message || 'Failed to accept request');
    }
}

// Decline friend request
async function declineRequest(connectionId) {
    try {
        await apiRequest(`/api/connections/${connectionId}/reject`, {
            method: 'POST'
        });
        
        showSuccess('Friend request declined');
        await loadPendingRequests();
        
    } catch (error) {
        showError(error.message || 'Failed to decline request');
    }
}

// Confirm delete connection
function confirmDeleteConnection(connectionId) {
    currentConnectionId = connectionId;
    const modal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
    modal.show();
}

// Delete connection
async function deleteConnection() {
    if (!currentConnectionId) return;
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    confirmBtn.disabled = true;
    
    try {
        await apiRequest(`/api/connections/${currentConnectionId}`, {
            method: 'DELETE'
        });
        
        showSuccess('Connection removed');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
        
        await loadConnections();
        
    } catch (error) {
        showError(error.message || 'Failed to remove connection');
    } finally {
        confirmBtn.disabled = false;
        currentConnectionId = null;
    }
}

// Setup delete confirmation handler
document.addEventListener('DOMContentLoaded', function() {
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deleteConnection);
    }
});

// Initialize on page load
if (typeof window !== 'undefined') {
    window.initFriends = initFriends;
}