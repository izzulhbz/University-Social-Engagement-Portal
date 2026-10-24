// Initialize search module
async function initSearch() {
    if (!requireAuth()) return;
    
    displayUserInfo();
    
    // Get search query from URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
        await performSearch(query);
    }
}

// Perform search
async function performSearch(query) {
    if (!query || query.trim() === '') {
        document.getElementById('search-results').innerHTML = '<p class="text-muted">Enter a search term</p>';
        return;
    }
    
    try {
        const users = await apiRequest(`/api/users/search?q=${encodeURIComponent(query)}`);
        await renderSearchResults(users);
    } catch (error) {
        showError('Search failed');
        console.error(error);
    }
}

// Render search results
async function renderSearchResults(users) {
    const container = document.getElementById('search-results');
    const template = document.getElementById('search-result-template');
    
    if (!container || !template) return;
    
    container.innerHTML = '';
    
    if (users.length === 0) {
        container.innerHTML = '<p class="text-muted">No users found</p>';
        return;
    }
    
    const currentUser = getUser();
    
    for (const user of users) {
        const clone = template.content.cloneNode(true);
        
        // User info
        clone.querySelector('.search-avatar').src = user.image_url || 'https://via.placeholder.com/64';
        clone.querySelector('.search-name').textContent = user.name;
        
        // Role with additional info
        let roleText = user.role;
        if (user.role === 'student' && user.course) {
            roleText += ` • ${user.course}`;
        } else if (user.role === 'faculty' && user.academic_position) {
            roleText += ` • ${user.academic_position}`;
        }
        clone.querySelector('.search-role').textContent = roleText;
        
        // Make card clickable to view profile
        const clickableArea = clone.querySelector('.search-clickable');
        clickableArea.addEventListener('click', () => {
            viewUserProfile(user.id);
        });
        
        // Get connection status
        try {
            const status = await apiRequest(`/api/connections/status/${user.id}`);
            
            // Add appropriate button based on status
            const card = clone.querySelector('.search-card');
            const buttonContainer = document.createElement('div');
            
            if (status.status === 'none') {
                // Not connected - show add friend button
                buttonContainer.innerHTML = `
                    <button class="btn btn-primary btn-sm" data-user-id="${user.id}">
                        <i class="bi bi-person-plus"></i> Add Friend
                    </button>
                `;
                buttonContainer.querySelector('button').addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click
                    sendFriendRequest(user.id);
                });
            } else if (status.status === 'sent') {
                // Request sent - show pending
                buttonContainer.innerHTML = `
                    <button class="btn btn-secondary btn-sm" disabled>
                        <i class="bi bi-clock"></i> Request Sent
                    </button>
                `;
            } else if (status.status === 'received') {
                // Request received - show accept/decline
                buttonContainer.innerHTML = `
                    <button class="btn btn-primary btn-sm me-2" data-connection-id="${status.connection_id}">
                        <i class="bi bi-check"></i> Accept
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" data-connection-id="${status.connection_id}">
                        <i class="bi bi-x"></i> Decline
                    </button>
                `;
                buttonContainer.querySelector('.btn-primary').addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent card click
                    await acceptRequest(parseInt(e.target.dataset.connectionId));
                    await performSearch(new URLSearchParams(window.location.search).get('q'));
                });
                buttonContainer.querySelector('.btn-outline-secondary').addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent card click
                    await declineRequest(parseInt(e.target.dataset.connectionId));
                    await performSearch(new URLSearchParams(window.location.search).get('q'));
                });
            } else if (status.status === 'connected') {
                // Already friends - show connected
                buttonContainer.innerHTML = `
                    <button class="btn btn-success btn-sm me-2" disabled>
                        <i class="bi bi-check-circle"></i> Friends
                    </button>
                    <button class="btn btn-outline-danger btn-sm" data-connection-id="${status.connection_id}">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                `;
                buttonContainer.querySelector('.btn-outline-danger').addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent card click
                    if (confirm('Remove this connection?')) {
                        await removeConnection(parseInt(e.target.dataset.connectionId));
                        await performSearch(new URLSearchParams(window.location.search).get('q'));
                    }
                });
            }
            
            card.querySelector('.card-body').appendChild(buttonContainer);
        } catch (error) {
            console.error('Failed to get connection status:', error);
        }
        
        container.appendChild(clone);
    }
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

// Send friend request
async function sendFriendRequest(userId) {
    try {
        await apiRequest(`/api/connections?receiver_id=${userId}`, {
            method: 'POST'
        });
        
        showSuccess('Friend request sent!');
        
        // Refresh search results
        const query = new URLSearchParams(window.location.search).get('q');
        await performSearch(query);
        
    } catch (error) {
        showError(error.message || 'Failed to send friend request');
    }
}

// Accept request
async function acceptRequest(connectionId) {
    try {
        await apiRequest(`/api/connections/${connectionId}/accept`, {
            method: 'POST'
        });
        showSuccess('Friend request accepted!');
    } catch (error) {
        showError(error.message || 'Failed to accept request');
    }
}

// Decline request
async function declineRequest(connectionId) {
    try {
        await apiRequest(`/api/connections/${connectionId}/reject`, {
            method: 'POST'
        });
        showSuccess('Friend request declined');
    } catch (error) {
        showError(error.message || 'Failed to decline request');
    }
}

// Remove connection
async function removeConnection(connectionId) {
    try {
        await apiRequest(`/api/connections/${connectionId}`, {
            method: 'DELETE'
        });
        showSuccess('Connection removed');
    } catch (error) {
        showError(error.message || 'Failed to remove connection');
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.initSearch = initSearch;
}