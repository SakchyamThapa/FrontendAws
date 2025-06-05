import { getToken, isAuthenticated, clearToken } from './sessionStorage.js';

// Extract projectId from URL once
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get("projectId");

if (!projectId) {
  alert("No project selected. Going back to Home.");
  window.location.href = "/Html/Home.html";
}

if (!isAuthenticated()) {
  clearToken();
  window.location.href = "/index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  //  Append projectId to all navigation links that don't have it
  document.querySelectorAll(".nav-link").forEach(link => {
    if (projectId && !link.href.includes("projectId")) {
      const href = new URL(link.getAttribute("href"), window.location.origin);
      href.searchParams.set("projectId", projectId);
      link.href = href.toString();
    }
  });

  // Also update dropdown redeem link
  const redeemLink = document.getElementById("redeem-link");
  if (redeemLink && projectId) {
    redeemLink.href = `/Html/Redeem.html?projectId=${projectId}`;
  }

  // And navbar redeem link
  const navbarRedeemLink = document.getElementById("navbar-redeem-link");
  if (navbarRedeemLink && projectId) {
    navbarRedeemLink.href = `/Html/Redeem.html?projectId=${projectId}`;
  }

  document.getElementById("project-header").textContent = `Top Players – Project ${projectId}`;
  
  fetchLeaderboard(projectId);
  fetchUserPoints(projectId); // Placeholder – customize if needed
  setupLogout();
});

async function fetchUserPoints(projectId) {
  const token = getToken();
  try {
    const response = await fetch(`https://backendaws.onrender.com/api/redeemableitems/points/${projectId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user points");
    }

    const data = await response.json();
    updateUserPoints(data.points);
  } catch (error) {
    console.error("Error fetching user points:", error.message);
    updateUserPoints(0); // fallback
  }
}

// 🔐 Fetch leaderboard data
async function fetchLeaderboard(projectId, page = 1, size = 20) {
  const token = getToken();
  try {
    const response = await fetch(`https://backendaws.onrender.com/api/leaderboard/${projectId}?pageNumber=${page}&pageSize=${size}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (response.status === 401) {
      clearToken();
      return window.location.href = "/index.html";
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${errorText}`);
    }

    const data = await response.json();
    populateLeaderboard(data);
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error.message);
    alert("Could not load leaderboard. Try again later.");
  }
}

//  Render leaderboard table
function populateLeaderboard(data) {
  const leaderboardTable = document.getElementById("leaderboard-data");
  leaderboardTable.innerHTML = "";

  if (!data.length) {
    leaderboardTable.innerHTML = `<tr><td colspan="3">No data available.</td></tr>`;
    return;
  }

  data.forEach((player) => {
    leaderboardTable.innerHTML += `
      <tr>
        <td>${player.leaderboardRank}</td>
        <td>${player.userName}</td>
        <td>${player.pointsEarned}</td>
      </tr>
    `;
  });
}

// 🟡 Update user points display
function updateUserPoints(points) {
  document.getElementById("user-points").textContent = `Your Points: ${points}`;
}

// 🚪 Logout
function setupLogout() {
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) {
    logoutLink.addEventListener("click", () => {
      clearToken();
      window.location.href = "/index.html";
    });
  }
}
