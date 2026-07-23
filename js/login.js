import { supabase } from "./supabase.js";

const form = document.getElementById("loginForm");
const button = document.getElementById("loginBtn");
const message = document.getElementById("loginMessage");

const { data: existingSession } = await supabase.auth.getSession();
if (existingSession.session) {
    window.location.replace("dashboard.html");
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    button.disabled = true;
    button.textContent = "Signing in...";
    message.textContent = "";

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        message.textContent = error.message;
        message.dataset.type = "error";
        button.disabled = false;
        button.textContent = "Login";
        return;
    }

    window.location.replace("dashboard.html");
});
