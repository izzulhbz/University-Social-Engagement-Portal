document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const toggleButtons = document.querySelectorAll('.sidebar-toggle');
    const closeButton = document.querySelector('.btn-close-sidebar');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Toggle sidebar
    function toggleSidebar() {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    }
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }
    
    // Add event listeners to all toggle buttons
    toggleButtons.forEach(button => {
        button.addEventListener('click', toggleSidebar);
    });
    
    // Close button
    if (closeButton) {
        closeButton.addEventListener('click', closeSidebar);
    }
    
    // Close on overlay click
    overlay.addEventListener('click', closeSidebar);
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('show')) {
            closeSidebar();
        }
    });
});