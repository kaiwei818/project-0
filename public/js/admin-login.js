// Sends the username and password to the API. If it is right, the server sets the session
// cookie and we go to the dashboard. The cookie itself is invisible to this code.

const form = document.getElementById("login-form");
const error = document.getElementById("error");
const button = form.querySelector("button");

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser's default full-page form submit
  error.textContent = "";
  button.disabled = true;

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username.value, password: form.password.value }),
    });

    if (response.ok) {
      location.href = "/admin/";
      return;
    }
    const data = await response.json().catch(() => ({}));
    error.textContent = data.error || "Login failed.";
    form.password.select();
  } catch {
    error.textContent = "Could not reach the server.";
  } finally {
    button.disabled = false;
  }
});
