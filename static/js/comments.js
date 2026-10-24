let currentViewingPostId = null;
let currentEditCommentId = null;
let currentDeleteCommentId = null;

// Load and render comments for a post
async function loadComments(postId) {
    try {
        const comments = await apiRequest(`/api/posts/${postId}/comments`);
        renderComments(comments, postId);
        return comments;
    } catch (error) {
        console.error('Failed to load comments:', error);
        return [];
    }
}

// Render comments in the modal
function renderComments(comments, postId) {
    const commentsDiv = document.getElementById('detail-comments');
    const currentUser = getUser();
    
    if (!commentsDiv) return;
    
    // Store the current post ID for adding new comments
    currentViewingPostId = postId;
    
    if (comments.length === 0) {
        commentsDiv.innerHTML = '<p class="text-muted">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    commentsDiv.innerHTML = comments.map(comment => {
        const isOwner = comment.author_id === currentUser.id;
        const isAdmin = currentUser.role === 'ADMIN';
        const canEdit = isOwner;
        const canDelete = isOwner || isAdmin;
        
        return `
            <div class="comment-item border-bottom py-3" data-comment-id="${comment.id}">
                <div class="d-flex align-items-start">
                    <img src="${comment.author_image_url || 'https://via.placeholder.com/40'}" 
                         class="rounded-circle me-3" width="40" height="40" alt="avatar" />
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center justify-content-between mb-1">
                            <div>
                                <strong>${comment.author_name}</strong>
                                <small class="text-muted ms-2">${comment.author_role}</small>
                                <small class="text-muted ms-2">${formatTimestamp(comment.created_at)}</small>
                            </div>
                            ${canEdit || canDelete ? `
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-link text-muted" type="button" data-bs-toggle="dropdown">
                                        <i class="bi bi-three-dots"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        ${canEdit ? `
                                            <li>
                                                <a class="dropdown-item" href="#" onclick="openEditCommentModal('${comment.id}', '${escapeHtml(comment.content)}'); return false;">
                                                    <i class="bi bi-pencil me-2"></i>Edit
                                                </a>
                                            </li>
                                        ` : ''}
                                        ${canDelete ? `
                                            <li>
                                                <a class="dropdown-item text-danger" href="#" onclick="confirmDeleteComment('${comment.id}'); return false;">
                                                    <i class="bi bi-trash me-2"></i>Delete
                                                </a>
                                            </li>
                                        ` : ''}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                        <p class="mb-0 comment-content">${escapeHtml(comment.content)}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Create a new comment
async function createComment() {
    const textarea = document.getElementById('new-comment-content');
    const content = textarea.value.trim();
    
    if (!content) {
        showError('Please enter a comment');
        return;
    }
    
    if (!currentViewingPostId) {
        showError('Post not found');
        return;
    }
    
    const submitBtn = document.getElementById('submit-comment-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Posting...';
    
    try {
        await apiRequest(`/api/posts/${currentViewingPostId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        
        showSuccess('Comment added!');
        
        // Clear textarea
        textarea.value = '';
        
        // Reload comments
        await loadComments(currentViewingPostId);
        
        // Update comment count
        const comments = await apiRequest(`/api/posts/${currentViewingPostId}/comments`);
        const countElement = document.getElementById('detail-comments-count');
        if (countElement) {
            countElement.textContent = comments.length;
        }
        
    } catch (error) {
        showError(error.message || 'Failed to add comment');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-send"></i> Comment';
    }
}

// Open edit comment modal
function openEditCommentModal(commentId, currentContent) {
    currentEditCommentId = commentId;
    
    // Unescape HTML entities for editing
    const textarea = document.createElement('textarea');
    textarea.innerHTML = currentContent;
    const decodedContent = textarea.value;
    
    document.getElementById('edit-comment-content').value = decodedContent;
    
    const modal = new bootstrap.Modal(document.getElementById('editCommentModal'));
    modal.show();
}

// Save comment edit
async function saveCommentEdit() {
    const content = document.getElementById('edit-comment-content').value.trim();
    
    if (!content) {
        showError('Comment cannot be empty');
        return;
    }
    
    if (!currentEditCommentId) {
        showError('Comment not found');
        return;
    }
    
    const saveBtn = document.getElementById('save-comment-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    
    try {
        await apiRequest(`/api/comments/${currentEditCommentId}`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
        
        showSuccess('Comment updated!');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('editCommentModal')).hide();
        
        // Reload comments
        if (currentViewingPostId) {
            await loadComments(currentViewingPostId);
        }
        
    } catch (error) {
        showError(error.message || 'Failed to update comment');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Changes';
    }
}

// Confirm delete comment
function confirmDeleteComment(commentId) {
    currentDeleteCommentId = commentId;
    const modal = new bootstrap.Modal(document.getElementById('confirmDeleteCommentModal'));
    modal.show();
}

// Delete comment
async function deleteComment() {
    if (!currentDeleteCommentId) return;
    
    const deleteBtn = document.getElementById('confirm-delete-comment-btn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
    
    try {
        await apiRequest(`/api/comments/${currentDeleteCommentId}`, {
            method: 'DELETE'
        });
        
        showSuccess('Comment deleted');
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('confirmDeleteCommentModal')).hide();
        
        // Reload comments
        if (currentViewingPostId) {
            await loadComments(currentViewingPostId);
            
            // Update comment count
            const comments = await apiRequest(`/api/posts/${currentViewingPostId}/comments`);
            const countElement = document.getElementById('detail-comments-count');
            if (countElement) {
                countElement.textContent = comments.length;
            }
        }
        
    } catch (error) {
        showError(error.message || 'Failed to delete comment');
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = 'Delete';
    }
}

// Setup comment event listeners
function setupCommentHandlers() {
    const submitCommentBtn = document.getElementById('submit-comment-btn');
    const saveCommentBtn = document.getElementById('save-comment-btn');
    const confirmDeleteCommentBtn = document.getElementById('confirm-delete-comment-btn');
    
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', createComment);
    }
    
    if (saveCommentBtn) {
        saveCommentBtn.addEventListener('click', saveCommentEdit);
    }
    
    if (confirmDeleteCommentBtn) {
        confirmDeleteCommentBtn.addEventListener('click', deleteComment);
    }
    
    // Allow Enter to submit comment (Shift+Enter for new line)
    const textarea = document.getElementById('new-comment-content');
    if (textarea) {
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                createComment();
            }
        });
    }
}

// View post from notification or external link
async function viewPostFromNotification(postId) {
    try {
        // If we're not on the main feed page, redirect there first
        if (!document.getElementById('postDetailsModal')) {
            window.location.href = `/templates/index.html?post=${postId}`;
            return;
        }
        
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
        
        // Load comments
        const comments = await loadComments(postId);
        document.getElementById('detail-comments-count').textContent = comments.length;
        
        const modal = new bootstrap.Modal(document.getElementById('postDetailsModal'));
        modal.show();
        
    } catch (error) {
        showError('Failed to load post');
        console.error(error);
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.loadComments = loadComments;
    window.renderComments = renderComments;
    window.createComment = createComment;
    window.openEditCommentModal = openEditCommentModal;
    window.saveCommentEdit = saveCommentEdit;
    window.confirmDeleteComment = confirmDeleteComment;
    window.deleteComment = deleteComment;
    window.setupCommentHandlers = setupCommentHandlers;
    window.viewPostFromNotification = viewPostFromNotification;
}