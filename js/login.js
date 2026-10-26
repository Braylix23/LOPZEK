const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document
        .getElementById("username")
        .value.trim()
        .toLowerCase();

    const password = document.getElementById("password").value;

    if (!username || !password) {
        loginMessage.textContent = "Completa ambos campos.";
        return;
    }

    loginMessage.textContent = "Verificando acceso...";

    try {
        if (!window.supabase) {
            throw new Error("No se pudo cargar el servicio de acceso.");
        }

        const { data, error } = await supabaseClient.auth
            .signInWithPassword({
                email: `${username}@users.lopzek.com`,
                password: password
            });

        if (error) {
            throw error;
        }

        if (!data.session) {
            throw new Error("No se pudo iniciar la sesión.");
        }

        window.location.href = "index.html";
    } catch (error) {
        console.error("Error de acceso:", error);
        loginMessage.textContent =
            "No se pudo iniciar sesión. Revisa tu usuario y contraseña.";
    }
});

}
