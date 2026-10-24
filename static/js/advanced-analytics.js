let growthChart = null;

// Initialize advanced analytics
async function initAdvancedAnalytics() {
    if (!requireAuth()) return;
    
    const user = getUser();
    if (user.role !== 'ADMIN') {
        showError('Access denied. Admin only.');
        setTimeout(() => window.location.href = '/templates/index.html', 2000);
        return;
    }
    
    await loadAllAnalytics();
}

// Load all analytics data
async function loadAllAnalytics() {
    try {
        await Promise.all([
            loadNetworkAnalysis(),
            loadCrossRoleConnections(),
            loadUserGrowth(),
            loadCohortAnalysis(),
            loadRoleInsights()
        ]);
    } catch (error) {
        showError('Failed to load analytics');
        console.error(error);
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

// Get badge color for role
function getRoleBadgeColor(role) {
    switch(role) {
        case 'ADMIN': return 'danger';
        case 'FACULTY': return 'primary';
        case 'STUDENT': return 'info';
        default: return 'secondary';
    }
}

// Load cross-role connections
async function loadCrossRoleConnections() {
    try {
        const data = await apiRequest('/api/analytics/advanced/cross-role');
        
        const tbody = document.getElementById('cross-role-connections');
        tbody.innerHTML = '';
        
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

// Load user growth trend
async function loadUserGrowth() {
    try {
        const data = await apiRequest('/api/analytics/advanced/growth?days=30');
        
        // Group by date for chart
        const dateMap = {};
        data.trends.forEach(trend => {
            const date = trend.registration_date;
            if (!dateMap[date]) {
                dateMap[date] = { STUDENT: 0, FACULTY: 0, ADMIN: 0 };
            }
            dateMap[date][trend.role] = trend.new_users;
        });
        
        const dates = Object.keys(dateMap).sort().reverse().slice(0, 14).reverse();
        const studentData = dates.map(d => dateMap[d].STUDENT);
        const facultyData = dates.map(d => dateMap[d].FACULTY);
        const adminData = dates.map(d => dateMap[d].ADMIN);
        
        renderGrowthChart(dates, studentData, facultyData, adminData);
        
    } catch (error) {
        console.error('Failed to load user growth:', error);
    }
}

// Render growth chart
function renderGrowthChart(labels, studentData, facultyData, adminData) {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    
    if (growthChart) {
        growthChart.destroy();
    }
    
    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Students',
                    data: studentData,
                    borderColor: 'rgb(13, 202, 240)',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Faculty',
                    data: facultyData,
                    borderColor: 'rgb(13, 110, 253)',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Admin',
                    data: adminData,
                    borderColor: 'rgb(220, 53, 69)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Load cohort analysis
async function loadCohortAnalysis() {
    try {
        const data = await apiRequest('/api/analytics/advanced/cohorts');
        
        const tbody = document.getElementById('cohort-data');
        tbody.innerHTML = '';
        
        data.cohorts.slice(0, 12).forEach(cohort => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cohort.cohort_month}</td>
                <td><span class="badge bg-${getRoleBadgeColor(cohort.role)}">${cohort.role}</span></td>
                <td class="text-center">${cohort.total_users}</td>
                <td class="text-center">${cohort.login_rate}%</td>
                <td class="text-center">
                    <span class="badge bg-${cohort.retention_30d > 50 ? 'success' : cohort.retention_30d > 25 ? 'warning' : 'danger'}">
                        ${cohort.retention_30d}%
                    </span>
                </td>
                <td class="text-center">
                    <span class="badge bg-${cohort.retention_7d > 40 ? 'success' : cohort.retention_7d > 20 ? 'warning' : 'danger'}">
                        ${cohort.retention_7d}%
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Failed to load cohort analysis:', error);
    }
}

// Load role insights
async function loadRoleInsights() {
    try {
        const data = await apiRequest('/api/analytics/advanced/role-insights');
        
        // Top students
        const studentsBody = document.getElementById('top-students');
        studentsBody.innerHTML = '';
        data.top_connected_students.slice(0, 5).forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.name}</td>
                <td><small class="text-muted">${student.course || 'N/A'}</small></td>
                <td class="text-center"><strong>${student.connection_count}</strong></td>
            `;
            studentsBody.appendChild(row);
        });
        
        // Top faculty
        const facultyBody = document.getElementById('top-faculty');
        facultyBody.innerHTML = '';
        data.top_connected_faculty.slice(0, 5).forEach(faculty => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${faculty.name}</td>
                <td><small class="text-muted">${faculty.academic_position || 'N/A'}</small></td>
                <td class="text-center"><strong>${faculty.connection_count}</strong></td>
            `;
            facultyBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Failed to load role insights:', error);
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.initAdvancedAnalytics = initAdvancedAnalytics;
}