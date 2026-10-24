let currentNotificationId = null;

// Initialize notifications module
async function initNotifications() {
    if (!requireAuth()) return;
    
    displayUserInfo();
    await loadNotifications();
    await updateNotificationBadge();
}

// Load notifications
async function loadNotifications() {
    try {
        const notifications = await apiRequest('/api/notifications?limit=50');
        renderNotifications(notifications);
    } catch (error) {
        showError('Failed to load notifications');
        console.error(error);
    }
}

// Render notifications
function renderNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    const template = document.getElementById('notification-card-template');
    
    if (!container || !template) return;
    
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-bell-slash fs-1"></i>
                <p class="mt-3">No notifications</p>
            </div>
        `;
        return;
    }
    
    notifications.forEach(notif => {
        const clone = template.content.cloneNode(true);
        const card = clone.querySelector('.notification-card');
        
        // Mark unread notifications
        if (!notif.read_status) {
            card.classList.add('bg-light');
        }
        
        // Add clickable class
        card.classList.add('cursor-pointer');
        card.style.cursor = 'pointer';
        
        // Notification title and body
        const title = getNotificationTitle(notif);
        const body = getNotificationBody(notif);
        
        clone.querySelector('.notif-title').textContent = title;
        clone.querySelector('.notif-body').textContent = body;
        clone.querySelector('.notif-time').textContent = formatTimestamp(notif.created_at);
        
        // Add icon based on type
        const iconContainer = clone.querySelector('.notif-icon');
        if (iconContainer) {
            iconContainer.innerHTML = getNotificationIcon(notif.type);
        }
        
        // Delete button - prevent event propagation
        const deleteBtn = clone.querySelector('.btn-delete-notification');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteNotification(notif.id);
        });
        
        // Click handler for the entire card
        card.addEventListener('click', async (e) => {
            // Don't trigger if clicking the delete button
            if (e.target.closest('.btn-delete-notification')) {
                return;
            }
            
            // Mark as read
            if (!notif.read_status) {
                await markAsRead(notif.id);
                card.classList.remove('bg-light');
                await updateNotificationBadge();
            }
            
            // Navigate to target
            await handleNotificationClick(notif);
        });
        
        container.appendChild(clone);
    });
}

// Get notification icon
function getNotificationIcon(type) {
    const icons = {
        'CONN_REQUEST': '<i class="bi bi-person-plus-fill text-primary"></i>',
        'CONN_ACCEPTED': '<i class="bi bi-person-check-fill text-success"></i>',
        'COMMENT': '<i class="bi bi-chat-fill text-info"></i>',
        'NEW_POST': '<i class="bi bi-file-post-fill text-warning"></i>'
    };
    return icons[type] || '<i class="bi bi-bell-fill"></i>';
}

// Handle notification click
async function handleNotificationClick(notif) {
    switch (notif.type) {
        case 'CONN_REQUEST':
        case 'CONN_ACCEPTED':
            // Redirect to friends page
            window.location.href = '/templates/friends.html';
            break;
            
        case 'COMMENT':
        case 'NEW_POST':
            // Navigate to the post 
            if (notif.target_type === 'POST' && notif.target_id) {
                window.location.href = `/templates/index.html?post=${notif.target_id}`;
            }
            break;
            
        default:
            console.log('Unknown notification type:', notif.type);
    }
}

// Get notification title
function getNotificationTitle(notif) {
    switch (notif.type) {
        case 'CONN_REQUEST':
            return 'New Friend Request';
        case 'CONN_ACCEPTED':
            return 'Friend Request Accepted';
        case 'COMMENT':
            return 'New Comment';
        case 'NEW_POST':
            return 'New Post';
        default:
            return 'Notification';
    }
}

// Get notification body
function getNotificationBody(notif) {
    switch (notif.type) {
        case 'CONN_REQUEST':
            return `${notif.notifier_name} sent you a friend request`;
        case 'CONN_ACCEPTED':
            return `${notif.notifier_name} accepted your friend request`;
        case 'COMMENT':
            return `${notif.notifier_name} commented on your post`;
        case 'NEW_POST':
            return `${notif.notifier_name} created a new post`;
        default:
            return notif.notifier_name;
    }
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        await apiRequest(`/api/notifications/${notificationId}/read`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Failed to mark as read:', error);
    }
}

// Update notification badge
async function updateNotificationBadge() {
    try {
        const data = await apiRequest('/api/notifications/unread-count');
        
        // Update all notification badges
        const badges = document.querySelectorAll('.notification-badge');
        badges.forEach(badge => {
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Failed to get unread count:', error);
    }
}

// Confirm delete notification
function confirmDeleteNotification(notificationId) {
    currentNotificationId = notificationId;
    const modal = new bootstrap.Modal(document.getElementById('confirmDeleteNotificationModal'));
    modal.show();
}

// Delete notification
async function deleteNotification() {
    if (!currentNotificationId) return;
    
    const confirmBtn = document.getElementById('confirm-delete-notif-btn');
    confirmBtn.disabled = true;
    
    try {
        await apiRequest(`/api/notifications/${currentNotificationId}`, {
            method: 'DELETE'
        });
        
        showSuccess('Notification deleted');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('confirmDeleteNotificationModal')).hide();
        
        await loadNotifications();
        await updateNotificationBadge();
        
    } catch (error) {
        showError(error.message || 'Failed to delete notification');
    } finally {
        confirmBtn.disabled = false;
        currentNotificationId = null;
    }
}

// Setup delete confirmation handler
document.addEventListener('DOMContentLoaded', function() {
    const confirmDeleteBtn = document.getElementById('confirm-delete-notif-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deleteNotification);
    }
});

// Initialize on page load
if (typeof window !== 'undefined') {
    window.initNotifications = initNotifications;
    window.updateNotificationBadge = updateNotificationBadge;
}