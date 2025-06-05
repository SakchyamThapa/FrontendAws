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

// Constants
const API_BASE_URL = "https://backendaws.onrender.com/api";

// Global variables
let tasks = {
  'backlog': [],
  'in-progress': [],
  'review': [],
  'completed': []
};
let currentEditTaskId = null;
let draggedTask = null;

// DOM elements (will be initialized after DOM content loaded)
let taskTitleInput, taskPrioritySelect, taskDescriptionInput, taskPointsInput, taskDueDateInput;
let addTaskBtn, taskContainers;
let editTaskModal, editTaskTitleInput, editTaskDescriptionInput, editTaskPrioritySelect;
let editTaskDueDateInput, editTaskPointsInput, saveEditTaskBtn, modalCloseButtons;

// Redirect to login if not authenticated
if (!isAuthenticated()) {
  clearToken();
  window.location.href = "/index.html";
}

const token = getToken();
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("projectId");

if (!projectId) {
  alert("No project selected. Going back to Home.");
  window.location.href = "/Html/Home.html";
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
  // Insert modal HTML first
  document.body.insertAdjacentHTML('beforeend', editModalHTML);
  
  // Initialize DOM elements
  initializeDOMElements();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize page
  setDefaultDueDate();
  setupDragAndDrop();
  await loadProjectTasks();
  
  // Update navigation links with project ID
  updateNavigationLinks();
});

function initializeDOMElements() {
  // Main form elements
  taskTitleInput = document.getElementById("task-title");
  taskPrioritySelect = document.getElementById("task-priority");
  taskDescriptionInput = document.getElementById("task-description");
  taskPointsInput = document.getElementById("task-points");
  taskDueDateInput = document.getElementById("task-due-date");
  addTaskBtn = document.getElementById("add-task-btn");
  taskContainers = document.querySelectorAll(".task-container");
  
  // Edit modal elements
  editTaskModal = document.getElementById("edit-task-modal");
  editTaskTitleInput = document.getElementById("edit-task-title");
  editTaskDescriptionInput = document.getElementById("edit-task-description");
  editTaskPrioritySelect = document.getElementById("edit-task-priority");
  editTaskDueDateInput = document.getElementById("edit-task-due-date");
  editTaskPointsInput = document.getElementById("edit-task-points");
  saveEditTaskBtn = document.getElementById("save-edit-task-btn");
  modalCloseButtons = document.querySelectorAll(".modal-close, .modal-close-btn");
}

function setupEventListeners() {
  // Add task button
  addTaskBtn.addEventListener("click", createNewTask);
  
  // Edit modal event listeners
  modalCloseButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      editTaskModal.style.display = "none";
    });
  });
  
  // Close modal when clicking outside
  window.addEventListener("click", event => {
    if (event.target === editTaskModal) {
      editTaskModal.style.display = "none";
    }
  });
  
  // Save edited task button
  saveEditTaskBtn.addEventListener("click", saveEditedTask);
}

function updateNavigationLinks() {
  const currentProjectId = new URLSearchParams(window.location.search).get("projectId");
  
  document.querySelectorAll(".nav-link").forEach(link => {
    if (currentProjectId && !link.href.includes("projectId")) {
      const href = new URL(link.href);
      href.searchParams.set("projectId", currentProjectId);
      link.href = href.toString();
    }
  });
}

// Set default due date to tomorrow
function setDefaultDueDate(input = taskDueDateInput) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  input.valueAsDate = tomorrow;
}

// Refresh task status counts
function refreshTaskStatusCounts() {
  fetch(`${API_BASE_URL}/tasks/project/${projectId}/status-counts`,{
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
      const stat0 = document.getElementById("backlog-count");
      const stat1 = document.getElementById("in-progress-count");
      const stat2 = document.getElementById("review-count");
      const stat3 = document.getElementById("completed-count");

      stat0.textContent = counts.Backlog ?? 0;
      stat1.textContent = counts.InProgress ?? 0;
      stat2.textContent = counts.Review ?? 0;
      stat3.textContent = counts.Completed ?? 0;
    })
    .catch(err => console.error("Task status count refresh error:", err));
}

// Load tasks for current project
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

// Create new task
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

// Reset task form
function resetForm() {
  taskTitleInput.value = "";
  taskDescriptionInput.value = "";
  taskPointsInput.value = "10";
  setDefaultDueDate();
  taskTitleInput.focus();
}

// Render all tasks
function renderAllTasks() {
  taskContainers.forEach(c => c.innerHTML = "");
  for (const [status, list] of Object.entries(tasks)) {
    const container = document.getElementById(status);
    if (!container) {
      console.error(`❗ Container not found for status '${status}'. Check if div with id="${status}" exists.`);
      continue;
    }
    list.forEach(t => renderTask(t, container));
  }
}

// Render individual task
function renderTask(task, container) {
  if (!container) {
    console.error("❗ Cannot render task: Container not found for task:", task);
    return;
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

// Delete task
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

// Update column counters
function updateColumnCounts() {
  for (const status in tasks) {
    const countElement = document.getElementById(`${status}-count`);
    if (countElement) {
      countElement.textContent = tasks[status].length;
    }
  }
}

// Function to open edit modal with task data
function openEditTaskModal(taskId) {
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
  
  currentEditTaskId = taskId;
  
  editTaskTitleInput.value = taskToEdit.title || "";
  editTaskDescriptionInput.value = taskToEdit.description || "";
  
  const priorityNames = ["Low", "Medium", "High"];
  editTaskPrioritySelect.value = priorityNames[taskToEdit.priority] || "Medium";
  
  if (taskToEdit.dueDate) {
    const dueDate = new Date(taskToEdit.dueDate);
    const formattedDate = dueDate.toISOString().split('T')[0];
    editTaskDueDateInput.value = formattedDate;
  } else {
    setDefaultDueDate(editTaskDueDateInput);
  }
  
  editTaskPointsInput.value = taskToEdit.rewardPoints || 10;
  
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
    
    editTaskModal.style.display = "none";
    
    await loadProjectTasks();
    refreshTaskStatusCounts(); 
    currentEditTaskId = null;
  } catch (err) {
    console.error("Error updating task:", err);
    alert("Failed to update task: " + err.message);
  }
}

// Complete task function (referenced in renderTask but not defined in original)
async function completeTask(taskId) {
  const payload = [{
    taskId: parseInt(taskId),
    newStatus: 3 // Completed status
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
    console.error("Error completing task:", err);
  }
}

// Drag and drop functions
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

function handleDragStart(e) {
  draggedTask = this;
  this.classList.add("dragging");
  e.dataTransfer.setData("text/plain", this.getAttribute("data-id"));
}

function handleDragEnd() {
  this.classList.remove("dragging");
}

// Handle drop and update status
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
// Chat UI elements
const chatToggleBtn = document.getElementById("chat-toggle-btn");
const chatContainer = document.getElementById("chat-container");
const chatCloseBtn = document.getElementById("chat-close-btn");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSendBtn = document.getElementById("chat-send-btn");

// Chat event listeners
chatToggleBtn.addEventListener("click", () => chatContainer.classList.toggle("hidden"));
chatCloseBtn.addEventListener("click", () => chatContainer.classList.add("hidden"));

chatSendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage(message, 'user');
  chatInput.value = '';

  appendMessage("Loading...", 'assistant');

  try {
    const res = await fetch(`${API_BASE_URL}/tasks/assistant?projectId=${projectId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    updateLastAssistantMessage(data.reply);
  } catch (error) {
    updateLastAssistantMessage(`Error: ${error.message}`);
  }
}

function appendMessage(text, role) {
  const msgEl = document.createElement('div');
  msgEl.classList.add('message', role);
  msgEl.textContent = text;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateLastAssistantMessage(text) {
  const lastMsg = chatMessages.querySelector('.message.assistant:last-child');
  if (lastMsg) lastMsg.textContent = text;
}
