import {
    getToken,
    storeToken,
    isAuthenticated,
    clearToken,
    getUserRole,
    hasRole,
    getTokenClaim
} from './sessionStorage.js';

const API_BASE_URL = 'https://backendaws.onrender.com/api/feedback';
let currentPage = 1;
const itemsPerPage = 10;
let feedbackData = [];
let filteredData = [];
let userRole = '';
let authToken = '';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated first
    if (!isAuthenticated()) {
        showToast('Please login to access this page', 'error');
        setTimeout(() => {
            window.location.href = '../../index.html'; 
        }, 1000); 
        return;
    }

    // Get the token using the imported function
    authToken = getToken();
    
    // Double check token format (should be handled by isAuthenticated, but extra safety)
    if (!authToken || authToken.split('.').length !== 3) {
        showToast('Invalid or missing token. Please log in again.', 'error');
        clearToken(); // Clear the invalid token
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1500);
        return;
    }

    // Get user roles using the imported function
    const userRoles = getUserRole();
    
    // Check if getUserRole returned an array or single role
    if (Array.isArray(userRoles)) {
        userRole = userRoles[0]; // Take the first role for display
    } else if (userRoles) {
        userRole = userRoles;
    } else {
        userRole = 'Unknown';
    }
    
    // Check if user has SuperAdmin role using the imported function
    if (!hasRole('SuperAdmin')) {
        showToast('Access denied. SuperAdmin role required.', 'error');
        document.getElementById('userRole').textContent = `${userRole} - Access Denied`;
        document.getElementById('feedbackTable').style.display = 'none';
        document.getElementById('controls').style.display = 'none';
        return;
    }

    document.getElementById('userRole').textContent = userRole;
    await loadFeedbackData();

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('sortSelect').addEventListener('change', handleSort);
    document.getElementById('refreshBtn').addEventListener('click', loadFeedbackData);
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);
    
    document.getElementById('feedbackModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
});

// Load feedback data from API
async function loadFeedbackData() {
    showLoading();
    
    // Verify authentication before making API call
    if (!isAuthenticated()) {
        hideLoading();
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1500);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                clearToken();
                showToast('Session expired. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = '../../index.html';
                }, 1500);
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        feedbackData = data.map(feedback => ({
            id: feedback.id,
            fullName: feedback.fullName,
            email: feedback.email,
            type: feedback.type,
            rating: feedback.rating,
            reason: feedback.reason,
            submissionTime: feedback.submittedAt,
            fullFeedback: feedback.fullFeedback || 'No additional feedback provided'
        }));
        
        filteredData = [...feedbackData];
        hideLoading();
        renderTable();
        renderPagination();
        showToast('Feedback data loaded successfully!');
    } catch (error) {
        hideLoading();
        console.error('Error loading feedback:', error);
        showToast('Error loading feedback data. Using sample data for demo.', 'error');
        
        // Use sample data for demo
        feedbackData = getSampleData();
        filteredData = [...feedbackData];
        renderTable();
        renderPagination();
    }
}

// Sample data for demonstration
function getSampleData() {
    return [
        {
            id: 1,
            fullName: "John Doe",
            email: "john.doe@example.com",
            type: "Bug",
            rating: 2,
            reason: "Project ID: 3 - Deleted/Expired",
            submissionTime: "2024-12-01T10:30:00Z",
            fullFeedback: "Application crashes when accessing deleted project. Very frustrating experience."
        },
        {
            id: 2,
            fullName: "Jane Smith",
            email: "jane.smith@example.com",
            type: "Suggestion",
            rating: 4,
            reason: "Feature Enhancement Request",
            submissionTime: "2024-12-02T14:15:00Z",
            fullFeedback: "Dark mode would be great for night work sessions. Also, keyboard shortcuts would improve productivity."
        },
        {
            id: 3,
            fullName: "Mike Johnson",
            email: "mike.johnson@example.com",
            type: "Praise",
            rating: 5,
            reason: "Excellent User Experience",
            submissionTime: "2024-12-03T09:20:00Z",
            fullFeedback: "New interface is amazing! Very intuitive and user-friendly. Great job on the redesign."
        },
        {
            id: 4,
            fullName: "Sarah Wilson",
            email: "sarah.wilson@example.com",
            type: "Bug",
            rating: 1,
            reason: "Project ID: 7 - Deleted/Expired",
            submissionTime: "2024-12-04T16:45:00Z",
            fullFeedback: "Lost all my work when project was deleted. No warning or backup. Very disappointed."
        },
        {
            id: 5,
            fullName: "Robert Brown",
            email: "robert.brown@example.com",
            type: "Suggestion",
            rating: 3,
            reason: "Performance Improvement",
            submissionTime: "2024-12-05T11:30:00Z",
            fullFeedback: "Application is quite slow when loading large datasets. Could use performance optimization."
        }
    ];
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('feedbackTable').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('feedbackTable').style.display = 'table';
}

function renderTable() {
    const tbody = document.getElementById('feedbackTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredData.slice(start, end);

    tbody.innerHTML = '';

    pageData.forEach(feedback => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${feedback.fullName}</td>
            <td>${feedback.email}</td>
            <td>
                <span class="badge badge-${feedback.type.toLowerCase()}">${feedback.type}</span>
            </td>
            <td>
                <div class="rating">
                    ${generateStars(feedback.rating)}
                    <span class="rating-number">(${feedback.rating}/5)</span>
                </div>
            </td>
            <td>${feedback.reason}</td>
            <td>${formatDate(feedback.submissionTime)}</td>
            <td>
                <button class="btn-view" onclick="showFeedbackModal(${feedback.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fas fa-star ${i <= rating ? 'star-filled' : 'star-empty'}"></i>`;
    }
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => changePage(i);
        pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    pagination.appendChild(nextBtn);
}

function changePage(page) {
    currentPage = page;
    renderTable();
    renderPagination();
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    filteredData = feedbackData.filter(f =>
        f.fullName.toLowerCase().includes(query) ||
        f.email.toLowerCase().includes(query) ||
        f.reason.toLowerCase().includes(query) ||
        f.type.toLowerCase().includes(query)
    );
    currentPage = 1;
    renderTable();
    renderPagination();
}

function handleSort(e) {
    const sortBy = e.target.value;
    switch (sortBy) {
        case 'date':
            filteredData.sort((a, b) => new Date(b.submissionTime) - new Date(a.submissionTime));
            break;
        case 'rating':
            filteredData.sort((a, b) => b.rating - a.rating);
            break;
        case 'type':
            filteredData.sort((a, b) => a.type.localeCompare(b.type));
            break;
        case 'name':
            filteredData.sort((a, b) => a.fullName.localeCompare(b.fullName));
            break;
    }
    renderTable();
}

function showFeedbackModal(id) {
    const feedback = feedbackData.find(f => f.id === id);
    if (!feedback) return;

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="modal-field">
            <label><strong>Full Name:</strong></label>
            <div class="value">${feedback.fullName}</div>
        </div>
        <div class="modal-field">
            <label><strong>Email:</strong></label>
            <div class="value">${feedback.email}</div>
        </div>
        <div class="modal-field">
            <label><strong>Type:</strong></label>
            <div class="value">
                <span class="badge badge-${feedback.type.toLowerCase()}">${feedback.type}</span>
            </div>
        </div>
        <div class="modal-field">
            <label><strong>Rating:</strong></label>
            <div class="value">
                ${generateStars(feedback.rating)}
                <span class="rating-number">(${feedback.rating}/5)</span>
            </div>
        </div>
        <div class="modal-field">
            <label><strong>Reason:</strong></label>
            <div class="value">${feedback.reason}</div>
        </div>
        <div class="modal-field">
            <label><strong>Submission Time:</strong></label>
            <div class="value">${formatDate(feedback.submissionTime)}</div>
        </div>
        <div class="modal-field">
            <label><strong>Full Feedback:</strong></label>
            <div class="value">${feedback.fullFeedback}</div>
        </div>
    `;

    document.getElementById('feedbackModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('feedbackModal').style.display = 'none';
}

function downloadPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(18);
        doc.text('Superadmin Feedback Report', 14, 22);
        
        // Date
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
        doc.text(`Total Records: ${filteredData.length}`, 14, 42);
        
        // Table data
        const tableData = filteredData.map(feedback => [
            feedback.fullName,
            feedback.email,
            feedback.type,
            `${feedback.rating}/5`,
            feedback.reason,
            formatDate(feedback.submissionTime)
        ]);
        
        // Create table
        doc.autoTable({
            head: [['Full Name', 'Email', 'Type', 'Rating', 'Reason', 'Submission Time']],
            body: tableData,
            startY: 50,
            styles: {
                fontSize: 8,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            }
        });
        
        // Save the PDF
        doc.save('feedback_report.pdf');
        showToast('PDF downloaded successfully!');
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showToast('Failed to generate PDF', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Make functions available globally for onclick handlers
window.showFeedbackModal = showFeedbackModal;
window.closeModal = closeModal;