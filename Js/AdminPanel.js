import {
    getToken,
    storeToken,
    isAuthenticated,
    clearToken,
    getUserRole,
    hasRole,
    getTokenClaim
  } from './sessionStorage.js';
  
  // ✅ Redirect to login if not authenticated
  if (!isAuthenticated()) {
    clearToken();
    window.location.href = "/index.html";
  }
  
  const token = getToken();
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("projectId");
  const API_BASE_URL = "https://backendaws.onrender.com";
  if (!projectId) {
    alert("No project selected. Going back to Home.");
    window.location.href = "/Html/Home.html";
  }
  
  (async function checkUserAccess() {
    try {
       const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/my-role`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (!res.ok) throw new Error("Unauthorized");
  
      const data = await res.json();
      const allowedRoles = ["Admin", "Manager"]; //  Only Admin and Manager allowed
  
      if (!allowedRoles.includes(data.role)) {
        alert("Access Denied: You do not have permission to view this page.");
        window.location.href = `/Html/WorkManagement.html?projectId=${projectId}`;
      }
    } catch (err) {
      console.error("Access check failed:", err);
      alert("Access check failed. Redirecting...");
      window.location.href = `/Html/WorkManagement.html?projectId=${projectId}`;
    }
  })();
  
  document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("confirmModal");
    const confirmActionBtn = document.getElementById("confirmAction");
    const cancelActionBtn = document.getElementById("cancelAction");
    const modalMessage = document.getElementById("modalMessage");
    const currentProjectId = new URLSearchParams(window.location.search).get("projectId");

    // Update navigation links with projectId
    document.querySelectorAll(".nav-link").forEach(link => {
      if (currentProjectId && !link.href.includes("projectId")) {
        const href = new URL(link.href);
        href.searchParams.set("projectId", currentProjectId);
        link.href = href.toString();
      }
    });
    
    let pendingAction = null;
    let pendingParams = null;
  
    // Modal event listeners
    cancelActionBtn.addEventListener("click", () => {
      modal.style.display = "none";
      pendingAction = null;
    });
  
    confirmActionBtn.addEventListener("click", () => {
      if (pendingAction && typeof window[pendingAction] === "function") {
        window[pendingAction](pendingParams);
      }
      modal.style.display = "none";
    });
  
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
        pendingAction = null;
      }
    });
  
    // Global confirmation function
    window.showConfirmation = function (message, action, params) {
      modalMessage.textContent = message;
      pendingAction = action;
      pendingParams = params;
      modal.style.display = "block";
    };
  
    //  RESET KPI
    window.resetKPI = function (params) {
       fetch(`${API_BASE_URL}/api/projects/${projectId}/reset-kpi/${params.id}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "KPI reset successfully.");
          location.reload();
        })
        .catch(err => console.error("Reset KPI error:", err));
    };

    // Load users function
    function loadUsers() {
       fetch(`${API_BASE_URL}/api/projects/${projectId}/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(users => {
        const tbody = document.getElementById("userTableBody");
        tbody.innerHTML = "";

        users.forEach(user => {
          
          if (user.role === "Admin") return;

          const row = document.createElement("tr");

          // Use roleCell for conditional role rendering
          let roleCell = "";
          if (user.role === "Admin") {
            roleCell = `<td><span class="badge badge-info">${user.role}</span></td>`;
          } else {
            roleCell = `
              <td>
                <select onchange="changeUserRole('${user.id}', this.value)" class="form-control form-select">
                  <option value="Member" ${user.role === "Member" ? "selected" : ""}>Member</option>
                  <option value="Checker" ${user.role === "Checker" ? "selected" : ""}>Checker</option>
                  <option value="Manager" ${user.role === "Manager" ? "selected" : ""}>Manager</option>
                  <option value="Admin" ${user.role === "Admin" ? "selected" : ""}>Admin</option>
                </select>
              </td>`;
          }

          //   Insert roleCell into row HTML
          row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            ${roleCell}
            <td>${user.kpiPoints ?? 0}</td>
            <td>
              <div class="action-buttons">
                <button onclick="showConfirmation('Are you sure you want to reset KPI?', 'resetKPI', { id: '${user.id}' })" class="btn btn-sm btn-danger">
                  <i class="fas fa-redo-alt"></i> Reset KPI
                </button>
                <button onclick="showConfirmation('Are you sure you want to remove ${user.name}?', 'removeUserConfirmed', { id: '${user.id}', name: '${user.name}' })" class="btn btn-sm btn-remove">
                  <i class="fas fa-trash-alt"></i> Remove
                </button>
              </div>
            </td>
          `;

          tbody.appendChild(row);
        });
      })
      .catch(err => console.error("Load users error:", err));
    }

    // Remove user functions
    window.removeUser = function (userId, userName, confirmed = false) {
      if (!confirmed) {
        showConfirmation(`Are you sure you want to remove ${userName}?`, "removeUserConfirmed", { id: userId, name: userName });
        return;
      }

       fetch(`${API_BASE_URL}/api/projects/${projectId}/remove-user/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to remove user');
          return res.text();
        })
        .then(msg => {
          alert(msg || "User removed successfully.");
          loadUsers(); 
          loadTaskStatusCounts();
        })
        .catch(err => console.error("Remove user error:", err));
    };
    
    window.removeUserConfirmed = function (params) {
      removeUser(params.id, params.name, true);
    };

    // Change user role function
    window.changeUserRole = function (userId, newRole) {
      if (!confirm(`Change role of user to ${newRole}?`)) return;
    
      fetch(`${API_BASE_URL}/api/projects/${projectId}/change-role`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetUserId: userId,
          newRole: newRole
        })
      })
      .then(res => {
        if (!res.ok) throw new Error("Failed to change role");
        return res.text();
      })
      .then(msg => {
        alert(msg || "Role updated successfully.");
        setTimeout(() => loadUsers(), 100);  // wait 100ms
      })
      .catch(err => {
        console.error("Error changing role:", err);
        alert("Error updating role.");
      });
    };
    
    // ✅ ADD USER
    const addUserForm = document.getElementById("addUserForm");
    if (addUserForm) {
      addUserForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.getElementById("userName").value.trim();
      
        if (!email.includes("@")) {
          alert("Enter a valid email.");
          return;
        }
      
        fetch(`${API_BASE_URL}/api/projects/${projectId}/add-user`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(email)
        })
          .then(res => res.text())
          .then(msg => {
            alert(msg || "User added successfully.");
            location.reload();
          })
          .catch(err => console.error("Add user error:", err));
      });
    }
    
    // Load task status counts
    function loadTaskStatusCounts() {
     fetch(`${API_BASE_URL}/api/tasks/project/${projectId}/status-counts`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      .then(async res => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText);
        }
        return res.json();
      })
      .then(counts => {
        const cards = document.querySelectorAll(".stat-card");
        if (cards.length < 4) {
          console.warn("Stat cards not found or incomplete.");
          return;
        }
        cards[0].querySelector(".stat-value").textContent = counts.Backlog ?? 0;
        cards[1].querySelector(".stat-value").textContent = counts.InProgress ?? 0;
        cards[2].querySelector(".stat-value").textContent = counts.Review ?? 0;
        cards[3].querySelector(".stat-value").textContent = counts.Completed ?? 0;
      })
      .catch(err => console.error("Task overview fetch error:", err));
    }
   
    // ✅ Navigation Highlight
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function () {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // Initialize data loading
    loadUsers();
    loadTaskStatusCounts();
  });

  // Form toggle functionality
  document.addEventListener('DOMContentLoaded', function() {
    const showFormBtn = document.getElementById('showAddItemFormBtn');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const itemForm = document.getElementById('addItemForm');
    
    if (showFormBtn && closeFormBtn && itemForm) {
      // Show form when button is clicked
      showFormBtn.addEventListener('click', function() {
        itemForm.style.display = 'block';
      });
      
      // Hide form when close button is clicked
      closeFormBtn.addEventListener('click', function(e) {
        e.preventDefault();
        itemForm.style.display = 'none';
      });
      
      // Handle form submission
      const redeemableItemForm = document.getElementById('redeemableItemForm');
      if (redeemableItemForm) {
        redeemableItemForm.addEventListener('submit', function(e) {
          e.preventDefault();
          
          const hiddenProjectIdField = document.getElementById("hiddenProjectId");
          if (hiddenProjectIdField) {
            hiddenProjectIdField.value = projectId;
          }

          const formData = new FormData(this);
          
          // Validate file size
          const imageFile = document.getElementById('itemImage').files[0];
          if (imageFile && imageFile.size > 2 * 1024 * 1024) {
            alert('Image file is too large. Maximum size is 2MB.');
            return;
          }
          
          fetch(`${API_BASE_URL}/api/redeemableitems/CreateRedeemableItem`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to create item');
            }
            return response.json();
          })
          .then(data => {
            alert('Item added successfully!');
            redeemableItemForm.reset();
            itemForm.style.display = 'none';
            loadRedeemableItems();
          })
          .catch(error => {
            console.error('Error adding item:', error);
            alert('Failed to add item. Please try again.');
          });
        });
      }
      
      // Load redeemable items initially
      loadRedeemableItems();
    }
  });

  // Function to load redeemable items
  function loadRedeemableItems() {
    const tableBody = document.getElementById('redeemableItemsTableBody');
    if (!tableBody) return;

    fetch(`${API_BASE_URL}/api/redeemableitems/project/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(items => {
      tableBody.innerHTML = '';

      if (items.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="4" style="text-align: center;">No redeemable items found.</td>
        `;
        tableBody.appendChild(row);
        return;
      }

      items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <img src="${item.imageUrl || '/api/placeholder/40/40'}"
                 alt="${item.name}" 
                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
          </td>
          <td>${item.name}</td>
          <td>${item.cost} points</td>
          <td>
            <div class="action-buttons">
              <button onclick="editRedeemableItem('${item.id}')" class="btn btn-sm btn-primary">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button onclick="deleteRedeemableItem('${item.id}')" class="btn btn-sm btn-remove">
                <i class="fas fa-trash-alt"></i> Delete
              </button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch(error => {
      console.error('Error loading items:', error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--danger);">
            Failed to load redeemable items. Please refresh the page.
          </td>
        </tr>
      `;
    });
  }

  // Functions for edit and delete operations
  window.editRedeemableItem = function(itemId) {
    // Implement edit functionality
    alert('Edit functionality for item: ' + itemId);
  };

  window.deleteRedeemableItem = function(itemId) {
    if (confirm('Are you sure you want to delete this item?')) {
      fetch(`${API_BASE_URL}/api/redeemableitems/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to delete item');
        }
        alert('Item deleted successfully!');
        loadRedeemableItems();
      })
      .catch(error => {
        console.error('Error deleting item:', error);
        alert('Failed to delete item. Please try again.');
      });
    }
  };

  // Progress chart functionality
  document.addEventListener('DOMContentLoaded', function() {
    const progressChartCanvas = document.getElementById('progressChart');
    const loadingElement = document.getElementById('chart-loading');
    const errorElement = document.getElementById('chart-error');
    const noDataElement = document.getElementById('chart-no-data');
    
    if (!progressChartCanvas) return; // Exit if chart element doesn't exist

    let progressChart;
    
    // Fetch progress trend data
   fetch(`${API_BASE_URL}/api/tasks/project/${projectId}/progress-trend`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }
      return response.json();
    })
    .then(data => {
      if (loadingElement) loadingElement.style.display = 'none';
      
      if (data.length === 0) {
        if (noDataElement) noDataElement.style.display = 'block';
        return;
      }
      
      // Format dates for display
      const chartData = {
        labels: data.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: 'Tasks Completed',
          data: data.map(item => item.count),
          backgroundColor: 'rgba(255, 165, 0, 0.2)',
          borderColor: 'rgba(255, 165, 0, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(255, 165, 0, 1)',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3
        }]
      };
      
      // Configure and create chart
      const chartConfig = {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                precision: 0
              },
              title: {
                display: true,
                text: 'Tasks Completed'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date'
              }
            }
          },
          plugins: {
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              callbacks: {
                label: function(context) {
                  return `Completed: ${context.parsed.y} tasks`;
                }
              }
            },
            legend: {
              display: false
            }
          }
        }
      };
      
      // Show chart
      progressChartCanvas.style.display = 'block';
      progressChart = new Chart(progressChartCanvas, chartConfig);
    })
    .catch(error => {
      console.error('Error loading progress chart:', error);
      if (loadingElement) loadingElement.style.display = 'none';
      if (errorElement) {
        errorElement.textContent = 'Failed to load chart data';
        errorElement.style.display = 'block';
      }
    });
  });

  // Delete project function
  function confirmDeleteProject() {
  if (!confirm("Are you sure you want to delete this project? You will be redirected to submit feedback.")) return;

  // Save projectId in session storage to use in feedback.html
  sessionStorage.setItem("deleteProjectId", projectId);

  // Redirect to feedback page (which must include a form)
  window.location.href = `/Html/feedback.html?projectId=${projectId}`;
}
 function redirectToFeedbackForm() {
    const projectId = new URLSearchParams(window.location.search).get("projectId");
    if (!projectId) {
      alert("No project selected. Redirecting to home...");
      window.location.href = "/Html/Home.html";
      return;
    }
    sessionStorage.setItem("deleteProjectId", projectId);
    window.location.href = `/Html/feedback.html?projectId=${projectId}`;
  }

window.confirmDeleteProject = confirmDeleteProject;
// Generate project report
function generateProjectReport() {
  fetch(`${API_BASE_URL}/api/reports/project/${projectId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => {
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
  })
  .then(data => {
    alert('Project report generated successfully!');

    const reportCard = document.getElementById('generatedReportCard');
    const reportContent = document.getElementById('reportContent');

    if (reportCard && reportContent) {
      reportContent.textContent = data.report;
      reportCard.style.display = 'block';
    }
  })
  .catch(err => {
    console.error("Report generation error:", err);
    alert("Error generating project report.");
  });
}

function downloadAllReportsPdf() {
  fetch(`${API_BASE_URL}/api/reports/project/${projectId}/download-all-reports`,  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(async res => {
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      let errorMessage = "Failed to download PDF";

      if (contentType.includes("application/json")) {
        const json = await res.json();
        errorMessage += `: ${json.message || json.error || "Unknown server error"}`;
        console.error("Backend error:", json);
      } else {
        const text = await res.text();
        errorMessage += `: ${text}`;
        console.error("Raw response:", text);
      }

      throw new Error(errorMessage);
    }

    
    if (contentType.includes("application/pdf")) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project_${projectId}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      throw new Error("Unexpected response type. Expected PDF.");
    }
  })
  .catch(err => {
    console.error("PDF download error:", err);
    alert(err.message || "An error occurred while downloading the report.");
  });
}

window.generateProjectReport = generateProjectReport;
window.downloadAllReportsPdf = downloadAllReportsPdf;
window.redirectToFeedbackForm = redirectToFeedbackForm;
