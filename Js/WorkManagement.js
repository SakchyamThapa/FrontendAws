import {
  getToken,
  storeToken,
  isAuthenticated,
  clearToken,
  getUserRole,
  hasRole,
  getTokenClaim
} from './sessionStorage.js';
const editModalHTML = `
  <div id="edit-task-modal" class="modal">
    <div class="modal-content glass-panel">
      <div class="modal-header">
        <h3><i class="fas fa-edit"></i> Edit Task</h3>
        <span class="modal-close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="edit-task-title">Title</label>
          <input type="text" id="edit-task-title" class="form-control" placeholder="Task title..." />
        </div>
        <div class="form-group">
          <label for="edit-task-description">Description</label>
          <textarea id="edit-task-description" class="form-control" placeholder="Task description..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="edit-task-priority">Priority</label>
            <select id="edit-task-priority" class="form-control">
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>
          <div class="form-group">
            <label for="edit-task-due-date">Due Date</label>
            <input type="date" id="edit-task-due-date" class="form-control" />
          </div>
          <div class="form-group">
            <label for="edit-task-points">Points</label>
            <input type="number" id="edit-task-points" class="form-control" placeholder="Reward points..." min="0" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary modal-close-btn">Cancel</button>
        <button id="save-edit-task-btn" class="btn btn-primary">Save Changes</button>
      </div>
    </div>
  </div>`;
// ✅ Redirect to login if not authenticated
if (!isAuthenticated()) {
  clearToken();
  window.location.href = "/index.html";
}

const token = getToken(); // 

const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("projectId");

if (!projectId) {
  alert("No project selected. Going back to Home.");
  window.location.href = "/Html/Home.html";
}

document.body.insertAdjacentHTML('beforeend', editModalHTML);
 function refreshTaskStatusCounts() {
    fetch(`https://localhost:7150/api/tasks/project/${projectId}/status-counts`, {
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
        cards[0].querySelector(".stat-value").textContent = counts.Backlog;
        cards[1].querySelector(".stat-value").textContent = counts.InProgress;
        cards[2].querySelector(".stat-value").textContent = counts.Review;
        cards[3].querySelector(".stat-value").textContent = counts.Completed;
      })
      .catch(err => console.error("Task status count refresh error:", err));
  }
const API_BASE_URL = "https://localhost:7150/api";

// ✅ DOM Elements
const taskTitleInput = document.getElementById("task-title");
const taskPrioritySelect = document.getElementById("task-priority");
const taskDescriptionInput = document.getElementById("task-description");
const taskPointsInput = document.getElementById("task-points");
const taskDueDateInput = document.getElementById("task-due-date");
const addTaskBtn = document.getElementById("add-task-btn");
const taskContainers = document.querySelectorAll(".task-container");

let currentEditTaskId = null;

const editTaskModal = document.getElementById("edit-task-modal");
const editTaskTitleInput = document.getElementById("edit-task-title");
const editTaskDescriptionInput = document.getElementById("edit-task-description");
const editTaskPrioritySelect = document.getElementById("edit-task-priority");
const editTaskDueDateInput = document.getElementById("edit-task-due-date");
const editTaskPointsInput = document.getElementById("edit-task-points");
const saveEditTaskBtn = document.getElementById("save-edit-task-btn");
const modalCloseButtons = document.querySelectorAll(".modal-close, .modal-close-btn");
modalCloseButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    editTaskModal.style.display = "none";
  });
});

// Close modal when clicking outside of it
window.addEventListener("click", event => {
  if (event.target === editTaskModal) {
    editTaskModal.style.display = "none";
  }
});

// Save edited task button
saveEditTaskBtn.addEventListener("click", saveEditedTask);

// Function to open edit modal with task data
function openEditTaskModal(taskId) {
  // Find the task by ID across all status categories
  let taskToEdit = null;
  
  for (const status in tasks) {
    const found = tasks[status].find(t => t.id === taskId);
    if (found) {
      taskToEdit = found;
      break;
    }
  }
  
  if (!taskToEdit) {
    console.error("Task not found for editing:", taskId);
    return;
  }
  
  // Store the current task ID for use when saving
  currentEditTaskId = taskId;
  
  // Fill in the form fields with task data
  editTaskTitleInput.value = taskToEdit.title || "";
  editTaskDescriptionInput.value = taskToEdit.description || "";
  
  // Set priority dropdown
  const priorityNames = ["Low", "Medium", "High"];
  editTaskPrioritySelect.value = priorityNames[taskToEdit.priority] || "Medium";
  
  // Set due date
  if (taskToEdit.dueDate) {
    const dueDate = new Date(taskToEdit.dueDate);
    const formattedDate = dueDate.toISOString().split('T')[0];
    editTaskDueDateInput.value = formattedDate;
  } else {
    setDefaultDueDate(editTaskDueDateInput);
  }
  
  // Set points
  editTaskPointsInput.value = taskToEdit.rewardPoints || 10;
  
  // Show the modal
  editTaskModal.style.display = "block";
}

// Function to save edited task
async function saveEditedTask() {
  if (!currentEditTaskId) return;
  
  const title = editTaskTitleInput.value.trim();
  const description = editTaskDescriptionInput.value.trim();
  const priorityMap = { "Low": 0, "Medium": 1, "High": 2 };
  const priority = priorityMap[editTaskPrioritySelect.value];
  const points = parseInt(editTaskPointsInput.value) || 0;
  const dueDateRaw = editTaskDueDateInput.value;
  
  if (!title) {
    alert("Task title is required.");
    return;
  }
  
  if (!dueDateRaw) {
    alert("Please select a due date.");
    return;
  }
  
  const dueDate = new Date(dueDateRaw).toISOString();
  
  const payload = {
    title,
    description,
    priority,
    rewardPoints: points,
    dueDate
  };
  
  try {
    const res = await fetch(`${API_BASE_URL}/tasks/${currentEditTaskId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Failed to update task: " + errorText);
    }
    
    // Close modal
    editTaskModal.style.display = "none";
    
    // Reload tasks to refresh the UI
    await loadProjectTasks();
    refreshTaskStatusCounts(); 
    currentEditTaskId = null;
  } catch (err) {
    console.error("Error updating task:", err);
    alert("Failed to update task: " + err.message);
  }
}
let tasks = {
  'backlog': [],
  'in-progress': [],
  'review': [],
  'completed': []
};

document.addEventListener("DOMContentLoaded", async () => {
  setDefaultDueDate();
  addTaskBtn.addEventListener("click", createNewTask);
  setupDragAndDrop();
  await loadProjectTasks();
  const currentProjectId = new URLSearchParams(window.location.search).get("projectId");

document.querySelectorAll(".nav-link").forEach(link => {
  if (currentProjectId && !link.href.includes("projectId")) {
    const href = new URL(link.href);
    href.searchParams.set("projectId", currentProjectId);
    link.href = href.toString();
  }
});

});

// ✅ Set default due date to tomorrow
function setDefaultDueDate(input = taskDueDateInput) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  input.valueAsDate = tomorrow;
}


// ✅ Load tasks for current project
async function loadProjectTasks() {
  try {
    const res = await fetch(`${API_BASE_URL}/tasks/project/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch tasks");

    const rawData = await res.json();
    const taskList = Array.isArray(rawData) ? rawData : (rawData.$values || []);
  

    tasks = { 'backlog': [], 'in-progress': [], 'review': [], 'completed': [] };

    const allowedStatus = ['backlog', 'in-progress', 'review', 'completed'];

    taskList.forEach(t => {
      const rawStatus = t.status?.toString() || "";
      const statusKey = rawStatus.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

      if (!allowedStatus.includes(statusKey)) {
        console.warn(`⚠️ Ignoring unknown task status: ${statusKey}`, t);
        return;
      }
      tasks[statusKey].push(t);
    });

    renderAllTasks();
    refreshTaskStatusCounts();
    updateColumnCounts();
  } catch (err) {
    console.error("Failed to load tasks:", err);
    alert("Error loading tasks.");
  }
}




// ✅ Create new task
async function createNewTask() {
  const title = taskTitleInput.value.trim();
  const description = taskDescriptionInput.value.trim();
  const priorityMap = { "Low": 0, "Medium": 1, "High": 2 };
  const priority = priorityMap[taskPrioritySelect.value];
  const points = parseInt(taskPointsInput.value) || 0;
  const dueDateRaw = taskDueDateInput.value;

  if (!title) return alert("Task title is required.");
  if (!dueDateRaw) return alert("Please select a due date.");

  const dueDate = new Date(dueDateRaw).toISOString();
  const payload = {
    title,
    description,
    priority,
    projectId: parseInt(projectId),
    rewardPoints: points,
    dueDate
  };

  try {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Failed to create task: " + errorText);
    }

    const created = await res.json();
    tasks.backlog.push(created);
    renderTask(created, document.getElementById("backlog"));
    updateColumnCounts();
    refreshTaskStatusCounts();

    resetForm();
  } catch (err) {
    console.error("Error creating task:", err);
    alert("Failed to create task.");
  }
}




// ✅ Reset task form
function resetForm() {
  taskTitleInput.value = "";
  taskDescriptionInput.value = "";
  taskPointsInput.value = "10";
  setDefaultDueDate();
  taskTitleInput.focus();
}

// ✅ Render all tasks
function renderAllTasks() {
  taskContainers.forEach(c => c.innerHTML = "");
  for (const [status, list] of Object.entries(tasks)) {
    const container = document.getElementById(status);
    if (!container) {
      console.error(`❗ Container not found for status '${status}'. Check if div with id="${status}" exists.`);
      continue; // Skip rendering this group safely
    }
    list.forEach(t => renderTask(t, container));
  }
}
function setupDragAndDrop() {
  taskContainers.forEach(c => {
    c.addEventListener("dragover", e => {
      e.preventDefault();
      c.classList.add("drag-over");
    });
    c.addEventListener("dragleave", e => {
      c.classList.remove("drag-over");
    });
    c.addEventListener("drop", handleDrop);
  });
}


// ✅ Render individual task
function renderTask(task, container) {
  if (!container) {
    console.error("❗ Cannot render task: Container not found for task:", task);
    return; // Exit safely without crashing
  }

  const el = document.createElement("div");
  el.className = "task glass-card";
  el.setAttribute("draggable", "true");
  el.setAttribute("data-id", task.id);

  const priorityNames = ["Low", "Medium", "High"];
  const priorityName = priorityNames[task.priority] || "Medium";

  const points = `<div class="task-points"><i class="fas fa-star"></i> ${task.rewardPoints} points</div>`;
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const dueHtml = `<div class="task-due-date ${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar-alt"></i> ${dueDate.toLocaleDateString()}</div>`;

  el.innerHTML = `
  <div class="task-header">
    <h4 class="task-title">${task.title}</h4>
    <div class="task-actions">
      <button class="btn-edit"><i class="fas fa-edit"></i></button>
      <button class="btn-delete"><i class="fas fa-trash"></i></button>
    </div>
  </div>
  <div class="task-info">
    <div class="task-priority priority-${priorityName.toLowerCase()}">${priorityName} Priority</div>
    ${points}
  </div>
  ${dueHtml}
  <div class="task-description">${task.description || ""}</div>
`;

const status = typeof task.status === 'number' ? task.status : parseInt(task.status);

if (status === 2) { // 2 = Review
  const completeBtn = document.createElement("button");
  completeBtn.className = "btn-complete";
  completeBtn.innerHTML = `<i class="fas fa-check"></i> Complete`;
  completeBtn.addEventListener("click", () => completeTask(task.id));
  el.querySelector(".task-actions").appendChild(completeBtn);
}

// Add event listeners
el.querySelector(".btn-delete").addEventListener("click", () => deleteTask(task.id, el));
el.querySelector(".btn-edit").addEventListener("click", () => openEditTaskModal(task.id));
el.addEventListener("dragstart", handleDragStart);
el.addEventListener("dragend", handleDragEnd);

container.appendChild(el);
}



// ✅ Delete task
async function deleteTask(id, el) {
  if (!confirm("Delete this task?")) return;
  try {
    await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    el.remove();
    await loadProjectTasks();
    refreshTaskStatusCounts(); 

  } catch (err) {
    console.error("Error deleting task:", err);
  }
}

// ✅ Update column counters
function updateColumnCounts() {
  for (const status in tasks) {
    document.getElementById(`${status}-count`).textContent = tasks[status].length;
  }
}



let draggedTask = null;

function handleDragStart(e) {
  draggedTask = this;
  this.classList.add("dragging");
  e.dataTransfer.setData("text/plain", this.getAttribute("data-id"));
}

function handleDragEnd() {
  this.classList.remove("dragging");
}

// ✅ Handle drop and update status
async function handleDrop(e) {
  e.preventDefault();
  this.classList.remove("drag-over");

  const taskId = e.dataTransfer.getData("text/plain");
  const targetColumnId = this.id;

  const reverseStatusMap = {
    'backlog': 0,
    'in-progress': 1,
    'review': 2,
    'completed': 3
  };

  const newStatus = reverseStatusMap[targetColumnId];
  const payload = [{
    taskId: parseInt(taskId),
    newStatus: newStatus
  }];

  try {
    const response = await fetch(`${API_BASE_URL}/tasks/reorder`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    await loadProjectTasks(); 
    refreshTaskStatusCounts(); 

  } catch (err) {
    console.error("Error updating task status:", err);
  }
}


