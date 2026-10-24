let usersChart = null;
let engagementChart = null;
let currentRange = 'week';

// Initialize admin dashboard
async function initAdminDashboard() {
    if (!requireAuth()) return;
    
    const user = getUser();
    if (user.role !== 'ADMIN') {
        showError('Access denied. Admin only.');
        setTimeout(() => {
            window.location.href = '/templates/index.html';
        }, 2000);
        return;
    }
    
    displayUserInfo();
    setupRangeButtons();
    await loadAllDashboardData('week');
}

// Setup range filter buttons
function setupRangeButtons() {
    const buttonGroup = document.getElementById('timeRangeButtons');
    if (!buttonGroup) return;
    
    const buttons = buttonGroup.querySelectorAll('button[data-range]');
    buttons.forEach(button => {
        button.addEventListener('click', async function() {
            // Remove active from all buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Add active to clicked button
            this.classList.add('active');
            
            const range = this.dataset.range;
            currentRange = range;
            await loadAllDashboardData(range);
        });
    });
}

// Load all dashboard data
async function loadAllDashboardData(range = 'week') {
    try {
        await Promise.all([
            loadUserAnalytics(range),
            loadEngagementAnalytics(range),
            loadPopularPosts(range),
            loadNetworkAnalysis(),
            loadCrossRoleConnections(),
            loadRoleInsights()
        ]);
    } catch (error) {
        showError('Failed to load dashboard data');
        console.error(error);
    }
}

// Load user analytics
async function loadUserAnalytics(range) {
    try {
        const data = await apiRequest(`/api/analytics/users?range_type=${range}`);
        renderUsersChart(data);
    } catch (error) {
        console.error('Failed to load user analytics:', error);
    }
}

// Load engagement analytics
async function loadEngagementAnalytics(range) {
    try {
        const data = await apiRequest(`/api/analytics/engagement?range_type=${range}`);
        renderEngagementChart(data);
    } catch (error) {
        console.error('Failed to load engagement analytics:', error);
    }
}

// Load popular posts
async function loadPopularPosts(range) {
    try {
        const posts = await apiRequest(`/api/analytics/popular-posts?range_type=${range}&limit=10`);
        renderPopularPosts(posts);
    } catch (error) {
        console.error('Failed to load popular posts:', error);
    }
}

// Load network analysis
async function loadNetworkAnalysis() {
    try {
        const data = await apiRequest('/api/analytics/advanced/network');
        
        // Update stats
        document.getElementById('total-connections').textContent = 
            data.network_stats.total_connections;
        document.getElementById('pending-requests').textContent = 
            data.network_stats.pending_requests;
        
        // Calculate acceptance rate
        const totalRequests = data.network_stats.total_connections + 
                            data.network_stats.pending_requests;
        const acceptanceRate = totalRequests > 0 
            ? Math.round((data.network_stats.total_connections / totalRequests) * 100) 
            : 0;
        document.getElementById('acceptance-rate').textContent = acceptanceRate + '%';
        
        // Calculate average connections
        const avgConnections = data.top_connected_users.length > 0
            ? Math.round(data.top_connected_users.reduce((sum, u) => sum + u.top_connections, 0) / 
                        data.top_connected_users.length)
            : 0;
        document.getElementById('avg-connections').textContent = avgConnections;
        
        // Render top connected users
        const tbody = document.getElementById('top-connected-users');
        tbody.innerHTML = '';
        
        // Get unique top users
        const uniqueUsers = {};
        data.top_connected_users.forEach(user => {
            if (!uniqueUsers[user.top_user]) {
                uniqueUsers[user.top_user] = user;
            }
        });
        
        Object.values(uniqueUsers).slice(0, 5).forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.top_user}</td>
                <td><span class="badge bg-${getRoleBadgeColor(user.top_user_role)}">${user.top_user_role}</span></td>
                <td class="text-center">${user.top_connections}</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Failed to load network analysis:', error);
    }
}

// Load cross-role connections
async function loadCrossRoleConnections() {
    try {
        const data = await apiRequest('/api/analytics/advanced/cross-role');
        
        const tbody = document.getElementById('cross-role-connections');
        tbody.innerHTML = '';
        
        if (data.cross_role_connections.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No connections yet</td></tr>';
            return;
        }
        
        data.cross_role_connections.forEach(conn => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge bg-${getRoleBadgeColor(conn.role_1)}">${conn.role_1}</span></td>
                <td><span class="badge bg-${getRoleBadgeColor(conn.role_2)}">${conn.role_2}</span></td>
                <td class="text-center"><strong>${conn.connection_count}</strong></td>
                <td class="text-center">${conn.unique_users_role_1}</td>
                <td class="text-center">${conn.unique_users_role_2}</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Failed to load cross-role connections:', error);
    }
}

// Load role insights
async function loadRoleInsights() {
    try {
        const data = await apiRequest('/api/analytics/advanced/role-insights');
        
        // Top students
        const studentsBody = document.getElementById('top-students');
        studentsBody.innerHTML = '';
        
        if (data.top_connected_students.length === 0) {
            studentsBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No data</td></tr>';
        } else {
            data.top_connected_students.slice(0, 5).forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.name}</td>
                    <td><small class="text-muted">${student.course || 'N/A'}</small></td>
                    <td class="text-center"><strong>${student.connection_count}</strong></td>
                `;
                studentsBody.appendChild(row);
            });
        }
        
        // Top faculty
        const facultyBody = document.getElementById('top-faculty');
        facultyBody.innerHTML = '';
        
        if (data.top_connected_faculty.length === 0) {
            facultyBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No data</td></tr>';
        } else {
            data.top_connected_faculty.slice(0, 5).forEach(faculty => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${faculty.name}</td>
                    <td><small class="text-muted">${faculty.academic_position || 'N/A'}</small></td>
                    <td class="text-center"><strong>${faculty.connection_count}</strong></td>
                `;
                facultyBody.appendChild(row);
            });
        }
        
    } catch (error) {
        console.error('Failed to load role insights:', error);
    }
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

// Render users chart
function renderUsersChart(data) {
    const ctx = document.getElementById('usersStackedChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (usersChart) {
        usersChart.destroy();
    }
    
    const chartData = {
        labels: ['Student', 'Faculty', 'Admin'],
        datasets: [
            {
                label: 'Active',
                data: [
                    data.active_users.student,
                    data.active_users.faculty,
                    data.active_users.admin
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
            },
            {
                label: 'Inactive',
                data: [
                    data.inactive_users.student,
                    data.inactive_users.faculty,
                    data.inactive_users.admin
                ],
                backgroundColor: 'rgba(201, 203, 207, 0.8)',
            }
        ]
    };
    
    usersChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 100
                    }
                }
            },
        }
    });
}

// Render engagement chart
function renderEngagementChart(data) {
    const ctx = document.getElementById('engagementChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (engagementChart) {
        engagementChart.destroy();
    }
    
    const chartData = {
        labels: ['Posts', 'Comments'],
        datasets: [{
            label: 'Count',
            data: [data.posts, data.comments],
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(75, 192, 192, 0.8)'
            ],
        }]
    };
    
    engagementChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 100
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Render popular posts table
function renderPopularPosts(posts) {
    const tbody = document.getElementById('popularPostsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (posts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No posts found</td></tr>';
        return;
    }
    
    posts.forEach(post => {
        const row = document.createElement('tr');
        
        // Truncate content
        const content = post.content.length > 50 
            ? post.content.substring(0, 50) + '...' 
            : post.content;
        
        row.innerHTML = `
            <td>
                <div class="fw-bold">${post.title || 'Untitled'}</div>
                <small class="text-muted">${content}</small>
            </td>
            <td>
                ${post.author_name}
                <br><small class="text-muted">${post.author_role}</small>
            </td>
            <td class="text-center">${post.comment_count}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary" onclick="viewPostInModal('${post.id}')">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// View post in modal
async function viewPostInModal(postId) {
    try {
        const post = await apiRequest(`/api/posts/${postId}`);
        const comments = await apiRequest(`/api/posts/${postId}/comments`);
        
        // Update modal
        document.getElementById('pv-avatar').src = post.author_image_url || 'https://via.placeholder.com/50';
        document.getElementById('pv-author').textContent = post.author_name;
        document.getElementById('pv-role').textContent = post.author_role;
        document.getElementById('pv-content').textContent = post.content;
        
        const pvImage = document.getElementById('pv-image');
        if (post.image_url) {
            pvImage.src = post.image_url;
            pvImage.style.display = 'block';
        } else {
            pvImage.style.display = 'none';
        }
        
        document.getElementById('pv-comments-count').textContent = comments.length;
        
        const commentsDiv = document.getElementById('pv-comments');
        if (comments.length === 0) {
            commentsDiv.innerHTML = '<p class="text-muted">No comments</p>';
        } else {
            commentsDiv.innerHTML = comments.slice(0, 5).map(c => `
                <div class="py-2 border-bottom">
                    <strong>${c.author_name}:</strong> ${c.content}
                </div>
            `).join('');
        }
        
        const modal = new bootstrap.Modal(document.getElementById('postViewModal'));
        modal.show();
        
    } catch (error) {
        showError('Failed to load post');
        console.error(error);
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.initAdminDashboard = initAdminDashboard;
    window.viewPostInModal = viewPostInModal;
}