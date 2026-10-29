
document.addEventListener("DOMContentLoaded", () => {
    const welcomeScreen = document.getElementById("welcomeScreen");
    const loginScreen = document.getElementById("loginScreen");
    const mainApp = document.getElementById("mainApp");

    const enterButton = document.getElementById("enterPlatform");

    
    // Cerrar sesión de LOPZEK.
    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) throw error;

            localStorage.removeItem("lopzek_user_id");

            mainApp.hidden = true;
            loginScreen.hidden = true;
            welcomeScreen.hidden = false;

            loginForm.reset();
            loginMessage.textContent = "";
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No se pudo cerrar la sesión. Inténtalo nuevamente.");
        } finally {
            logoutButton.disabled = false;
        }
    });

    const backButton = document.getElementById("backToWelcome");
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (
        !welcomeScreen ||
        !loginScreen ||
        !mainApp ||
        !enterButton ||
        !backButton ||
        !loginForm ||
        !loginMessage
    ) {
        console.error("No se encontraron las pantallas de acceso.");
        return;
    }

    // Mostrar el formulario después de la bienvenida.
    enterButton.addEventListener("click", () => {
        welcomeScreen.hidden = true;
        loginScreen.hidden = false;
        mainApp.hidden = true;
    });

    // Volver a la pantalla de bienvenida.
    backButton.addEventListener("click", () => {
        loginScreen.hidden = true;
        welcomeScreen.hidden = false;
        mainApp.hidden = true;
        loginMessage.textContent = "";
    });

    // Comprobar si ya existe una sesión de Supabase.
    
async function checkSession() {
    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        if (data.session) {
            // Ya existe una sesión: entrar directamente.
            welcomeScreen.hidden = true;
            loginScreen.hidden = true;
            mainApp.hidden = false;

            localStorage.setItem(
                "lopzek_user_id",
                data.session.user.id
            );
        } else {
            // No hay sesión: mostrar la bienvenida.
            welcomeScreen.hidden = false;
            loginScreen.hidden = true;
            mainApp.hidden = true;
        }

    } catch (error) {
        console.error(
            "Error al verificar la sesión:",
            error
        );

        welcomeScreen.hidden = false;
        loginScreen.hidden = true;
        mainApp.hidden = true;
    }
}

    // Iniciar sesión sin salir de index.html.
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document
            .getElementById("username")
            .value.trim()
            .toLowerCase();

        const password =
            document.getElementById("password").value;

        if (!username || !password) {
            loginMessage.textContent =
                "Completa ambos campos.";
            return;
        }

        const submitButton =
            loginForm.querySelector('button[type="submit"]');

        submitButton.disabled = true;
        loginMessage.textContent = "Verificando acceso...";

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: `${username}@users.lopzek.com`,
                    password
                });

            if (error) throw error;

            if (!data.session) {
                throw new Error("No se creó una sesión.");
            }

            localStorage.setItem("lopzek_user_id", data.user.id);

            loginScreen.hidden = true;
            welcomeScreen.hidden = true;
            mainApp.hidden = false;
            loginForm.reset();
            loginMessage.textContent = "";

            window.dispatchEvent(new Event("lopzek-authenticated"));
            
        } catch (error) {
            console.error("Error de acceso:", error);
            loginMessage.textContent =
                "No se pudo iniciar sesión. Revisa tu usuario y contraseña.";
        } finally {
            submitButton.disabled = false;
        }
    });

    checkSession();
});
