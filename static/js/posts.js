let currentPosts = [];
let currentPostId = null;
let removeImageFlag = false;

// Initialize posts module
async function initPosts() {
    if (!requireAuth()) return;
    
    displayUserInfo();
    await loadFeed();
    setupPostHandlers();
}

// Setup event handlers
function setupPostHandlers() {
    const openCreatePostBtn = document.getElementById('openCreatePostBtn');
    const submitCreatePostBtn = document.getElementById('submit-create-post');
    const confirmDeletePostBtn = document.getElementById('confirm-delete-post-btn');
    
    if (openCreatePostBtn) {
        openCreatePostBtn.addEventListener('click', openCreatePostModal);
    }
    
    if (submitCreatePostBtn) {
        submitCreatePostBtn.addEventListener('click', createPost);
    }
    
    if (confirmDeletePostBtn) {
        confirmDeletePostBtn.addEventListener('click', deletePost);
    }
}

// Load news feed
async function loadFeed() {
    try {
        const posts = await apiRequest('/api/posts/feed?limit=20');
        currentPosts = posts;
        renderPosts(posts);
    } catch (error) {
        showError('Failed to load posts');
        console.error(error);
    }
}

// Load user's posts
async function loadUserPosts(userId) {
    try {
        const posts = await apiRequest(`/api/posts/user/${userId}?limit=20`);
        currentPosts = posts;
        renderPosts(posts);
    } catch (error) {
        showError('Failed to load posts');
        console.error(error);
    }
}

// Render posts
function renderPosts(posts) {
    const container = document.getElementById('posts-container');
    
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
        
        // Determine if user can edit/delete
        const canModify = post.author_id === currentUser.id || currentUser.role === 'ADMIN';
        
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
                                <a class="dropdown-item" href="#" onclick="event.preventDefault(); event.stopPropagation(); editPost('${post.id}')">
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

// Open create post modal
function openCreatePostModal() {
    document.getElementById('create-post-content').value = '';
    document.getElementById('create-post-image').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('createPostModal'));
    modal.show();
}

// Create post
async function createPost() {
    const content = document.getElementById('create-post-content').value.trim();
    const imageFile = document.getElementById('create-post-image').files[0];
    
    if (!content) {
        showError('Please enter post content');
        return;
    }
    
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
    
    const submitBtn = document.getElementById('submit-create-post');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Posting...';
    
    try {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('title', content.substring(0, 50));
        
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        const response = await fetch(`${API_BASE_URL}/api/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create post');
        }
        
        showSuccess('Post created successfully!');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('createPostModal')).hide();
        
        // Reload feed
        await loadFeed();
        
    } catch (error) {
        showError(error.message || 'Failed to create post');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Post';
    }
}

// View post details
async function viewPost(postId) {
    try {
        const post = await apiRequest(`/api/posts/${postId}`);
        
        // Update modal
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

// Edit post
function editPost(postId) {
    // Find the post in currentPosts
    const post = currentPosts.find(p => p.id === postId);
    if (!post) {
        showError('Post not found');
        return;
    }
    
    openEditPostModal(post);
}

// Open edit post modal
function openEditPostModal(post) {
    currentPostId = post.id;
    removeImageFlag = false;
    
    document.getElementById('edit-post-content').value = post.content;
    
    // Show current image if exists
    const imagePreview = document.getElementById('edit-current-image-preview');
    const currentImage = document.getElementById('edit-current-image');
    
    if (post.image_url) {
        currentImage.src = post.image_url;
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
    document.getElementById('edit-current-image-preview').style.display = 'none';
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
    
    const saveBtn = document.getElementById('save-edit-post-btn');
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
        
        const response = await fetch(`${API_BASE_URL}/api/posts/${currentPostId}`, {
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
        
        // Reload feed
        await loadFeed();
        
    } catch (error) {
        showError(error.message || 'Failed to update post');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Changes';
    }
}

// Confirm delete post
function confirmDeletePost(postId) {
    currentPostId = postId;
    const modal = new bootstrap.Modal(document.getElementById('confirmDeletePostModal'));
    modal.show();
}

// Delete post
async function deletePost() {
    if (!currentPostId) return;
    
    try {
        await apiRequest(`/api/posts/${currentPostId}`, {
            method: 'DELETE'
        });
        
        showSuccess('Post deleted successfully');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('confirmDeletePostModal')).hide();
        
        // Reload feed
        await loadFeed();
        
    } catch (error) {
        showError(error.message || 'Failed to delete post');
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.initPosts = initPosts;
    window.loadFeed = loadFeed;
    window.loadUserPosts = loadUserPosts;
    window.viewPost = viewPost;
    window.editPost = editPost;
    window.confirmDeletePost = confirmDeletePost;
    window.removePostImage = removePostImage;
    window.savePostEdit = savePostEdit;
}