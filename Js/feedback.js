import { getToken } from './sessionStorage.js';

document.addEventListener("DOMContentLoaded", function () {
  const token = getToken();
  const projectId = sessionStorage.getItem("deleteProjectId");
  const feedbackForm = document.getElementById("feedbackForm");

  if (!token) {
    alert("⚠️ You are not logged in. Redirecting to login...");
    window.location.href = "/Html/Login.html"; // Adjust path if needed
    return;
  }

  if (!projectId) {
    alert("⚠️ Project not found. Redirecting...");
    window.location.href = "/Html/Home.html";
    return;
  }

  feedbackForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const comment = document.getElementById("comment").value.trim();
    const type = document.querySelector("input[name='type']:checked")?.value || "General";
    const ratingText = document.querySelector(".rating-icon.active")?.id?.replace("Rating", "") || "meh";

    const ratingMap = {
      meh: 1,
      smile: 2,
      happy: 3
    };
    const rating = ratingMap[ratingText] ?? 1;

    if (!name || !email || !comment) {
      alert("⚠️ Please fill in all fields.");
      return;
    }

    try {
      const response = await fetch(`https://backendaws.onrender.com/api/feedback/submit/${projectId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName: name,
          email: email,
          type: type,
          rating: rating,
          reason: comment  
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      alert("✅ Feedback submitted and project deleted.");
      sessionStorage.removeItem("deleteProjectId");
      window.location.href = "/Html/Home.html";
    } catch (err) {
      console.error("❌ Submission error:", err);
      alert("❌ Something went wrong. Please try again.");
    }
  });
});

// For rating icon clicks
window.rate = function (type) {
  document.querySelectorAll(".rating-icon").forEach(icon => {
    icon.classList.remove("active");
  });

  const selected = document.getElementById(type + "Rating");
  if (selected) {
    selected.classList.add("active");
  }
};
