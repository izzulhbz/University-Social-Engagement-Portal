let currentEditPostId = null;
let currentDeletePostId = null;
let removeImageFlag = false;

// Initialize profile page
async function initProfile() {
    if (!requireAuth()) return;

    const user = getUser();
    displayUserInfo();
    await loadUserProfile();
    await loadUserPosts(user.id);
}

// Load user profile
async function loadUserProfile() {
    try {
        const user = await getCurrentUser();

        // Update profile display
        document.getElementById('profile-avatar').src = user.image_url || 'https://via.placeholder.com/150';
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-role').textContent = user.role;
        document.getElementById('profile-bio').textContent = user.bio || 'No bio yet';

        // Set edit form values
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-bio').value = user.bio || '';

        // Update stored user
        setUser(user);

    } catch (error) {
        showError('Failed to load profile');
        console.error(error);
    }
}

// Load user posts
async function loadUserPosts(userId) {
    try {
        const posts = await apiRequest(`/api/posts/user/${userId}?limit=50`);
        renderUserPosts(posts);
    } catch (error) {
        showError('Failed to load posts');
        console.error(error);
    }
}

// Render user posts 
function renderUserPosts(posts) {
    const container = document.getElementById('user-posts-container');

    if (!container) return;

    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-inbox fs-1"></i>
                <p class="mt-3">No posts yet</p>
            </div>
        `;
        return;
    }

    const currentUser = getUser();

    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'card mb-4 post-card';
        card.dataset.postId = post.id;

        // User can always edit/delete their own posts on profile page
        const canModify = true;

        card.innerHTML = `
            <div class="card-header d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <img class="rounded-circle me-3" src="${post.author_image_url || 'https://via.placeholder.com/50'}" 
                         alt="author" width="50" height="50" />
                    <div>
                        <h6 class="mb-0">${post.author_name}</h6>
                        <small class="text-muted">${post.author_role} • ${formatTimestamp(post.created_at)}</small>
                    </div>
                </div>
                ${canModify ? `
                    <div class="dropdown">
                        <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown" 
                                onclick="event.stopPropagation()">
                            <i class="bi bi-three-dots-vertical fs-5"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                                <a class="dropdown-item" href="#" onclick="event.preventDefault(); event.stopPropagation(); openEditPostModal('${post.id}')">
                                    <i class="bi bi-pencil me-2"></i>Edit
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item text-danger" href="#" onclick="event.preventDefault(); event.stopPropagation(); confirmDeletePost('${post.id}')">
                                    <i class="bi bi-trash me-2"></i>Delete
                                </a>
                            </li>
                        </ul>
                    </div>
                ` : ''}
            </div>
            <div class="card-body post-clickable" style="cursor: pointer;" data-post-id="${post.id}">
                <p class="post-content mb-2">${post.content}</p>
                ${post.image_url ? `
                    <img class="img-fluid rounded mb-3" src="${post.image_url}" alt="post image" />
                ` : ''}
                <div class="text-muted small">
                    <i class="bi bi-chat"></i>
                    <span class="ms-1">${post.comment_count} ${post.comment_count === 1 ? 'Comment' : 'Comments'}</span>
                </div>
            </div>
        `;

        // Add click handler to post body
        const postBody = card.querySelector('.post-clickable');
        postBody.addEventListener('click', () => viewPost(post.id));

        container.appendChild(card);
    });
}

// Upload profile image
async function uploadProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showError('Only PNG, JPG, and JPEG files are allowed');
        return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
    }

    const user = getUser();
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/upload-profile-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        showSuccess('Profile image updated!');

        // Update display
        document.getElementById('profile-avatar').src = data.image_url;

        // Reload profile
        await loadUserProfile();

    } catch (error) {
        showError(error.message || 'Failed to upload image');
    }
}

// Save profile changes
async function saveProfile() {
    const name = document.getElementById('edit-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    if (!name) {
        showError('Name is required');
        return;
    }

    const user = getUser();

    try {
        await apiRequest(`/api/users/${user.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, bio })
        });

        showSuccess('Profile updated!');
        bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
        await loadUserProfile();

    } catch (error) {
        showError(error.message || 'Failed to update profile');
    }
}

// Change password
async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showError('All fields are required');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('New passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        showError('New password must be at least 6 characters');
        return;
    }

    const user = getUser();

    try {
        await apiRequest(`/api/users/${user.id}/change-password`, {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        showSuccess('Password changed successfully!');
        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();

        // Clear form
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';

    } catch (error) {
        showError(error.message || 'Failed to change password');
    }
}

// Open edit post modal
function openEditPostModal(postId) {
    // Find the post
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postCard) {
        showError('Post not found');
        return;
    }

    currentEditPostId = postId;
    removeImageFlag = false;

    // Get post content
    const content = postCard.querySelector('.post-content').textContent;
    const imageElement = postCard.querySelector('.post-content + img');

    document.getElementById('edit-post-content').value = content;

    // Show current image if exists
    const imagePreview = document.getElementById('current-image-preview');
    const currentImage = document.getElementById('current-image');

    if (imageElement && imageElement.src) {
        currentImage.src = imageElement.src;
        imagePreview.style.display = 'block';
    } else {
        imagePreview.style.display = 'none';
    }

    // Clear file input
    document.getElementById('edit-post-image').value = '';

    const modal = new bootstrap.Modal(document.getElementById('editPostModal'));
    modal.show();
}

// Remove post image
function removePostImage() {
    removeImageFlag = true;
    document.getElementById('current-image-preview').style.display = 'none';
    document.getElementById('edit-post-image').value = '';
}

// Save post edit
async function savePostEdit() {
    const content = document.getElementById('edit-post-content').value.trim();

    if (!content) {
        showError('Content is required');
        return;
    }

    const imageFile = document.getElementById('edit-post-image').files[0];

    // Validate image if provided
    if (imageFile) {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!validTypes.includes(imageFile.type)) {
            showError('Only PNG, JPG, and JPEG files are allowed');
            return;
        }

        if (imageFile.size > 5 * 1024 * 1024) {
            showError('File size must be less than 5MB');
            return;
        }
    }

    const saveBtn = document.getElementById('save-post-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('title', content.substring(0, 50));
        formData.append('remove_image', removeImageFlag);

        if (imageFile) {
            formData.append('image', imageFile);
        }

        const response = await fetch(`${API_BASE_URL}/api/posts/${currentEditPostId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update post');
        }

        showSuccess('Post updated successfully!');
        bootstrap.Modal.getInstance(document.getElementById('editPostModal')).hide();

        // Reload posts
        const user = getUser();
        await loadUserPosts(user.id);

    } catch (error) {
        showError(error.message || 'Failed to update post');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Changes';
    }
}

// View post details
async function viewPost(postId) {
    try {
        const post = await apiRequest(`/api/posts/${postId}`);

        document.getElementById('detail-author-avatar').src = post.author_image_url || 'https://via.placeholder.com/50';
        document.getElementById('detail-author-name').textContent = post.author_name;
        document.getElementById('detail-author-role').textContent = post.author_role;
        document.getElementById('detail-content').textContent = post.content;

        const detailImage = document.getElementById('detail-image');
        if (post.image_url) {
            detailImage.src = post.image_url;
            detailImage.style.display = 'block';
        } else {
            detailImage.style.display = 'none';
        }

        // Clear comment input
        const commentInput = document.getElementById('new-comment-content');
        if (commentInput) {
            commentInput.value = '';
        }

        // Load comments using the comments.js function
        if (window.loadComments) {
            const comments = await window.loadComments(postId);
            document.getElementById('detail-comments-count').textContent = comments.length;
        }

        const modal = new bootstrap.Modal(document.getElementById('postDetailsModal'));
        modal.show();

    } catch (error) {
        showError('Failed to load post details');
        console.error(error);
    }
}

// Confirm delete post
function confirmDeletePost(postId) {
    currentDeletePostId = postId;
    const modal = new bootstrap.Modal(document.getElementById('confirmDeletePostModal'));
    modal.show();
}

// Delete post
async function deletePost() {
    if (!currentDeletePostId) return;

    try {
        await apiRequest(`/api/posts/${currentDeletePostId}`, {
            method: 'DELETE'
        });

        showSuccess('Post deleted successfully');
        bootstrap.Modal.getInstance(document.getElementById('confirmDeletePostModal')).hide();

        const user = getUser();
        await loadUserPosts(user.id);

    } catch (error) {
        showError(error.message || 'Failed to delete post');
    }
}

// Setup event handlers
document.addEventListener('DOMContentLoaded', function () {
    const confirmDeleteBtn = document.getElementById('confirm-delete-post-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deletePost);
    }
});

// Initialize on page load
if (typeof window !== 'undefined') {
    window.initProfile = initProfile;
    window.uploadProfileImage = uploadProfileImage;
    window.saveProfile = saveProfile;
    window.changePassword = changePassword;
    window.savePostEdit = savePostEdit;
    window.removePostImage = removePostImage;
    window.openEditPostModal = openEditPostModal;
    window.confirmDeletePost = confirmDeletePost;
    window.viewPost = viewPost;
}