
/* =====================================================
   LOPZEK — APLICACIÓN PRINCIPAL
   Navegación, rosters, jugadores y Supabase
===================================================== */

(() => {
    "use strict";

    const FN_LOPEZ_USER_ID = "ba823c68-7726-41b8-9490-8072acec988c";
    const LEGACY_ROSTERS_KEY = "lopzek_rosters_v1";
    const LEGACY_PLAYERS_KEY = "lopzek_players_v1";
    const MAX_IMAGE_SIZE = 350000;

    const state = {
    user: null,
    rosters: [],
    players: [],
    matchPlayerStats: [],
    loading: false
};

    let rosterPendingDelete = null;
    let playerPendingDelete = null;

    const $ = (id) => document.getElementById(id);

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);

    const showError = (message) => {
        alert(message);
    };

    const getRosterBackupKey = (userId) =>
        `lopzek_rosters_${userId}`;

    const getPlayerBackupKey = (userId) =>
        `lopzek_players_${userId}`;

    function readLocalArray(key) {
        try {
            const value = localStorage.getItem(key);
            if (!value) return [];

            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error(`Error leyendo ${key}:`, error);
            return [];
        }
    }

    function saveLocalBackup() {
        if (!state.user) return;

        try {
            localStorage.setItem(
                getRosterBackupKey(state.user.id),
                JSON.stringify(state.rosters)
            );

            localStorage.setItem(
                getPlayerBackupKey(state.user.id),
                JSON.stringify(state.players)
            );
        } catch (error) {
            console.warn("No se pudo actualizar la copia local:", error);
        }
    }

    function mapRoster(row) {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name || "",
            tag: row.tag || "",
            image: row.image || "",
            region: row.region || "",
            status: row.status || "Activo",
            description: row.description || "",

            blockBooyahs: Number(row.block_booyahs ?? 0),
            blockTop3: Number(row.block_top3 ?? 0),
            blockTop4Plus: Number(row.block_top4plus ?? 0),

            createdAt: row.created_at || ""
        };
    }

    function mapPlayer(row) {
        return {
            id: row.id,
            userId: row.user_id,
            nick: row.nick || "",
            name: row.name || "",
            rosterId: row.roster_id == null
                ? ""
                : String(row.roster_id),
            rosterName: row.roster_name || "",
            role: row.role || "",
            status: row.status || "Activo",
            region: row.region || "",
            notes: row.notes || "",
            photo: row.photo || "",
            createdAt: row.created_at || ""
        };
    }

function mapMatchPlayerStat(row) {
    return {
        id: row.id,
        userId: row.user_id,
        playerId: String(row.player_id),
        matchDate: row.match_date,
        blockNumber: Number(row.block_number),
        roomNumber: Number(row.room_number),
        map: row.map || "",
        position: row.position == null
            ? null
            : Number(row.position),
        kills: Number(row.kills || 0),
        damage: Number(row.damage || 0),
        assists: Number(row.assists || 0),
        knockdowns: Number(row.knockdowns || 0),
        deaths: Number(row.deaths || 0),

        strategyScore: row.strategy_score == null
            ? null
            : Number(row.strategy_score),

        mobilityScore: row.mobility_score == null
            ? null
            : Number(row.mobility_score),

        createdAt: row.created_at || "",
        updatedAt: row.updated_at || ""
    };
}

    function getRosterById(id) {
        return state.rosters.find(
            (roster) => String(roster.id) === String(id)
        );
    }

    function getPlayersForRoster(rosterId) {
        return state.players.filter(
            (player) => String(player.rosterId) === String(rosterId)
        );
    }

    /* =====================================================
       NAVEGACIÓN
    ===================================================== */

    
function initNavigation() {
    const mainApp = $("mainApp");

    const navLinks = document.querySelectorAll(
        ".nav-link[data-page]"
    );

    const pages = document.querySelectorAll(".app-page");

        // Menú lateral para celulares y tablets
    const menuToggle = $("menuToggle");
    const sidebar = $("sidebar");
    const sidebarOverlay = document.querySelector(".sidebar-overlay");

    function closeMobileMenu() {
        sidebar?.classList.remove("open");
        sidebarOverlay?.classList.remove("visible");
        menuToggle?.setAttribute("aria-expanded", "false");
        menuToggle?.setAttribute("aria-label", "Abrir menú");
    }

    menuToggle?.addEventListener("click", () => {
        const isOpen = sidebar?.classList.toggle("open");

        sidebarOverlay?.classList.toggle("visible", Boolean(isOpen));
        menuToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Cerrar menú" : "Abrir menú"
        );
    });

    sidebarOverlay?.addEventListener("click", closeMobileMenu);

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            closeMobileMenu();
        }
    });

    function showPage(pageName) {
        const target = document.getElementById(`page-${pageName}`);

        if (!target || !target.classList.contains("app-page")) {
            console.error(
                "LOPZEK: No se encontró el apartado:",
                `page-${pageName}`
            );
            return;
        }

        pages.forEach((page) => {
            page.classList.toggle("active", page === target);
        });

        navLinks.forEach((link) => {
            const active = link.dataset.page === pageName;

            link.classList.toggle("active", active);

            if (active) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        if (window.location.hash !== `#${pageName}`) {
            window.history.replaceState(
                null,
                "",
                `#${pageName}`
            );
        }

        if (mainApp) mainApp.scrollTop = 0;

        window.scrollTo(0, 0);
    }

    navLinks.forEach((link) => {
                link.addEventListener("click", (event) => {
            event.preventDefault();
            showPage(link.dataset.page);
            closeMobileMenu();
        });
    });

    const initialPage = window.location.hash.replace("#", "");

    const initialTarget = initialPage
        ? document.getElementById(`page-${initialPage}`)
        : null;

    if (initialTarget && initialTarget.classList.contains("app-page")) {
        showPage(initialPage);
    } else {
        const firstLink = navLinks[0];

        if (firstLink) {
            showPage(firstLink.dataset.page);
        }
    }
}

    /* =====================================================
       IMÁGENES
    ===================================================== */

    function prepareImage(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve("");
                return;
            }

            if (!file.type.startsWith("image/")) {
                reject(new Error("Selecciona una imagen válida."));
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                reject(new Error(
                    "La imagen original debe pesar menos de 5 MB."
                ));
                return;
            }

            const reader = new FileReader();

            reader.onerror = () => {
                reject(new Error("No se pudo leer la imagen."));
            };

            reader.onload = () => {
                const image = new Image();

                image.onerror = () => {
                    reject(new Error("No se pudo abrir la imagen."));
                };

                image.onload = () => {
                    const canvas = document.createElement("canvas");
                    const maxDimension = 400;

                    const scale = Math.min(
                        1,
                        maxDimension / image.width,
                        maxDimension / image.height
                    );

                    canvas.width = Math.max(
                        1,
                        Math.round(image.width * scale)
                    );

                    canvas.height = Math.max(
                        1,
                        Math.round(image.height * scale)
                    );

                    const context = canvas.getContext("2d");

                    if (!context) {
                        reject(new Error(
                            "No se pudo procesar la imagen."
                        ));
                        return;
                    }

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    let result = canvas.toDataURL(
                        "image/webp",
                        0.78
                    );

                    if (!result.startsWith("data:image/webp")) {
                        result = canvas.toDataURL("image/png");
                    }

                    if (result.length > MAX_IMAGE_SIZE) {
                        reject(new Error(
                            "El logo es demasiado pesado. " +
                            "Prueba con una imagen más pequeña."
                        ));
                        return;
                    }

                    resolve(result);
                };

                image.src = reader.result;
            };

            reader.readAsDataURL(file);
        });
    }

    /* =====================================================
       SUPABASE — CARGA Y MIGRACIÓN SEGURA
    ===================================================== */

    async function getAuthenticatedUser() {
        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient?.auth
        ) {
            throw new Error(
                "No se encontró Supabase. Revisa js/supabase.js."
            );
        }

        const { data, error } = await supabaseClient.auth.getUser();

        if (error) throw error;

        if (!data.user) {
            throw new Error(
                "No hay una sesión activa. Inicia sesión nuevamente."
            );
        }

        return data.user;
    }

    async function migrateLegacyRostersIfNeeded(user, remoteRosters) {
        // La migración heredada está limitada a FN LOPEZ.
        if (user.id !== FN_LOPEZ_USER_ID) return remoteRosters;

        // Nunca migrar si ya existen rosters en la cuenta.
        if (remoteRosters.length > 0) return remoteRosters;

        const userBackup = readLocalArray(
            getRosterBackupKey(user.id)
        );

        const legacyBackup = readLocalArray(LEGACY_ROSTERS_KEY);

        // Preferir la copia de la cuenta; si no existe, usar la heredada.
        const localRosters = userBackup.length > 0
            ? userBackup
            : legacyBackup;

        if (localRosters.length === 0) return remoteRosters;

        const confirmed = window.confirm(
            "Supabase no tiene rosters para FN LOPEZ, pero se " +
            "encontraron rosters guardados en este navegador. " +
            "¿Quieres copiarlos a tu cuenta de Supabase? " +
            "La copia local no se eliminará."
        );

        if (!confirmed) return remoteRosters;

        const rows = localRosters.map((roster) => ({
            user_id: user.id,
            name: String(roster.name || "").trim(),
            tag: roster.tag || null,
            image: roster.image || null,
            region: roster.region || null,
            status: roster.status || "Activo",
            description: roster.description || null
        })).filter((row) => row.name);

        if (rows.length === 0) return remoteRosters;

        const { data, error } = await supabaseClient
            .from("rosters")
            .insert(rows)
            .select("*");

        if (error) throw error;

        return data.map(mapRoster);
    }


function renderMainDashboard() {
    const stats = state.matchPlayerStats || [];

    console.table(state.players.map(p => ({
    jugador: p.nick,
    jugadorId: p.id,
    rosterId: p.rosterId,
    roster: p.rosterName
})));

    console.log("Ejemplo de registro:", stats[0]);

    console.log("Total de registros:", stats.length);

console.table(
    stats.map(stat => ({
        fecha: stat.matchDate,
        bloque: stat.blockNumber,
        sala: stat.roomNumber,
        jugador: stat.playerId
    }))
);

    const totalKills = stats.reduce(
        (sum, stat) => sum + (Number(stat.kills) || 0),
        0
    );

    const totalDamage = stats.reduce(
        (sum, stat) => sum + (Number(stat.damage) || 0),
        0
    );

    // Relacionar cada jugador con su roster.
const playerRosterMap = new Map(
    (state.players || []).map(player => [
        String(player.id),
        String(player.rosterId || "")
    ])
);

// Contar cada partida por fecha, bloque, sala y roster.
const matches = new Set(
    stats.map(stat => {
        const rosterId =
            playerRosterMap.get(String(stat.playerId)) || "";

        return [
            stat.matchDate,
            stat.blockNumber,
            stat.roomNumber,
            rosterId
        ].join("|");
    })
);

const totalMatches = matches.size;

    console.log("LOPZEK — Partidas únicas:", totalMatches, [...matches]);

    const averageKills = totalMatches > 0
        ? (totalKills / totalMatches).toFixed(2)
        : "0";

    const totalKillsElement = document.getElementById(
        "dashboardTotalKills"
    );

    const totalDamageElement = document.getElementById(
        "dashboardTotalDamage"
    );

    const totalMatchesElement = document.getElementById(
        "dashboardTotalMatches"
    );

    const averageKillsElement = document.getElementById(
        "dashboardAverageKills"
    );

    if (totalKillsElement) {
        totalKillsElement.textContent =
            totalKills.toLocaleString("es-CO");
    }

    if (totalDamageElement) {
        totalDamageElement.textContent =
            totalDamage.toLocaleString("es-CO");
    }

    if (totalMatchesElement) {
        totalMatchesElement.textContent =
            totalMatches.toLocaleString("es-CO");
    }

    if (averageKillsElement) {
        averageKillsElement.textContent =
            averageKills.replace(".", ",");
    }

    renderDashboardPerformanceChart();
    renderDashboardRecentActivity();
    renderDashboardRostersSummary();
    renderDashboardKillsDistribution();
}


function renderDashboardRecentActivity() {
    const container = document.getElementById(
        "dashboardRecentActivity"
    );

    if (!container) return;

    const stats = state.matchPlayerStats || [];
    const players = state.players || [];
    const rosters = state.rosters || [];

    if (stats.length === 0) {
        container.className = "empty-state";
        container.innerHTML = `
            <span class="empty-state-icon">◷</span>
            <p>Aún no hay actividad registrada.</p>
        `;
        return;
    }

    const playerMap = new Map(
        players.map(player => [
            String(player.id),
            player
        ])
    );

    const rosterMap = new Map(
        rosters.map(roster => [
            String(roster.id),
            roster
        ])
    );

    const matchesMap = new Map();

    stats.forEach(stat => {
        const player = playerMap.get(String(stat.playerId));
        const rosterId = String(player?.rosterId || "");

        const key = [
            stat.matchDate || "",
            stat.blockNumber || 0,
            stat.roomNumber || 0,
            rosterId
        ].join("|");

        if (!matchesMap.has(key)) {
            matchesMap.set(key, {
                fecha: stat.matchDate || "",
                bloque: Number(stat.blockNumber) || 0,
                sala: Number(stat.roomNumber) || 0,
                rosterId,
                kills: 0
            });
        }

        matchesMap.get(key).kills += Number(stat.kills) || 0;
    });

    const recentMatches = [...matchesMap.values()]
        .sort((a, b) =>
            String(b.fecha).localeCompare(String(a.fecha)) ||
            b.bloque - a.bloque ||
            b.sala - a.sala
        )
        .slice(0, 4);

        console.table(recentMatches);

        console.log("Actividad reciente — registros recibidos:", stats.length);
        console.log("Actividad reciente — partidas agrupadas:", matchesMap.size);

        console.table(
    [...matchesMap.values()]
        .sort((a, b) =>
            String(b.fecha).localeCompare(String(a.fecha)) ||
            b.bloque - a.bloque ||
            b.sala - a.sala
        )
        .slice(0, 15)
);

    container.className = "recent-activity-list";

    container.innerHTML = recentMatches.map(match => {
        const roster = rosterMap.get(match.rosterId);
        const rosterName = roster?.name ||
            roster?.tag ||
            "Roster";

        return `
            <div class="recent-activity-item">
                <div class="recent-activity-info">
                    <strong>${match.fecha || "Fecha no disponible"}</strong>
                    <span>${rosterName}</span>
                    <small>
                        Bloque ${match.bloque} · Sala ${match.sala}
                    </small>
                </div>
                <div class="recent-activity-kills">
                    <strong>${match.kills}</strong>
                    <span>KILLS</span>
                </div>
            </div>
        `;
    }).join("");
}


function renderDashboardRostersSummary() {
    const container = document.getElementById(
        "dashboardRostersSummary"
    );

    if (!container) return;

    const rosters = state.rosters || [];
    const players = state.players || [];
    const stats = state.matchPlayerStats || [];

    if (rosters.length === 0) {
        container.className = "empty-state";
        container.innerHTML = `
            <span class="empty-state-icon">♧</span>
            <p>Los rosters que registres aparecerán aquí.</p>
        `;
        return;
    }

    const playerRosterMap = new Map(
        players.map(player => [
            String(player.id),
            String(player.rosterId || "")
        ])
    );

    const rosterStats = new Map(
        rosters.map(roster => [
            String(roster.id),
            {
                name: roster.name || roster.tag || "Roster sin nombre",
                kills: 0,
                matches: new Set()
            }
        ])
    );

    stats.forEach(stat => {
        const rosterId =
            playerRosterMap.get(String(stat.playerId)) || "";

        const roster = rosterStats.get(rosterId);

        if (!roster) return;

        roster.kills += Number(stat.kills) || 0;

        const matchKey = [
            stat.matchDate || "",
            stat.blockNumber || 0,
            stat.roomNumber || 0
        ].join("|");

        roster.matches.add(matchKey);
    });

    const ranking = [...rosterStats.values()]
        .map(roster => ({
            ...roster,
            matches: roster.matches.size
        }))
        .sort((a, b) =>
            b.kills - a.kills ||
            b.matches - a.matches ||
            a.name.localeCompare(b.name)
        )
        .slice(0, 5);

    container.className = "dashboard-rosters-list";

    container.innerHTML = ranking.map((roster, index) => `
        <div class="dashboard-roster-item">
            <div class="dashboard-roster-position">
                ${index + 1}
            </div>

            <div class="dashboard-roster-info">
                <strong>${roster.name}</strong>
                <span>${roster.matches} partidas registradas</span>
            </div>

            <div class="dashboard-roster-kills">
                <strong>${roster.kills.toLocaleString("es-CO")}</strong>
                <span>KILLS</span>
            </div>
        </div>
    `).join("");
}



function renderDashboardPerformanceChart() {
    const canvas = document.getElementById("dashboardPerformanceChart");

    if (!canvas || typeof Chart === "undefined") return;

    const stats = state.matchPlayerStats || [];
    const players = state.players || [];

    const playerRosterMap = new Map(
        players.map(player => [
            String(player.id),
            String(player.rosterId || "")
        ])
    );

    const rosterNames = new Map();

    players.forEach(player => {
        const id = String(player.rosterId || "");
        if (id && !rosterNames.has(id)) {
            rosterNames.set(id, player.rosterName || "Roster sin nombre");
        }
    });

    // Agrupar las estadísticas por fecha, bloque, sala y roster.
    const matchesMap = new Map();

    stats.forEach(stat => {
        const rosterId = playerRosterMap.get(String(stat.playerId)) || "";

        if (!rosterId || !stat.matchDate) return;

        const matchKey = [
            stat.matchDate,
            stat.blockNumber,
            stat.roomNumber,
            rosterId
        ].join("|");

        if (!matchesMap.has(matchKey)) {
            matchesMap.set(matchKey, {
                fecha: String(stat.matchDate),
                bloque: Number(stat.blockNumber) || 0,
                sala: Number(stat.roomNumber) || 0,
                rosterId,
                kills: 0
            });
        }

        matchesMap.get(matchKey).kills += Number(stat.kills) || 0;
    });

    const matches = [...matchesMap.values()].sort((a, b) =>
        a.fecha.localeCompare(b.fecha) ||
        a.bloque - b.bloque ||
        a.sala - b.sala
    );

    const rosterIds = [...new Set(matches.map(match => match.rosterId))];

    const colors = [
        "#D5A348",
        "#62A8FF",
        "#63C79A",
        "#C58BFA",
        "#FF8D75"
    ];

    // Crear controles de período.
    let controls = document.getElementById("dashboardPerformanceControls");

    if (!controls) {
        controls = document.createElement("div");
        controls.id = "dashboardPerformanceControls";
        controls.style.cssText = `
            display:flex;
            flex-wrap:wrap;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            margin-bottom:18px;
        `;

        canvas.parentElement.parentElement.insertBefore(controls, canvas.parentElement);
    }

    if (!controls.dataset.period) controls.dataset.period = "weekly";
    if (controls.dataset.offset === undefined) controls.dataset.offset = "0";

    const period = controls.dataset.period;
    const offset = Number(controls.dataset.offset) || 0;

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const parseDate = value => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day, 12);
    };

    const dateKey = date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const shortDate = value =>
        parseDate(value).toLocaleDateString("es-CO", {
            day: "2-digit",
            month: "short"
        }).replace(".", "");

    const weekdayNames = ["Lun.", "Mar.", "Mié.", "Jue.", "Vie."];

    let startDate;
    let endDate;
    let title = "";

    if (period === "weekly") {
        const base = new Date(today);
        const weekday = (base.getDay() + 6) % 7;

        base.setDate(base.getDate() - weekday + offset * 7);
        startDate = new Date(base);
        endDate = new Date(base);
        endDate.setDate(endDate.getDate() + 4);

        title = `${shortDate(dateKey(startDate))} – ${shortDate(dateKey(endDate))}`;
    } else if (period === "monthly") {
        startDate = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 12);

        title = startDate.toLocaleDateString("es-CO", {
            month: "long",
            year: "numeric"
        });

        title = title.charAt(0).toUpperCase() + title.slice(1);
    } else {
        const latestMatchDate = matches.length
            ? parseDate(matches[matches.length - 1].fecha)
            : new Date(today);

        startDate = new Date(latestMatchDate);
        startDate.setDate(startDate.getDate() + offset);
        endDate = new Date(startDate);

        title = shortDate(dateKey(startDate));
    }

    const filteredMatches = matches.filter(match => {
        const date = parseDate(match.fecha);
        return date >= startDate && date <= endDate;
    });

    // Crear los puntos del gráfico.

    
    let points = [];

    if (period === "daily") {
        const blocksMap = new Map();

        filteredMatches.forEach(match => {
            const key = `${match.fecha}|${match.bloque}`;

            if (!blocksMap.has(key)) {
                blocksMap.set(key, {
                    key,
                    date: match.fecha,
                    bloque: match.bloque,
                    label: `B${match.bloque}`
                });
            }
        });

        points = [...blocksMap.values()].sort((a, b) =>
            a.bloque - b.bloque
        );
    } else {
        const dates = [];

        for (
            let date = new Date(startDate);
            date <= endDate;
            date.setDate(date.getDate() + 1)
        ) {
            if (
                period === "weekly" &&
                (date.getDay() === 0 || date.getDay() === 6)
            ) {
                continue;
            }

            dates.push(dateKey(date));
        }

        points = dates.map(date => ({
            key: date,
            date,
            label: period === "weekly"
                ? `${weekdayNames[(parseDate(date).getDay() + 6) % 7]} ${shortDate(date)}`
                : shortDate(date)
        }));
    }


    const labels = points.map(point => {
        if (period === "daily") {
            return `B${point.bloque}`;
        }

        if (period === "weekly") {
            return point.label.split(" ")[0];
        }

        return String(parseDate(point.date).getDate()).padStart(2, "0");
    });

    const datasets = rosterIds.map((rosterId, index) => {

        const color = colors[index % colors.length];

        const data = points.map(point => {
            
        if (period === "daily") {
            const blockMatches = filteredMatches.filter(match =>
                match.fecha === point.date &&
                match.bloque === point.bloque &&
                match.rosterId === rosterId
            );

            if (blockMatches.length === 0) return null;

            return blockMatches.reduce(
                (sum, match) => sum + match.kills,
                0
            );
        }


            return filteredMatches
                .filter(match =>
                    match.fecha === point.date &&
                    match.rosterId === rosterId
                )
                .reduce((sum, match) => sum + match.kills, 0);
        });

        
        return {
            label: rosterNames.get(rosterId) || "Roster",
            data,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointHitRadius: 10,
            pointBackgroundColor: "#191C22",
            pointBorderWidth: 2,
            tension: 0.3,
            spanGaps: false
        };

    });

    // Botones Diario, Semanal y Mensual.
    controls.innerHTML = "";

    const left = document.createElement("div");
    left.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center;";

    [
        ["daily", "Diario"],
        ["weekly", "Semanal"],
        ["monthly", "Mensual"]
    ].forEach(([value, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;

        button.style.cssText = `
            border:1px solid ${period === value ? "#D5A348" : "#303540"};
            background:${period === value ? "rgba(213,163,72,.13)" : "#191C22"};
            color:${period === value ? "#F0C875" : "#A5A9B2"};
            border-radius:8px;
            padding:8px 12px;
            cursor:pointer;
            font-size:12px;
        `;

        button.addEventListener("click", () => {
            controls.dataset.period = value;
            controls.dataset.offset = "0";
            renderDashboardPerformanceChart();
        });

        left.appendChild(button);
    });

    const navigation = document.createElement("div");
    navigation.style.cssText = "display:flex;align-items:center;gap:10px;";

    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "‹";
    previous.title = "Período anterior";

    const periodTitle = document.createElement("span");
    periodTitle.textContent = title;
    periodTitle.style.cssText = "color:#F3F0E8;font-size:12px;font-weight:600;";

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "›";
    next.title = "Período siguiente";

    [previous, next].forEach(button => {
        button.style.cssText = `
            width:30px;height:30px;
            border:1px solid #303540;
            background:#191C22;
            color:#F0C875;
            border-radius:8px;
            font-size:20px;
            cursor:pointer;
        `;
    });

    previous.addEventListener("click", () => {
        controls.dataset.offset = String(offset - 1);
        renderDashboardPerformanceChart();
    });

    next.addEventListener("click", () => {
        controls.dataset.offset = String(offset + 1);
        renderDashboardPerformanceChart();
    });

    navigation.append(previous, periodTitle, next);
    controls.append(left, navigation);

    // Destruir el gráfico anterior antes de dibujar el nuevo.
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    new Chart(canvas, {
        type: "line",
        data: { labels, datasets },
        options: {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 100,
    layout: {
        autoPadding: true,
        padding: {
            top: 10,
            right: 16,
            bottom: 16,
            left: 16
        }
    },
    interaction: {
        intersect: false,
        mode: "index"
    },

            plugins: {
                
legend: {
    display: true,
    position: "bottom",
    align: "center",
    labels: {
        color: "#F3F0E8",
        usePointStyle: true,
        pointStyle: "circle",
        boxWidth: 8,
        boxHeight: 8,
        padding: 22,
        textAlign: "left",
        font: {
            size: 11,
            weight: "600"
        }
    }
},

                tooltip: {
                    backgroundColor: "#191C22",
                    titleColor: "#F3F0E8",
                    bodyColor: "#F3F0E8",
                    borderColor: "rgba(213,163,72,.35)",
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        title(items) {
                            const point = points[items[0]?.dataIndex];

                            if (!point) return "";

                            if (period === "daily") {
                                return `${point.date} · Bloque ${point.bloque} · Sala ${point.sala}`;
                            }

                            return point.label;
                        },
                        label(context) {
                            return `${context.dataset.label}: ${context.parsed.y ?? 0} kills`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    ticks: {
                        color: "#A5A9B2",
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: period === "monthly" ? 10 : 8
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: "#A5A9B2"
                    },
                    grid: {
                        color: "rgba(255,255,255,.06)"
                    },
                    title: {
                        display: true,
                        text: "Kills",
                        color: "#A5A9B2"
                    }
                }
            }
        }
    });
}

function renderDashboardKillsDistribution() {
    const canvas = document.getElementById(
        "dashboardKillsDistributionChart"
    );

    if (!canvas || typeof Chart === "undefined") return;

    const stats = state.matchPlayerStats || [];
    const players = state.players || [];

    const playerMap = new Map(
        players.map(player => [
            String(player.id),
            player
        ])
    );

    const killsByPlayer = new Map();

    stats.forEach(stat => {
        const player = playerMap.get(String(stat.playerId));

        if (!player) return;

        const playerId = String(player.id);

        if (!killsByPlayer.has(playerId)) {
            killsByPlayer.set(playerId, {
                name: player.nick || player.name || "Jugador",
                kills: 0
            });
        }

        killsByPlayer.get(playerId).kills +=
            Number(stat.kills) || 0;
    });

    const ranking = [...killsByPlayer.values()]
        .sort((a, b) =>
            b.kills - a.kills ||
            a.name.localeCompare(b.name)
        )
        .slice(0, 8);

    const existingChart = Chart.getChart(canvas);

    if (existingChart) {
        existingChart.destroy();
    }

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: ranking.map(player => player.name),
            datasets: [{
                label: "Kills",
                data: ranking.map(player => player.kills),
                backgroundColor: "#D5A348",
                borderColor: "#F0C875",
                borderWidth: 1,
                borderRadius: 5,
                barThickness: 18
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
    display: context =>
        context.dataset.data[context.dataIndex] !== null &&
        context.dataset.data[context.dataIndex] !== undefined,

    color: context => context.dataset.borderColor,
    anchor: "end",
    align: "top",
    offset: 5,
    clamp: true,

    font: {
        size: 10,
        weight: "bold"
    },

    formatter: value =>
        value === null || value === undefined
            ? ""
            : Math.round(value)
},
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.parsed.x} kills`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: "#A5A9B2"
                    },
                    grid: {
                        color: "rgba(255,255,255,0.07)"
                    }
                },
                y: {
                    ticks: {
                        color: "#F3F0E8"
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

    async function loadDataFromSupabase() {
        if (state.loading) return;

        state.loading = true;

        try {
            const user = await getAuthenticatedUser();
            state.user = user;

            const [
               { data: remoteRosters, error: rosterError },
               { data: remotePlayers, error: playerError },
               { data: remoteMatchStats, error: matchStatsError }
            ] = await Promise.all([
                supabaseClient
                    .from("rosters")
                    .select("*")
                    .order("created_at", { ascending: true }),

                supabaseClient
                    .from("players")
                    .select("*")
                    .order("created_at", { ascending: true }),

                supabaseClient
                    .from("match_player_stats")
                    .select("*")
                    .order("match_date", { ascending: true })
            ]);

            if (rosterError) throw rosterError;
            if (playerError) throw playerError;
            if (matchStatsError) throw matchStatsError;

            let loadedRosters = (remoteRosters || []).map(mapRoster);

            loadedRosters = await migrateLegacyRostersIfNeeded(
                user,
                loadedRosters
            );

            state.rosters = loadedRosters;
            state.players = (remotePlayers || []).map(mapPlayer);
            state.matchPlayerStats = (remoteMatchStats || [])
                .map(mapMatchPlayerStat);

            renderMainDashboard();
            
            window.renderMatchStats?.();
            window.renderReports?.();

            saveLocalBackup();
            renderRosters();
            renderPlayers();
        } catch (error) {
            console.error("Error cargando datos de Supabase:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

            showError(
                "No se pudieron cargar los datos desde Supabase.\n\n" +
                (error.message || "Comprueba tu sesión y la conexión.")
            );
        } finally {
            state.loading = false;
        }
    }

    /* =====================================================
       ROSTERS — ELEMENTOS Y RENDERIZADO
    ===================================================== */

    function initRosterModule() {
        const modal = $("rosterModal");
        const openButton = $("addRosterButton");
        const form = $("rosterForm");
        const rosterList = $("rosterList");
        const searchInput = $("rosterSearch");

        if (!modal || !openButton || !form || !rosterList || !searchInput) {
            console.error(
                "Faltan elementos HTML del módulo Rosters."
            );
            return;
        }

        const nameInput = $("rosterName");
        const tagInput = $("rosterTag");
        const imageInput = $("rosterImage");
        const regionInput = $("rosterRegion");
        const statusInput = $("rosterStatus");
        const descriptionInput = $("rosterDescription");

        const totalRosters = $("totalRosters");
        const totalPlayers = $("totalRosterPlayers");
        const totalOrganizations = $("totalOrganizations");

        const rosterCount = $("rosterCount");

        
const detailsModal = $("rosterDetailsModal");
const closeDetailsButton = $("closeRosterDetails");

// Campos para registrar resultados desde Estadísticas.
const blockBooyahsInput = $("rosterBlockBooyahs");
const blockTop3Input = $("rosterBlockTop3");
const blockTop4PlusInput = $("rosterBlockTop4Plus");
const blockResultsRosterSelect = $("rosterBlockResultsRoster");
const blockResultsForm = $("rosterBlockResultsForm");
const saveBlockResultsButton = $("saveRosterBlockResults");
const blockResultsMessage = $("rosterBlockResultsMessage");

// Inicializar los botones + y − de los contadores TOP.
        document.querySelectorAll(
            "#rosterBlockResultsForm [data-counter-target]"
        ).forEach(button => {
            if (button.dataset.counterInitialized === "true") return;

            button.dataset.counterInitialized = "true";

            button.addEventListener("click", () => {
                const input = document.getElementById(
                    button.dataset.counterTarget
                );

                if (!input) return;

                const current = Math.max(
                    0,
                    Number.parseInt(input.value, 10) || 0
                );

                const step = Number(button.dataset.counterStep);

                input.value = Math.max(0, current + step);

                input.dispatchEvent(
                    new Event("input", { bubbles: true })
                );

                input.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            });
        });

// Valores de solo lectura en la ficha del roster.
const blockBooyahsDisplay = $("rosterDetailBlockBooyahs");
const blockTop3Display = $("rosterDetailBlockTop3");
const blockTop4PlusDisplay = $("rosterDetailBlockTop4Plus");

let rosterBlockResultsId = null;



function loadBlockResultsForRoster(rosterId) {
    const roster = state.rosters.find(
        item => String(item.id) === String(rosterId)
    );

    rosterBlockResultsId = roster ? roster.id : null;

    // Los campos deben empezar en cero para registrar un bloque nuevo.
    if (blockBooyahsInput) {
        blockBooyahsInput.value = 0;
    }

    if (blockTop3Input) {
        blockTop3Input.value = 0;
    }

    if (blockTop4PlusInput) {
        blockTop4PlusInput.value = 0;
    }

    if (blockResultsMessage) {
        blockResultsMessage.textContent = "";
    }
}

function renderBlockResultsRosterOptions() {
    if (!blockResultsRosterSelect) return;

    const selectedId = blockResultsRosterSelect.value;

    blockResultsRosterSelect.innerHTML = `
        <option value="">Selecciona un roster</option>
        ${state.rosters.map(roster => `
            <option value="${escapeHTML(roster.id)}">
                ${escapeHTML(roster.name)}
            </option>
        `).join("")}
    `;

    const selectedRosterExists = state.rosters.some(
        roster => String(roster.id) === String(selectedId)
    );

    if (selectedRosterExists) {
        blockResultsRosterSelect.value = selectedId;
    } else {
        blockResultsRosterSelect.value = "";
        loadBlockResultsForRoster("");
    }
}

blockResultsRosterSelect?.addEventListener("change", () => {
    loadBlockResultsForRoster(blockResultsRosterSelect.value);
});

blockResultsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.user?.id) {
        if (blockResultsMessage) {
            blockResultsMessage.textContent =
                "Inicia sesión antes de guardar los resultados.";
        }
        return;
    }

    const rosterId = blockResultsRosterSelect.value;
    const blockDate = $("rosterBlockDate")?.value;
    const blockNumber = Number($("rosterBlockNumber")?.value);

    const booyahs = Number(blockBooyahsInput.value);
    const top3 = Number(blockTop3Input.value);
    const top4Plus = Number(blockTop4PlusInput.value);

    if (!rosterId || !blockDate) {
        blockResultsMessage.textContent =
            "Selecciona un roster y una fecha.";
        return;
    }

    if (
        !Number.isInteger(blockNumber) || blockNumber < 1 ||
        !Number.isInteger(booyahs) || booyahs < 0 ||
        !Number.isInteger(top3) || top3 < 0 ||
        !Number.isInteger(top4Plus) || top4Plus < 0
    ) {
        blockResultsMessage.textContent =
            "El bloque y las cantidades TOP deben ser números enteros válidos.";
        return;
    }

    if (booyahs > top3) {
        blockResultsMessage.textContent =
            "Los Booyahs también cuentan dentro del TOP 3. El TOP 3 no puede ser menor que el TOP 1.";
        return;
    }

    saveBlockResultsButton.disabled = true;
    blockResultsMessage.textContent = "Guardando resultados del bloque...";

    try {
        // Registrar el bloque. La restricción UNIQUE evita duplicados.
        const { error: insertError } = await supabaseClient
    .from("roster_block_results")
    .insert({
        user_id: state.user.id,
        roster_id: Number(rosterId),
        block_date: blockDate,
        block_number: blockNumber,
        block_booyahs: booyahs,
        block_top3: top3,
        block_top4plus: top4Plus
    });

        if (insertError) {
            if (insertError.code === "23505") {
                blockResultsMessage.textContent =
                    "Este bloque ya está registrado para ese roster y esa fecha. No se volvió a sumar.";
                return;
            }

            throw insertError;
        }

        // Obtener todos los bloques guardados para ese roster.
        const { data: results, error: readError } = await supabaseClient
            .from("roster_block_results")
            .select("block_booyahs, block_top3, block_top4plus")
            .eq("roster_id", Number(rosterId))
            .eq("user_id", state.user.id);

        if (readError) throw readError;

        // Recalcular los acumulados a partir de los bloques guardados.
        const totals = (results || []).reduce(
    (acc, result) => {
        acc.booyahs += Number(result.block_booyahs || 0);
        acc.top3 += Number(result.block_top3 || 0);
        acc.top4Plus += Number(result.block_top4plus || 0);
        return acc;
    },
    { booyahs: 0, top3: 0, top4Plus: 0 }
);

        // Actualizar los totales de la ficha del roster.
        const { data, error: updateError } = await supabaseClient
            .from("rosters")
            .update({
                block_booyahs: totals.booyahs,
                block_top3: totals.top3,
                block_top4plus: totals.top4Plus
            })
            .eq("id", Number(rosterId))
            .eq("user_id", state.user.id)
            .select("*")
            .single();

        if (updateError) throw updateError;

        const updatedRoster = mapRoster(data);

        state.rosters = state.rosters.map(roster =>
            String(roster.id) === String(rosterId)
                ? { ...roster, ...updatedRoster }
                : roster
        );

        saveLocalBackup();
        renderRosters();

        const booyahsDisplay = $("rosterDetailBlockBooyahs");
        const top3Display = $("rosterDetailBlockTop3");
        const top4Display = $("rosterDetailBlockTop4Plus");

        if (booyahsDisplay) {
            booyahsDisplay.textContent = totals.booyahs;
        }

        if (top3Display) {
            top3Display.textContent = totals.top3;
        }

        if (top4Display) {
            top4Display.textContent = totals.top4Plus;
        }

        blockResultsMessage.textContent =
            `Bloque guardado. Acumulado: ${totals.booyahs} Booyahs, ${totals.top3} TOP 3 y ${totals.top4Plus} TOP 4+.`;

        blockResultsForm.reset();

        // Volver a colocar la fecha local de hoy.
        const now = new Date();
        const dateInput = $("rosterBlockDate");

        if (dateInput) {
            dateInput.value = [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0")
            ].join("-");
        }

    } catch (error) {
        console.error("Error guardando resultados por bloques:", error);

        blockResultsMessage.textContent =
            `No se pudieron guardar los resultados: ${error.message || "Error inesperado"}`;
    } finally {
        saveBlockResultsButton.disabled = false;
    }
});

        const detailLogo = $("rosterDetailLogo");
        const detailName = $("rosterDetailName");
        const detailTag = $("rosterDetailTag");
        const detailPlayersCount = $("rosterDetailPlayersCount");
        const detailRegion = $("rosterDetailRegion");
        const detailStatus = $("rosterDetailStatus");
        const detailDescription = $("rosterDetailDescription");
        const detailPlayersList = $("rosterDetailPlayersList");

        const deleteModal = $("modalEliminarRoster");
        const deleteName = $("nombreRosterEliminar");
        const cancelDelete = $("cancelarEliminarRoster");
        const confirmDelete = $("confirmarEliminarRoster");

        function openModal() {
            form.reset();
            modal.hidden = false;
            document.body.style.overflow = "hidden";
            nameInput?.focus();
        }

        function closeModal() {
            modal.hidden = true;
            document.body.style.overflow = "";
            form.reset();
            openButton.focus();
        }

        function renderRosters() {
            const query = searchInput.value.trim().toLowerCase();
            renderBlockResultsRosterOptions();

            const filtered = state.rosters.filter((roster) => {
                return [
                    roster.name,
                    roster.tag,
                    roster.region,
                    roster.status
                ].some((value) =>
                    String(value || "").toLowerCase().includes(query)
                );
            });

            if (totalRosters) {
                totalRosters.textContent = state.rosters.length;
            }

            if (totalPlayers) {
                totalPlayers.textContent = state.players.filter(
                    (player) => state.rosters.some(
                        (roster) =>
                            String(roster.id) === String(player.rosterId)
                    )
                ).length;
            }

            if (totalOrganizations) {
                totalOrganizations.textContent = new Set(
                    state.rosters
                        .map((roster) => String(roster.tag || "").trim().toLowerCase())
                        .filter(Boolean)
                ).size;
            }

            if (rosterCount) {
                rosterCount.textContent =
                    `${filtered.length} ${filtered.length === 1 ? "equipo" : "equipos"}`;
            }

            if (filtered.length === 0) {
                rosterList.innerHTML = `
                    <div class="roster-empty">
                        <span class="module-symbol">♧</span>
                        <h3>${query
                            ? "No encontramos resultados"
                            : "Tu espacio competitivo comienza aquí"
                        }</h3>
                        <p>${query
                            ? "Prueba con otro nombre de equipo o TAG."
                            : "Todavía no hay rosters registrados. Crea el primero para comenzar."
                        }</p>
                    </div>
                `;
                return;
            }

            rosterList.innerHTML = filtered.map((roster) => `
                <article
                    class="roster-item"
                    data-roster-id="${escapeHTML(roster.id)}"
                    tabindex="0"
                    role="button"
                    aria-label="Ver detalles de ${escapeHTML(roster.name)}"
                >
                    <div class="roster-item-mark">
                        ${roster.image
                            ? `<img class="roster-team-image"
                                src="${escapeHTML(roster.image)}"
                                alt="Logo de ${escapeHTML(roster.name)}">`
                            : "L"
                        }
                    </div>

                    <div class="roster-item-info">
                        <h4>${escapeHTML(roster.name)}</h4>
                        <p>${escapeHTML(roster.tag || "Sin TAG")}</p>
                    </div>

                    <div class="roster-item-meta">
                        <span>${escapeHTML(roster.region || "Región sin definir")}</span>
                        <span class="roster-status">${escapeHTML(roster.status)}</span>

                        <button
                            type="button"
                            class="roster-delete-button"
                            data-delete-roster="${escapeHTML(roster.id)}"
                            aria-label="Eliminar roster ${escapeHTML(roster.name)}"
                        >Eliminar</button>
                    </div>

                    ${roster.description
                        ? `<p class="roster-item-description">${escapeHTML(roster.description)}</p>`
                        : ""
                    }
                </article>
            `).join("");
        }

        
function getRosterMatchStats(rosterId) {
    const rosterPlayers = state.players.filter(
        (player) => String(player.rosterId) === String(rosterId)
    );

    const playerIds = new Set(
        rosterPlayers.map((player) => String(player.id))
    );

    const stats = state.matchPlayerStats.filter(
        (match) => playerIds.has(String(match.playerId))
    );

    const totalKills = stats.reduce(
        (sum, match) => sum + Number(match.kills || 0),
        0
    );

    const totalDamage = stats.reduce(
        (sum, match) => sum + Number(match.damage || 0),
        0
    );

    // Una partida se identifica por fecha, bloque y sala.
    const uniqueMatches = new Set(
        stats.map((match) =>
            [
                match.matchDate,
                match.blockNumber,
                match.roomNumber
            ].join("|")
        )
    );

    const totalMatches = uniqueMatches.size;

    return {
        totalPlayers: rosterPlayers.length,
        totalKills,
        totalDamage,
        totalMatches,
        averageKills: totalMatches
            ? totalKills / totalMatches
            : 0
    };
}

        function openRosterDetails(roster) {
            if (!detailsModal) return;

            const players = getPlayersForRoster(roster.id);

            
            // Rankings individuales del roster: kills y daño acumulados.
            const killsRanking = $("rosterDetailKillsRanking");
            const damageRanking = $("rosterDetailDamageRanking");

            const playerStats = players.map((player) => {
                const matches = state.matchPlayerStats.filter(
                    (match) => String(match.playerId) === String(player.id)
                );

                return {
                    player,
                    totalKills: matches.reduce(
                        (sum, match) => sum + Number(match.kills || 0),
                        0
                    ),
                    totalDamage: matches.reduce(
                        (sum, match) => sum + Number(match.damage || 0),
                        0
                    ),
                    matchesCount: matches.length
                };
            });

            function renderPlayerRanking(container, metric, label) {
                if (!container) return;

                const ranking = playerStats
                    .filter((item) => item.matchesCount > 0)
                    .sort((a, b) => b[metric] - a[metric]);

                if (!ranking.length) {
                    container.innerHTML = `
                        <p class="dashboard-roster-vacio">
                            Las estadísticas aparecerán cuando registres partidas.
                        </p>
                    `;
                    return;
                }

                
                container.innerHTML = ranking.map((item, index) => `
                    <article class="dashboard-roster-ranking-item">
                        <span class="dashboard-roster-ranking-pos">
                            ${String(index + 1).padStart(2, "0")}
                        </span>

                        <div class="dashboard-roster-ranking-foto">
                            <img
                                src="${escapeHTML(item.player.photo || "./assets/avatar-default.png")}"
                                alt="Foto de ${escapeHTML(item.player.nick || "Jugador")}"
                                onerror="this.onerror=null;this.src='./assets/avatar-default.png';"
                            >
                        </div>

                        <div class="dashboard-roster-ranking-info">
                            <strong>${escapeHTML(item.player.nick || "Jugador sin nick")}</strong>
                            <small>${escapeHTML(item.player.role || "Sin rol")}</small>
                        </div>

                        <div class="dashboard-roster-ranking-valor">
                            <strong>${item[metric].toLocaleString("es-CO")}</strong>
                            <small>${label}</small>
                        </div>
                    </article>
                `).join("");

            }

            renderPlayerRanking(killsRanking, "totalKills", "KILLS");
            renderPlayerRanking(damageRanking, "totalDamage", "DAÑO");

// =====================================================
// GRÁFICAS COMPARATIVAS PREMIUM DE JUGADORES
// =====================================================

function renderRosterPlayerChart(containerId, metric, colorClass) {
    const container = $(containerId);
    if (!container) return;

    const chartPlayers = playerStats
        .filter((item) => item.matchesCount > 0)
        .sort((a, b) => b[metric] - a[metric]);

    if (!chartPlayers.length) {
        container.innerHTML = `
            <p class="dashboard-roster-vacio">
                Sin datos para graficar.
            </p>
        `;
        return;
    }

    const maxValue = Math.max(
        ...chartPlayers.map((item) => Number(item[metric]) || 0),
        1
    );

    container.classList.remove(
        "dashboard-roster-chart-kills",
        "dashboard-roster-chart-damage"
    );

    container.classList.add(colorClass);

    container.innerHTML = chartPlayers.map((item, index) => {
        const value = Number(item[metric]) || 0;
        const percentage = (value / maxValue) * 100;

        const nick = item.player.nick || "Jugador sin nick";
        const photo =
            item.player.photo || "./assets/avatar-default.png";

        return `
            <div class="dashboard-roster-barra-item">

                <div class="dashboard-roster-barra-cabecera">

                    <span class="dashboard-roster-barra-posicion ${
                        index === 0 ? "is-first" : ""
                    }">
                        ${String(index + 1).padStart(2, "0")}
                    </span>

                    <div class="dashboard-roster-barra-jugador">

                        <div class="dashboard-roster-barra-foto">
                            <img
                                src="${escapeHTML(photo)}"
                                alt="Foto de ${escapeHTML(nick)}"
                                loading="lazy"
                                onerror="this.onerror=null;this.src='./assets/avatar-default.png';"
                            >
                        </div>

                        <span class="dashboard-roster-barra-nombre">
                            ${escapeHTML(nick)}
                        </span>

                    </div>

                    <strong class="dashboard-roster-barra-valor">
                        ${value.toLocaleString("es-CO")}
                    </strong>

                </div>

                <div class="dashboard-roster-barra-fondo">
                    <div
                        class="dashboard-roster-barra-progreso"
                        style="width: ${percentage}%;"
                    ></div>
                </div>

            </div>
        `;
    }).join("");
}

renderRosterPlayerChart(
    "rosterDetailKillsChart",
    "totalKills",
    "dashboard-roster-chart-kills"
);

renderRosterPlayerChart(
    "rosterDetailDamageChart",
    "totalDamage",
    "dashboard-roster-chart-damage"
);

            // Calcular y mostrar las estadísticas del roster seleccionado.
const rosterStats = getRosterMatchStats(roster.id);

const totalKillsDisplay = $("rosterDetailTotalKills");
const totalDamageDisplay = $("rosterDetailTotalDamage");
const averageKillsDisplay = $("rosterDetailAverageKills");
const totalMatchesDisplay = $("rosterDetailTotalMatches");

if (totalKillsDisplay) {
    totalKillsDisplay.textContent =
        rosterStats.totalKills.toLocaleString("es-CO");
}

if (totalDamageDisplay) {
    totalDamageDisplay.textContent =
        rosterStats.totalDamage.toLocaleString("es-CO");
}

if (averageKillsDisplay) {
    averageKillsDisplay.textContent =
        rosterStats.averageKills.toLocaleString("es-CO", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
}

if (totalMatchesDisplay) {
    totalMatchesDisplay.textContent =
        rosterStats.totalMatches.toLocaleString("es-CO");
}
            
 // Mostrar los resultados acumulados del roster.
if (blockBooyahsDisplay) {
    blockBooyahsDisplay.textContent = roster.blockBooyahs ?? 0;
}

if (blockTop3Display) {
    blockTop3Display.textContent = roster.blockTop3 ?? 0;
}

if (blockTop4PlusDisplay) {
    blockTop4PlusDisplay.textContent = roster.blockTop4Plus ?? 0;
}

            if (detailName) detailName.textContent = roster.name;
            if (detailTag) detailTag.textContent = roster.tag ? `[${roster.tag}]` : "SIN TAG";
            if (detailRegion) detailRegion.textContent = roster.region || "Sin definir";
            if (detailStatus) detailStatus.textContent = roster.status || "Sin definir";

            if (detailDescription) {
                detailDescription.textContent =
                    roster.description || "Este roster todavía no tiene una descripción.";
            }

            if (detailPlayersCount) {
                detailPlayersCount.textContent = players.length;
            }

            if (detailLogo) {
                detailLogo.replaceChildren();

                if (roster.image) {
                    const image = document.createElement("img");
                    image.src = roster.image;
                    image.alt = `Logo de ${roster.name}`;
                    detailLogo.appendChild(image);
                } else {
                    detailLogo.textContent =
                        (roster.name || "L").charAt(0).toUpperCase();
                }
            }

            if (detailPlayersList) {
                detailPlayersList.innerHTML = players.length
                    ? players.map((player) => `
                        <article class="detalle-roster-jugador">
                            <div class="detalle-roster-jugador-avatar">
    <img
        src="${escapeHTML(player.photo || "./assets/avatar-default.png")}"
        alt="Foto de ${escapeHTML(player.nick || "Jugador")}"
        onerror="this.onerror=null;this.src='./assets/avatar-default.png';"
    >
</div>
                            <div class="detalle-roster-jugador-info">
                                <strong>${escapeHTML(player.nick)}</strong>
                                <span>${escapeHTML(player.role || "Rol sin definir")} · ${escapeHTML(player.status || "Sin estado")}</span>
                                ${player.name
                                    ? `<span>${escapeHTML(player.name)}</span>`
                                    : ""
                                }
                            </div>
                        </article>
                    `).join("")
                    : `<p class="detalle-roster-sin-jugadores">
                        Todavía no hay jugadores vinculados a este roster.
                       </p>`;
            }

            detailsModal.classList.add("is-open");
            detailsModal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        }

        function closeRosterDetails() {
            if (!detailsModal) return;

            detailsModal.classList.remove("is-open");
            detailsModal.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        function closeDeleteModal() {
            if (deleteModal) deleteModal.hidden = true;
            rosterPendingDelete = null;
            document.body.style.overflow = "";
        }

        openButton.addEventListener("click", openModal);
      
        // Guardar metas semanales por jugador y semana.
        const goalsSaveButton = $("playerProfileGoalsSave");
        const weeklyKillsInput = $("playerProfileWeeklyKillsGoal");

        const placementGoalInputs = [
            $("playerProfileGoalTop1"),
            $("playerProfileGoalTop2"),
            $("playerProfileGoalTop3"),
            $("playerProfileGoalTop4"),
            $("playerProfileGoalTop5")
        ];

        const getGoalsStorageKey = (playerId) => {
            const now = new Date();
            const day = (now.getDay() + 6) % 7;
            const monday = new Date(now);

            monday.setDate(now.getDate() - day);

            const weekKey = [
                monday.getFullYear(),
                String(monday.getMonth() + 1).padStart(2, "0"),
                String(monday.getDate()).padStart(2, "0")
            ].join("-");

            return `lopzek_player_goals_${playerId}_${weekKey}`;
        };

        if (goalsSaveButton && weeklyKillsInput) {
            goalsSaveButton.addEventListener("click", () => {
                const playerNick = $("playerProfileNick")?.textContent;

                const activePlayer = state.players.find(
                    (item) => item.nick === playerNick
                );

                if (!activePlayer) {
                    showError("No se pudo identificar al jugador abierto.");
                    return;
                }

                const weeklyKillsGoal = Number(weeklyKillsInput.value);

                if (
                    !Number.isInteger(weeklyKillsGoal) ||
                    weeklyKillsGoal < 1
                ) {
                    showError("La meta semanal de kills debe ser al menos 1.");
                    weeklyKillsInput.focus();
                    return;
                }

                const placementGoals = placementGoalInputs
                    .filter((input) => input?.checked)
                    .map((input) => input.id);

                const goals = {
                    weeklyKillsGoal,
                    placementGoals
                };

                try {
                    localStorage.setItem(
                        getGoalsStorageKey(activePlayer.id),
                        JSON.stringify(goals)
                    );

                    console.log("Metas semanales guardadas:", goals);
                } catch (error) {
                    console.error("Error guardando metas semanales:", error);
                    showError("No se pudieron guardar las metas en este navegador.");
                    return;
                }

                alert("Metas semanales guardadas correctamente.");
            });
        }

        // Abrir y cerrar el panel de metas del radar.
        const goalsButton = $("playerProfileGoalsButton");
        const goalsPanel = $("playerProfileGoalsPanel");
        
        if (goalsButton && goalsPanel) {
            goalsButton.addEventListener("click", () => {
                const willOpen = goalsPanel.hidden;

                goalsPanel.hidden = !willOpen;
                goalsButton.setAttribute(
                    "aria-expanded",
                    String(willOpen)
                );
            });
        }

        modal.querySelectorAll("[data-close-roster]").forEach((element) => {
            element.addEventListener("click", closeModal);
        });

        searchInput.addEventListener("input", renderRosters);

        if (closeDetailsButton) {
            closeDetailsButton.addEventListener("click", closeRosterDetails);
        }

        if (detailsModal) {
            detailsModal.addEventListener("click", (event) => {
                if (event.target === detailsModal) closeRosterDetails();
            });
        }

        rosterList.addEventListener("click", (event) => {
            const deleteButton = event.target.closest("[data-delete-roster]");

            if (deleteButton) {
                event.stopPropagation();

                const roster = getRosterById(deleteButton.dataset.deleteRoster);
                if (!roster || !deleteModal) return;

                rosterPendingDelete = roster.id;

                if (deleteName) deleteName.textContent = roster.name;

                deleteModal.hidden = false;
                document.body.style.overflow = "hidden";
                confirmDelete?.focus();
                return;
            }

            const card = event.target.closest(".roster-item");

            if (card) {
                openRosterDetails(getRosterById(card.dataset.rosterId));
            }
        });

        rosterList.addEventListener("keydown", (event) => {
            if (
                (event.key === "Enter" || event.key === " ") &&
                event.target.classList.contains("roster-item")
            ) {
                event.preventDefault();
                openRosterDetails(
                    getRosterById(event.target.dataset.rosterId)
                );
            }
        });

        cancelDelete?.addEventListener("click", closeDeleteModal);

        deleteModal?.addEventListener("click", (event) => {
            if (event.target === deleteModal) closeDeleteModal();
        });

        confirmDelete?.addEventListener("click", async () => {
            if (rosterPendingDelete === null) return;

            if (!state.user) {
                showError("Inicia sesión para eliminar un roster.");
                return;
            }

            const button = confirmDelete;
            button.disabled = true;

            try {
                const { error } = await supabaseClient
                    .from("rosters")
                    .delete()
                    .eq("id", rosterPendingDelete);

                if (error) throw error;

                state.rosters = state.rosters.filter(
                    (roster) =>
                        String(roster.id) !== String(rosterPendingDelete)
                );

                // Actualizar solo después de confirmar la eliminación remota.
                saveLocalBackup();
                closeDeleteModal();
                renderRosters();
                renderPlayers();
            } catch (error) {
                console.error("Error eliminando roster:", error);

                showError(
                    "No se pudo eliminar el roster de Supabase.\n\n" +
                    (error.message || "Comprueba si tiene jugadores vinculados.")
                );
            } finally {
                button.disabled = false;
            }
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!state.user) {
                showError("Inicia sesión antes de guardar un roster.");
                return;
            }

            const name = nameInput.value.trim();

            if (!name) {
                nameInput.focus();
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');

            if (!submitButton) return;

            submitButton.disabled = true;
            submitButton.textContent = "Guardando...";

            try {
                const image = await prepareImage(imageInput.files[0]);

                const row = {
                    user_id: state.user.id,
                    name,
                    tag: tagInput.value.trim() || null,
                    image: image || null,
                    region: regionInput.value || null,
                    status: statusInput.value || "Activo",
                    description: descriptionInput.value.trim() || null
                };

                const { data, error } = await supabaseClient
                    .from("rosters")
                    .insert(row)
                    .select("*")
                    .single();

                if (error) throw error;

                state.rosters.push(mapRoster(data));
                saveLocalBackup();

                searchInput.value = "";
                renderRosters();
                closeModal();
                renderPlayers();
            } catch (error) {
                console.error("Error guardando roster:", error);

                showError(
                    error.message || "No se pudo guardar el roster."
                );
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Guardar roster";
            }
        });

        return { renderRosters, openModal, closeModal };
    }

    /* =====================================================
       JUGADORES — ELEMENTOS Y RENDERIZADO
    ===================================================== */

    function initPlayerModule() {
        const modal = $("playerModal");
        const openButton = $("addPlayerButton");
        const form = $("playerForm");
        const playerList = $("playerList");
        const searchInput = $("playerSearch");
        const rosterFilter = $("playerRosterFilter");
        const rosterSelect = $("playerRoster");

        if (
            !modal || !openButton || !form || !playerList ||
            !searchInput || !rosterFilter || !rosterSelect
        ) {
            console.error(
                "Faltan elementos HTML del módulo Jugadores."
            );
            return;
        }

        const nickInput = $("playerNick");
        const nameInput = $("playerName");
        const roleInput = $("playerRole");
        const statusInput = $("playerStatus");
        const regionInput = $("playerRegion");
        const notesInput = $("playerNotes");

        const totalPlayers = $("totalPlayers");
        const activePlayers = $("activePlayers");
        const linkedRosters = $("linkedRosters");
        const playerCount = $("playerCount");

        const deleteModal = $("modalEliminarJugador");
        const deleteName = $("nombreJugadorEliminar");
        const cancelDelete = $("cancelarEliminarJugador");
        const confirmDelete = $("confirmarEliminarJugador");

        
        // ==========================================
        // PERFIL COMPETITIVO INDIVIDUAL
        // ==========================================

        const playerProfileModal = $("playerProfileModal");

        let playerProfileKillsDamageChart = null;
        
let playerProfileRadarChart = null;

function renderPlayerProfileRadarChart(
    playerStats,
    totals,
    totalMatches,
    top3,
    top5,
    booyahs,
    playerId
) {
    console.log("RADAR: entró a la función");
    console.log("RADAR: la función se está ejecutando");

    const canvas = $("playerProfileRadarChart");

    if (!canvas) {
        console.warn("No se encontró el canvas del gráfico de fortalezas.");
        return;
    }

    if (playerProfileRadarChart) {
        playerProfileRadarChart.destroy();
        playerProfileRadarChart = null;
    }

    if (typeof Chart === "undefined") {
        console.warn("Chart.js no está disponible para el gráfico de fortalezas.");
        return;
    }

    // Obtener las metas configuradas para este jugador y esta semana.
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now);

    monday.setDate(now.getDate() - day);

    const weekKey = [
        monday.getFullYear(),
        String(monday.getMonth() + 1).padStart(2, "0"),
        String(monday.getDate()).padStart(2, "0")
    ].join("-");

    const goalsKey = `lopzek_player_goals_${playerId}_${weekKey}`;

    let goals = {
        weeklyKillsGoal: 200,
        placementGoals: []
    };

    try {
        const saved = JSON.parse(
            localStorage.getItem(goalsKey) || "null"
        );

        if (saved) {
            goals = { ...goals, ...saved };
        }
    } catch (error) {
        console.warn(
            "No se pudieron leer las metas del radar:",
            error
        );
    }

console.table(
    playerStats.map((stat) => ({
        fecha: stat.matchDate,
        bloque: stat.blockNumber,
        sala: stat.roomNumber,
        kills: stat.kills,
        posicion: stat.position
    }))
);

    // Contar únicamente las partidas de lunes a viernes
    // de la semana actual.
    const weeklyStats = playerStats.filter((stat) => {
        const dateText = String(stat.matchDate || "").slice(0, 10);
        const parts = dateText.split("-");

        if (parts.length !== 3) return false;

        const date = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]),
            12
        );

        if (
            Number.isNaN(date.getTime()) ||
            date.getFullYear() !== Number(parts[0]) ||
            date.getMonth() !== Number(parts[1]) - 1 ||
            date.getDate() !== Number(parts[2])
        ) {
            return false;
        }

        const weekday = (date.getDay() + 6) % 7;

        const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
);

const mondayOnly = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate()
);

const isThisWeek = dateOnly >= mondayOnly;

console.log("COMPROBACIÓN SEMANAL:", {
    fechaPartida: date.toLocaleDateString("en-CA"),
    lunesActual: monday.toLocaleDateString("en-CA"),
    weekday,
    isThisWeek,
    entreLunesYViernes: isThisWeek && weekday < 5
});

return isThisWeek && weekday < 5;

    });

    // Sumar las kills de la semana.
    const weeklyKills = weeklyStats.reduce(
        (sum, stat) => sum + (Number(stat.kills) || 0),
        0
    );

    // Identificar las partidas y su posición final.
    
const weeklyMatchPositions = new Map();

weeklyStats.forEach((stat) => {
    const key =
        `${stat.matchDate}|${stat.blockNumber}|${stat.roomNumber}`;

    const position = Number(stat.position);

    if (
        Number.isInteger(position) &&
        position >= 1
    ) {
        weeklyMatchPositions.set(key, position);
    }
});


    const weeklyMatches = new Set(
        weeklyStats.map((stat) =>
            `${stat.matchDate}|${stat.blockNumber}|${stat.roomNumber}`
        )
    );

    // COMBATE: porcentaje de avance hacia la meta semanal de kills.
    const normalize = (value, reference) =>
        Math.max(0, Math.min(100, (value / reference) * 100));

    const combat = normalize(
        weeklyKills,
        Math.max(1, Number(goals.weeklyKillsGoal) || 200)
    );

    // SUPERVIVENCIA: porcentaje de partidas que cumplen
    // alguna de las posiciones seleccionadas.
    const selectedPositions = (goals.placementGoals || []).map((id) =>
        Number(String(id).replace("playerProfileGoalTop", ""))
    );

const successfulMatches = [
    ...weeklyMatchPositions.values()
].filter((position) =>
    selectedPositions.some((goal) =>
        position <= goal
    )
).length;

    const survival =
        weeklyMatches.size > 0 && selectedPositions.length > 0
            ? (successfulMatches / weeklyMatches.size) * 100
            : 0;

            console.log("SUPERVIVENCIA — metas seleccionadas:", goals.placementGoals);
console.log("SUPERVIVENCIA — posiciones numéricas:", selectedPositions);
console.log("SUPERVIVENCIA — partidas evaluadas:", [...weeklyMatches]);
console.log("SUPERVIVENCIA — posiciones por partida:", [...weeklyMatchPositions.entries()]);
console.log("SUPERVIVENCIA — partidas exitosas:", successfulMatches);
console.log("SUPERVIVENCIA — porcentaje:", survival);

            console.log("RADAR — jugador:", playerId);
console.log("RADAR — metas guardadas:", goals);
console.log("RADAR — partidas de esta semana:", weeklyStats.length);
console.log("RADAR — kills semanales:", weeklyKills);
console.log("RADAR — meta de kills:", goals.weeklyKillsGoal);
console.log("RADAR — partidas únicas:", weeklyMatches.size);
console.log("RADAR — posiciones seleccionadas:", selectedPositions);
console.log("RADAR — posiciones encontradas:", [...weeklyMatchPositions.values()]);
console.log("RADAR — partidas exitosas:", successfulMatches);
console.log("RADAR — combate:", combat);
console.log("RADAR — supervivencia:", survival);

    // Promedios generales para las demás fortalezas.
    const matches = Math.max(totalMatches, 1);

    const averageKills = totals.kills / matches;
    const averageDamage = totals.damage / matches;
    const averageAssists = totals.assists / matches;
    const averageKnockdowns = totals.knockdowns / matches;

        // APOYO: promedio de asistencias y derribos.
    const support = (
        normalize(averageAssists, 5) +
        normalize(averageKnockdowns, 5)
    ) / 2;
    
const strategyScores = playerStats
    .map((stat) => stat.strategyScore)
    .filter((score) =>
        score != null &&
        Number.isFinite(Number(score)) &&
        Number(score) >= 1 &&
        Number(score) <= 10
    )
    .map(Number);

const mobilityScores = playerStats
    .map((stat) => stat.mobilityScore)
    .filter((score) =>
        score != null &&
        Number.isFinite(Number(score)) &&
        Number(score) >= 1 &&
        Number(score) <= 10
    )
    .map(Number);

const strategy = strategyScores.length > 0
    ? (
        strategyScores.reduce((sum, score) => sum + score, 0) /
        strategyScores.length
    ) * 10
    : null;

const mobility = mobilityScores.length > 0
    ? (
        mobilityScores.reduce((sum, score) => sum + score, 0) /
        mobilityScores.length
    ) * 10
    : null;

    canvas.hidden = false;

const radarScoresPlugin = {
    id: "radarScoresAboveLabels",

    
afterDraw(chart) {
    const { ctx, scales, data } = chart;
    const scale = scales.r;

    if (!scale || !data.datasets.length) return;

    const values = data.datasets[0].data;
    const labelPositions = scale._pointLabelItems;

    if (!labelPositions || labelPositions.length !== values.length) {
        console.warn("No se encontraron las posiciones reales de las etiquetas.");
        return;
    }

    ctx.save();
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#d5a348";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    values.forEach((value, index) => {
        const labelPosition = labelPositions[index];

        if (!labelPosition || labelPosition.visible === false) return;

        const scoreText = value == null
              ? "—"
            : String(Math.round(Number(value)));

        const dx = labelPosition.x - scale.xCenter;
        const dy = labelPosition.y - scale.yCenter;
        const distance = Math.hypot(dx, dy) || 1;

        const offset = 30;
        const x = labelPosition.x + (dx / distance) * offset;
        const y = labelPosition.y + (dy / distance) * offset;

        ctx.fillText(scoreText, x, y);
    });

    ctx.restore();
}

};

console.log("RADAR strategy:", strategy);
console.log("RADAR mobility:", mobility);
console.log("RADAR strategyScores:", JSON.stringify(strategyScores));
console.log("RADAR mobilityScores:", JSON.stringify(mobilityScores));

    playerProfileRadarChart = new Chart(canvas.getContext("2d"), {
        type: "radar",

        data: {
            
labels: [
    "Combate",
    "Supervivencia",
    "Apoyo",
    "Estrategia",
    "Movilidad"
],

datasets: [{
    label: "Fortalezas",
    data: [
        combat,
        survival,
        support,
        strategy,
        mobility
    ],

                borderColor: "#d5a348",
                backgroundColor: "rgba(213, 163, 72, 0.20)",
                pointBackgroundColor: "#d5a348",
                pointBorderColor: "#ffffff",
                pointHoverBackgroundColor: "#ffffff",
                pointHoverBorderColor: "#d5a348",
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            animation: {
                duration: 800
            },

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            return ` Nivel relativo: ${Math.round(context.raw)}/100`;
                        }
                    }
                }
            },

            scales: {
                r: {
                    min: 0,
                    max: 100,

                    ticks: {
                        display: false,
                        stepSize: 20
                    },

                    angleLines: {
                        color: "rgba(255,255,255,0.12)"
                    },

                    grid: {
                        color: "rgba(255,255,255,0.10)"
                    },

                    pointLabels: {
                        color: "#d5d8de",
                        padding: 24,
                        font: { size: 11, weight: "600"}
                    }
                }
            }
        },

        plugins: [radarScoresPlugin]

    });
}

        function renderPlayerProfileKillsDamageChart(playerStats) {
            const canvas = $("playerProfileKillsDamageChart");
            const message = $("playerProfileChartMessage");

            if (!canvas) {
                console.warn(
                    "No se encontró el canvas de la gráfica del jugador."
                );
                return;
            }

            // Destruir la gráfica anterior antes de crear una nueva.
            if (playerProfileKillsDamageChart) {
                playerProfileKillsDamageChart.destroy();
                playerProfileKillsDamageChart = null;
            }

            // Comprobar que Chart.js esté disponible.
            if (typeof Chart === "undefined") {
                canvas.hidden = true;

                if (message) {
                    message.hidden = false;
                    message.textContent =
                        "No se pudo cargar la biblioteca de gráficas.";
                }

                console.error(
                    "Chart.js no está cargado. Comprueba su script en el HTML."
                );

                return;
            }

            const weekdays = [
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes"
            ];

            const killsByDay = Array(5).fill(0);
            const damageByDay = Array(5).fill(0);

            let validMatches = 0;

            // Agrupar estadísticas de lunes a viernes.
            (Array.isArray(playerStats) ? playerStats : []).forEach(
                (stat) => {
                    const dateValue = String(stat.matchDate || "");
                    const parts = dateValue.slice(0, 10).split("-");

                    if (parts.length !== 3) return;

                    const year = Number(parts[0]);
                    const month = Number(parts[1]);
                    const day = Number(parts[2]);

                    if (
                        !Number.isInteger(year) ||
                        !Number.isInteger(month) ||
                        !Number.isInteger(day) ||
                        year < 1000 ||
                        month < 1 ||
                        month > 12 ||
                        day < 1 ||
                        day > 31
                    ) {
                        return;
                    }

                    // Mediodía local para evitar desfases de zona horaria.
                    const date = new Date(year, month - 1, day, 12);

                    // Rechazar fechas inexistentes, como el 31 de febrero.
                    if (
                        date.getFullYear() !== year ||
                        date.getMonth() !== month - 1 ||
                        date.getDate() !== day
                    ) {
                        return;
                    }

                    // Convertir domingo=0 a lunes=0.
                    const dayIndex = (date.getDay() + 6) % 7;

                    // Excluir sábado y domingo.
                    if (dayIndex >= 5) return;

                    killsByDay[dayIndex] += Number(stat.kills) || 0;
                    damageByDay[dayIndex] += Number(stat.damage) || 0;

                    validMatches++;
                }
            );

            canvas.hidden = false;

            // Mostrar un mensaje cuando no haya partidas entre semana.
            if (validMatches === 0) {
                canvas.hidden = true;

                if (message) {
                    message.hidden = false;
                    message.textContent =
                        "Todavía no hay partidas registradas de lunes a viernes.";
                }

                return;
            }

            if (message) {
                message.hidden = true;
                message.textContent = "";
            }

            const ctx = canvas.getContext("2d");

            if (!ctx) {
                canvas.hidden = true;

                if (message) {
                    message.hidden = false;
                    message.textContent =
                        "No se pudo preparar la gráfica.";
                }

                return;
            }

            // Degradado dorado para el daño.
            const damageGradient = ctx.createLinearGradient(
                0, 0, 0, 320
            );

            damageGradient.addColorStop(
                0,
                "rgba(213, 163, 72, 0.30)"
            );

            damageGradient.addColorStop(
                1,
                "rgba(213, 163, 72, 0.00)"
            );

            // Degradado azul para las kills.
            const killsGradient = ctx.createLinearGradient(
                0, 0, 0, 320
            );

            killsGradient.addColorStop(
                0,
                "rgba(98, 168, 255, 0.18)"
            );

            killsGradient.addColorStop(
                1,
                "rgba(98, 168, 255, 0.00)"
            );

            playerProfileKillsDamageChart = new Chart(ctx, {
                type: "line",

                data: {
                    labels: weekdays,

                    datasets: [
                        {
                            label: "Daño",
                            data: damageByDay,
                            yAxisID: "yDamage",

                            borderColor: "#d5a348",
                            backgroundColor: damageGradient,

                            pointBackgroundColor: "#d5a348",
                            pointBorderColor: "#171a1f",
                            pointHoverBackgroundColor: "#ffffff",
                            pointHoverBorderColor: "#d5a348",

                            pointRadius: 3,
                            pointHoverRadius: 7,
                            pointBorderWidth: 2,
                            pointHoverBorderWidth: 3,

                            borderWidth: 3,
                            tension: 0.35,
                            fill: true
                        },

                        {
                            label: "Kills",
                            data: killsByDay,
                            yAxisID: "yKills",

                            borderColor: "#62a8ff",
                            backgroundColor: killsGradient,

                            pointBackgroundColor: "#62a8ff",
                            pointBorderColor: "#171a1f",
                            pointHoverBackgroundColor: "#ffffff",
                            pointHoverBorderColor: "#62a8ff",

                            pointRadius: 3,
                            pointHoverRadius: 7,
                            pointBorderWidth: 2,
                            pointHoverBorderWidth: 3,

                            borderWidth: 3,
                            tension: 0.35,
                            fill: false
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        mode: "index",
                        intersect: false
                    },

                    animation: {
                        duration: 900,
                        easing: "easeOutQuart"
                    },

                    layout: {
                        padding: {
                            top: 12,
                            right: 10,
                            bottom: 4,
                            left: 4
                        }
                    },

                    plugins: { 
                        legend: {
                            display: false
                        },

                        tooltip: {
                            backgroundColor: "#171a1f",
                            titleColor: "#ffffff",
                            bodyColor: "#d5d8de",

                            borderColor: "rgba(213, 163, 72, 0.45)",
                            borderWidth: 1,

                            padding: 12,
                            cornerRadius: 8,
                            displayColors: true,

                            titleFont: {
                                size: 12,
                                weight: "bold"
                            },

                            bodyFont: {
                                size: 12
                            },

                            callbacks: {
                                label(context) {
                                    const value = Number(
                                        context.raw || 0
                                    ).toLocaleString("es-CO");

                                    return (
                                        ` ${context.dataset.label}: ${value}`
                                    );
                                }
                            }
                        }
                    },

                    scales: {
                        x: {
                            border: {
                                display: false
                            },

                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#9298a3",
                                padding: 12,

                                font: {
                                    size: 11,
                                    weight: "500"
                                }
                            }
                        },

                        yDamage: {
                            type: "linear",
                            position: "left",
                            beginAtZero: true,

                            border: {
                                display: false
                            },

                            title: {
                                display: true,
                                text: "DAÑO",
                                color: "#d5a348",

                                padding: {
                                    bottom: 10
                                },

                                font: {
                                    size: 10,
                                    weight: "bold"
                                }
                            },

                            ticks: {
                                color: "#d5a348",
                                padding: 10,

                                font: {
                                    size: 10
                                }
                            },

                            grid: {
                                color: "rgba(255, 255, 255, 0.055)",
                                drawTicks: false
                            }
                        },

                        
                        yKills: {
                            type: "linear",
                            position: "right",
                            beginAtZero: true,
                            grace: "10%",

                            border: {
                                display: false
                            },

                            title: {
                                display: true,
                                text: "KILLS",
                                color: "#62a8ff",

                                padding: {
                                    bottom: 10
                                },

                                font: {
                                    size: 10,
                                    weight: "bold"
                                }
                            },

                            ticks: {
                                color: "#62a8ff",
                                precision: 0,
                                padding: 10,
                                maxTicksLimit: 8,

                                font: {
                                    size: 10
                                }
                            },

                            grid: {
                                drawOnChartArea: false,
                                drawTicks: false
                            }
                        }
                    }
                }
            });

            }

        function openPlayerProfile(player) {
            if (!playerProfileModal || !player) return;

            const setText = (id, value, fallback = "—") => {
                const element = $(id);

                if (element) {
                    element.textContent = value || fallback;
                }
            };

            setText("playerProfileNick", player.nick, "Jugador");

            
            // Recuperar las metas semanales guardadas del jugador.
            const weeklyKillsInput = $("playerProfileWeeklyKillsGoal");

            const placementGoalInputs = [
                $("playerProfileGoalTop1"),
                $("playerProfileGoalTop2"),
                $("playerProfileGoalTop3"),
                $("playerProfileGoalTop4"),
                $("playerProfileGoalTop5")
            ];

            const getGoalsStorageKey = (playerId) => {
                const now = new Date();
                const day = (now.getDay() + 6) % 7;
                const monday = new Date(now);

                monday.setDate(now.getDate() - day);

                const weekKey = [
                    monday.getFullYear(),
                    String(monday.getMonth() + 1).padStart(2, "0"),
                    String(monday.getDate()).padStart(2, "0")
                ].join("-");

                return `lopzek_player_goals_${playerId}_${weekKey}`;
            };

            let savedGoals = null;

            try {
                savedGoals = JSON.parse(
                    localStorage.getItem(getGoalsStorageKey(player.id)) || "null"
                );
            } catch (error) {
                console.warn("No se pudieron recuperar las metas:", error);
            }

            if (weeklyKillsInput) {
                weeklyKillsInput.value = savedGoals?.weeklyKillsGoal ?? 200;
            }

            placementGoalInputs.forEach((input) => {
                if (input) {
                    input.checked =
                        savedGoals?.placementGoals?.includes(input.id) ?? false;
                }
            });

            setText(
                "playerProfileName",
                player.name,
                "Nombre real no registrado"
            );
            setText("playerProfileRole", player.role, "Rol sin definir");
            setText("playerProfileStatus", player.status, "Sin estado");
            setText("playerProfileRegion", player.region, "Sin región");
            setText("playerProfileRoster", player.rosterName, "Sin roster");
            setText(
                "playerProfileId",
                 String(
                  state.players.findIndex(
                     (item) => String(item.id) === String(player.id)
                  ) + 1
                ).padStart(3, "0")
            );

            // ==========================================
            // FOTO DEL JUGADOR
            // ==========================================

            const playerProfilePhoto = $("playerProfilePhoto");
            const playerProfileInitial = $("playerProfileInitial");

            if (playerProfilePhoto && playerProfileInitial) {
                const defaultPhoto = "./assets/avatar-default.png";

                playerProfilePhoto.hidden = false;
                playerProfilePhoto.style.display = "block";

                playerProfilePhoto.onload = () => {
                    playerProfileInitial.hidden = true;
                };

                playerProfilePhoto.onerror = () => {
                    playerProfilePhoto.onerror = null;
                    playerProfilePhoto.hidden = true;
                    playerProfileInitial.hidden = false;
                };

                playerProfilePhoto.src = player.photo || defaultPhoto;
                 
                console.log("Foto del jugador:", player.photo);
                console.log("Ruta de la imagen:", playerProfilePhoto.src);
                console.log("Imagen encontrada:", playerProfilePhoto.complete, playerProfilePhoto.naturalWidth);

                playerProfileInitial.textContent =
                    (player.nick || "L").charAt(0).toUpperCase();
            }

            setText(
                "playerProfileNotes",
                player.notes,
                "No hay observaciones registradas para este jugador."
            );

// ==========================================
// ESTADÍSTICAS REALES DEL JUGADOR
// ==========================================

const playerStats = state.matchPlayerStats.filter((stat) => {
    if (String(stat.playerId) !== String(player.id)) {
        return false;
    }

    const kills = Number(stat.kills) || 0;
    const damage = Number(stat.damage) || 0;
    const assists = Number(stat.assists) || 0;
    const knockdowns = Number(stat.knockdowns) || 0;
    const deaths = Number(stat.deaths) || 0;

    // Excluir registros de salas que el jugador no jugó.
    const noJugó =
        kills === 0 &&
        damage === 0 &&
        assists === 0 &&
        knockdowns === 0 &&
        deaths === 0;

    return !noJugó;
});

console.table(
    playerStats.map((stat) => ({
        fecha: stat.matchDate,
        bloque: stat.blockNumber,
        sala: stat.roomNumber,
        mapa: stat.map,
        posicion: stat.position,
        kills: stat.kills,
        daño: stat.damage,
        asistencias: stat.assists,
        derribos: stat.knockdowns,
        muertes: stat.deaths
    }))
);

renderPlayerProfileKillsDamageChart(playerStats);

// Identificar las partidas sin contarlas dos veces.
const matchKeys = new Set(
    playerStats.map((stat) =>
        `${stat.matchDate}|${stat.blockNumber}|${stat.roomNumber}`
    )
);

// Sumar las estadísticas de todas las partidas registradas.
const totals = playerStats.reduce(
    (sum, stat) => ({
        kills: sum.kills + stat.kills,
        damage: sum.damage + stat.damage,
        assists: sum.assists + stat.assists,
        knockdowns: sum.knockdowns + stat.knockdowns,
        deaths: sum.deaths + stat.deaths
    }),
    {
        kills: 0,
        damage: 0,
        assists: 0,
        knockdowns: 0,
        deaths: 0
    }
);

const totalMatches = matchKeys.size;

const uniqueMatchPositions = new Map();

playerStats.forEach((stat) => {
    const matchKey =
        `${stat.matchDate}|${stat.blockNumber}|${stat.roomNumber}`;

    const position = Number(stat.position);

    if (
        !uniqueMatchPositions.has(matchKey) &&
        Number.isInteger(position) &&
        position >= 1
    ) {
        uniqueMatchPositions.set(matchKey, position);
    }
});

const top3 = [...uniqueMatchPositions.values()].filter(
    (position) => position <= 3
).length;

const top5 = [...uniqueMatchPositions.values()].filter(
    (position) => position <= 5
).length;

const booyahs = [...uniqueMatchPositions.values()].filter(
    (position) => position === 1
).length;

console.log("RADAR: intentando dibujar", {
    canvas: document.getElementById("playerProfileRadarChart"),
    estadisticas: playerStats.length,
    partidas: totalMatches
});

renderPlayerProfileRadarChart(
    playerStats,
    totals,
    totalMatches,
    top3,
    top5,
    booyahs,
    player.id
);

            // ==========================================
            // HISTORIAL DE PARTIDAS DEL JUGADOR
            // ==========================================

            const recentMatchesBody = $("playerProfileRecentMatches");

            if (recentMatchesBody) {
                const sortedMatches = [...playerStats].sort((a, b) => {
                    const dateComparison = String(b.matchDate)
                        .localeCompare(String(a.matchDate));

                    if (dateComparison !== 0) return dateComparison;

                    if (b.blockNumber !== a.blockNumber) {
                        return b.blockNumber - a.blockNumber;
                    }

                    return b.roomNumber - a.roomNumber;
                });

                const latestFiveMatches = sortedMatches.slice(0, 5);

                if (latestFiveMatches.length === 0) {
                    recentMatchesBody.innerHTML = `
                        <tr>
                            <td colspan="5">
                                Todavía no hay partidas registradas para este jugador.
                            </td>
                        </tr>
                    `;
                                } else {
                    recentMatchesBody.innerHTML = latestFiveMatches
                    
                        .map((stat) => `
                            <tr>
                                <td>
                                    ${escapeHTML(stat.matchDate || "Sin fecha")}
                                    <br>
                                    <small>
                                        Bloque ${escapeHTML(stat.blockNumber)}
                                        · Sala ${escapeHTML(stat.roomNumber)}
                                    </small>
                                </td>

                                <td>
                                    ${escapeHTML(stat.map || "Sin mapa")}
                                </td>

                                <td>
                                    ${
                                        stat.position != null
                                            ? `${stat.position}.º`
                                            : "Sin posición"
                                    }
                                </td>

                                <td>${stat.kills}</td>

                                <td>
                                    ${stat.damage.toLocaleString("es-CO")}
                                </td>
                            </tr>
                        `)
                        .join("");
                }
            }

// ==========================================
// RENDIMIENTO DEL JUGADOR POR MAPA
// ==========================================

const mapStatsBody = $("playerProfileMapStats");

if (mapStatsBody) {
    const statsByMap = new Map();

    // Agrupar las estadísticas según el mapa.
    playerStats.forEach((stat) => {
        const mapName = String(stat.map || "").trim();

        // No incluir partidas antiguas que no tengan mapa registrado.
        if (!mapName) return;

        if (!statsByMap.has(mapName)) {
            statsByMap.set(mapName, {
                map: mapName,
                matchKeys: new Set(),
                kills: 0,
                damage: 0
            });
        }

        const mapStats = statsByMap.get(mapName);

        // Contabilizar cada partida una sola vez.
        const matchKey =
            `${stat.matchDate}|${stat.blockNumber}|${stat.roomNumber}`;

        mapStats.matchKeys.add(matchKey);

        mapStats.kills += stat.kills;
        mapStats.damage += stat.damage;
    });

    const mapResults = [...statsByMap.values()].sort(
        (a, b) => a.map.localeCompare(b.map, "es")
    );

    if (mapResults.length === 0) {
        mapStatsBody.innerHTML = `
            <tr>
                <td colspan="5">
                    Todavía no hay estadísticas registradas por mapa.
                </td>
            </tr>
        `;
    } else {
        mapStatsBody.innerHTML = mapResults
            .map((mapStats) => {
                const matches = mapStats.matchKeys.size;

                const averageKills = matches > 0
                    ? (mapStats.kills / matches).toFixed(2)
                    : "0.00";

                return `
                    <tr>
                        <td>${escapeHTML(mapStats.map)}</td>
                        <td>${matches}</td>
                        <td>${mapStats.kills}</td>
                        <td>
                            ${mapStats.damage.toLocaleString("es-CO")}
                        </td>
                        <td>${averageKills}</td>
                    </tr>
                `;
            })
            .join("");
    }
}

const kd = totals.deaths > 0
    ? (totals.kills / totals.deaths).toFixed(2)
    : (totals.kills > 0 ? "∞" : "0.00");

const averageKills = totalMatches > 0
    ? (totals.kills / totalMatches).toFixed(2)
    : "0.00";

const averageDamage = totalMatches > 0
    ? Math.round(totals.damage / totalMatches).toLocaleString("es-CO")
    : "0";

// Mostrar los resultados en la ficha individual.
setText("playerProfileMatches", String(totalMatches), "0");
setText("playerProfileKills", totals.kills.toLocaleString("es-CO"), "0");
setText("playerProfileDamage", totals.damage.toLocaleString("es-CO"), "0");
setText("playerProfileKD", kd, "0.00");
setText("playerProfileAverageKills", averageKills, "0.00");
setText("playerProfileAverageDamage", averageDamage, "0");
setText("playerProfileKnockdowns", String(totals.knockdowns), "0");
setText("playerProfileDeaths", String(totals.deaths), "0");
setText("playerProfileTop3", String(top3), "0");
setText("playerProfileTop5", String(top5), "0");
setText("playerProfileBooyahs", String(booyahs), "0");

            playerProfileModal.hidden = false;
            document.body.style.overflow = "hidden";

            $("closePlayerProfile")?.focus();
        }

        function closePlayerProfile() {
            if (!playerProfileModal) return;

            playerProfileModal.hidden = true;

            const otherModalOpen = [
                $("playerModal"),
                $("rosterModal"),
                $("rosterDetailsModal"),
                $("modalEliminarRoster"),
                $("modalEliminarJugador")
            ].some((modal) =>
                modal &&
                !modal.hidden &&
                (
                    modal.id !== "rosterDetailsModal" ||
                    modal.classList.contains("is-open")
                )
            );

            if (!otherModalOpen) {
                document.body.style.overflow = "";
            }
        }

        if (playerProfileModal) {
            playerProfileModal.addEventListener("click", (event) => {
                if (event.target.closest("[data-close-player-profile]")) {
                    closePlayerProfile();
                }
            });

            document.addEventListener("keydown", (event) => {
                if (
                    event.key === "Escape" &&
                    !playerProfileModal.hidden
                ) {
                    closePlayerProfile();
                }
            });
        }

        function refreshRosterOptions() {
            const selectedRoster = rosterSelect.value;
            const selectedFilter = rosterFilter.value;

            rosterSelect.innerHTML = `
                <option value="">Seleccionar roster</option>
                ${state.rosters.map((roster) => `
                    <option value="${escapeHTML(roster.id)}">
                        ${escapeHTML(roster.name)}
                        ${roster.tag ? ` [${escapeHTML(roster.tag)}]` : ""}
                    </option>
                `).join("")}
            `;

            rosterFilter.innerHTML = `
                <option value="">Todos los rosters</option>
                ${state.rosters.map((roster) => `
                    <option value="${escapeHTML(roster.id)}">
                        ${escapeHTML(roster.name)}
                    </option>
                `).join("")}
            `;

            if (state.rosters.some(
                (roster) => String(roster.id) === selectedRoster
            )) {
                rosterSelect.value = selectedRoster;
            }

            if (state.rosters.some(
                (roster) => String(roster.id) === selectedFilter
            )) {
                rosterFilter.value = selectedFilter;
            }
        }

        function openModal() {
            form.reset();
            refreshRosterOptions();

            modal.hidden = false;
            document.body.style.overflow = "hidden";
            nickInput?.focus();
        }

        function closeModal() {
            modal.hidden = true;
            document.body.style.overflow = "";
            form.reset();
            openButton.focus();
        }

        function renderPlayers() {
            refreshRosterOptions();

            const query = searchInput.value.trim().toLowerCase();
            const selectedRoster = rosterFilter.value;

            const filtered = state.players.filter((player) => {
                const matchesSearch = [
                    player.nick,
                    player.name,
                    player.rosterName,
                    player.role,
                    player.region
                ].some((value) =>
                    String(value || "").toLowerCase().includes(query)
                );

                const matchesRoster = !selectedRoster ||
                    String(player.rosterId) === selectedRoster;

                return matchesSearch && matchesRoster;
            });

            if (totalPlayers) totalPlayers.textContent = state.players.length;

            if (activePlayers) {
                activePlayers.textContent = state.players.filter(
                    (player) => player.status === "Activo"
                ).length;
            }

            if (linkedRosters) {
                linkedRosters.textContent = new Set(
                    state.players
                        .filter((player) => player.rosterId !== "")
                        .map((player) => String(player.rosterId))
                ).size;
            }

            if (playerCount) {
                playerCount.textContent =
                    `${filtered.length} ${filtered.length === 1 ? "jugador" : "jugadores"}`;
            }

            if (filtered.length === 0) {
                playerList.innerHTML = `
                    <div class="roster-empty">
                        <span class="module-symbol">♙</span>
                        <h3>${query || selectedRoster
                            ? "No encontramos jugadores"
                            : "Tu plantilla comienza aquí"
                        }</h3>
                        <p>${query || selectedRoster
                            ? "Prueba otra búsqueda o cambia el filtro."
                            : "Registra tu primer jugador para comenzar."
                        }</p>
                    </div>
                `;
                return;
            }

            playerList.innerHTML = filtered.map((player) => `
                
<article
    class="roster-item player-item"
    data-player-id="${escapeHTML(player.id)}"
    tabindex="0"
    aria-label="Ver perfil de ${escapeHTML(player.nick)}"
>

                    <div class="roster-item-mark player-mark">
                        ${player.photo
                            ? `<img
                                src="${escapeHTML(player.photo)}"
                                alt="Foto de ${escapeHTML(player.nick)}"
                                class="player-card-photo"
                            >`
                            : escapeHTML((player.nick || "?").charAt(0).toUpperCase())
                        }
                    </div>

                    <div class="roster-item-info">
                        <h4>${escapeHTML(player.nick)}</h4>
                        <p>${escapeHTML(player.name || "Nombre no registrado")}</p>
                    </div>

                    <div class="roster-item-meta">
                        <span>${escapeHTML(player.rosterName || "Sin roster")}</span>
                        <span>${escapeHTML(player.role || "Rol sin definir")}</span>
                        <span class="roster-status">${escapeHTML(player.status || "Sin estado")}</span>

                        <button
                            type="button"
                            class="player-delete-button"
                            data-delete-player="${escapeHTML(player.id)}"
                            aria-label="Eliminar a ${escapeHTML(player.nick)}"
                        >Eliminar</button>
                    </div>

                    ${player.region
                        ? `<p class="roster-item-description">Región: ${escapeHTML(player.region)}</p>`
                        : ""
                    }

                    ${player.notes
                        ? `<p class="roster-item-description">${escapeHTML(player.notes)}</p>`
                        : ""
                    }
                </article>
            `).join("");
        }

        function closeDeleteModal() {
            if (deleteModal) deleteModal.hidden = true;
            playerPendingDelete = null;
            document.body.style.overflow = "";
        }

        openButton.addEventListener("click", openModal);

        modal.querySelectorAll("[data-close-player]").forEach((element) => {
            element.addEventListener("click", closeModal);
        });

        searchInput.addEventListener("input", renderPlayers);
        rosterFilter.addEventListener("change", renderPlayers);

        
        playerList.addEventListener("click", (event) => {
            // Mantener funcionando el botón para eliminar jugadores.
            const button = event.target.closest("[data-delete-player]");

            if (button) {
                event.stopPropagation();

                const player = state.players.find(
                    (item) => String(item.id) === button.dataset.deletePlayer
                );

                if (!player || !deleteModal) return;

                playerPendingDelete = player.id;

                if (deleteName) {
                    deleteName.textContent = player.nick;
                }

                deleteModal.hidden = false;
                document.body.style.overflow = "hidden";
                confirmDelete?.focus();

                return;
            }

            // Abrir el perfil del jugador seleccionado.
            const card = event.target.closest(".player-item");

            if (!card) return;

            const player = state.players.find(
                (item) => String(item.id) === card.dataset.playerId
            );

            if (player) {
                openPlayerProfile(player);
            }
        });

        // Permitir abrir el perfil con Enter o la barra espaciadora.
        playerList.addEventListener("keydown", (event) => {
            if (
                event.target.classList.contains("player-item") &&
                (event.key === "Enter" || event.key === " ")
            ) {
                event.preventDefault();

                const player = state.players.find(
                    (item) =>
                        String(item.id) === event.target.dataset.playerId
                );

                if (player) {
                    openPlayerProfile(player);
                }
            }
        });

        cancelDelete?.addEventListener("click", closeDeleteModal);

        deleteModal?.addEventListener("click", (event) => {
            if (event.target === deleteModal) closeDeleteModal();
        });

        confirmDelete?.addEventListener("click", async () => {
            if (playerPendingDelete === null) return;

            if (!state.user) {
                showError("Inicia sesión para eliminar un jugador.");
                return;
            }

            const button = confirmDelete;
            button.disabled = true;

            try {
                const { error } = await supabaseClient
                    .from("players")
                    .delete()
                    .eq("id", playerPendingDelete);

                if (error) throw error;

                state.players = state.players.filter(
                    (player) =>
                        String(player.id) !== String(playerPendingDelete)
                );

                saveLocalBackup();
                closeDeleteModal();
                renderPlayers();
                renderRosters();
            } catch (error) {
                console.error("Error eliminando jugador:", error);
                showError(
                    error.message || "No se pudo eliminar el jugador."
                );
            } finally {
                button.disabled = false;
            }
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!state.user) {
                showError("Inicia sesión antes de guardar un jugador.");
                return;
            }

            const nick = nickInput.value.trim();
            const rosterId = rosterSelect.value;
            const roster = getRosterById(rosterId);

            if (!nick) {
                nickInput.focus();
                return;
            }

            if (!roster) {
                showError("Selecciona un roster existente.");
                rosterSelect.focus();
                return;
            }

            const duplicateNick = state.players.some(
                (player) => player.nick.toLowerCase() === nick.toLowerCase()
            );

            if (duplicateNick) {
                showError("Ya existe un jugador con ese nick.");
                nickInput.focus();
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');

            if (!submitButton) return;

            submitButton.disabled = true;
            submitButton.textContent = "Guardando...";

            try {
                const photoInput = $("playerPhoto");
                const photo = await prepareImage(
                    photoInput?.files?.[0]
                );

                const row = {
                    user_id: state.user.id,
                    nick,
                    name: nameInput.value.trim() || null,
                    roster_id: Number(roster.id),
                    roster_name: roster.name,
                    role: roleInput.value || null,
                    status: statusInput.value || "Activo",
                    region: regionInput.value || null,
                    notes: notesInput.value.trim() || null,
                    photo: photo || null
                };

                const { data, error } = await supabaseClient
                    .from("players")
                    .insert(row)
                    .select("*")
                    .single();

                if (error) throw error;

                state.players.push(mapPlayer(data));
                saveLocalBackup();

                searchInput.value = "";
                rosterFilter.value = "";
                renderPlayers();
                renderRosters();
                closeModal();
            } catch (error) {
                console.error("Error guardando jugador:", error);

                showError(
                    error.message || "No se pudo guardar el jugador."
                );
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Guardar jugador";
            }
        });

        return { renderPlayers, openModal, closeModal };
    }


/* =====================================================
   MÓDULO DE ESTADÍSTICAS DE PARTIDAS
===================================================== */

function initMatchStatsModule() {
    const form = document.getElementById("matchStatsForm");
    const rosterSelect = document.getElementById("statsRoster");
    const playersContainer = document.getElementById("statsPlayersContainer");
    const message = document.getElementById("matchStatsMessage");
    const saveButton = document.getElementById("saveMatchStatsButton");
    const dateInput = document.getElementById("statsMatchDate");

    if (
        !form ||
        !rosterSelect ||
        !playersContainer ||
        !message ||
        !saveButton ||
        !dateInput
    ) {
        console.error(
            "LOPZEK: No se encontraron todos los elementos del formulario de estadísticas."
        );

        return {
            renderMatchStats: () => {}
        };
    }

    // Colocar la fecha actual como valor inicial.
    const today = new Date();
    dateInput.value = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    // Evitar interpretar nombres de jugadores como código HTML.
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    // Cargar los rosters disponibles.
    function renderRosterOptions() {
        const previousRoster = rosterSelect.value;

        rosterSelect.innerHTML =
            '<option value="">Selecciona un roster</option>';

        state.rosters.forEach((roster) => {
            const option = document.createElement("option");

            option.value = String(roster.id);
            option.textContent = roster.name || "Roster sin nombre";

            rosterSelect.appendChild(option);
        });

        const rosterStillExists = state.rosters.some(
            (roster) => String(roster.id) === previousRoster
        );

        if (rosterStillExists) {
            rosterSelect.value = previousRoster;
        }

        renderPlayerRows();
    }

    // Mostrar los jugadores del roster seleccionado.
    function renderPlayerRows() {
        const rosterId = rosterSelect.value;

        message.textContent = "";
        message.className = "form-message";

        if (!rosterId) {
            playersContainer.innerHTML = `
                <p class="empty-state">
                    Selecciona un roster para continuar.
                </p>
            `;

            return;
        }

        const rosterPlayers = state.players.filter(
            (player) => String(player.rosterId) === String(rosterId)
        );

        if (rosterPlayers.length === 0) {
            playersContainer.innerHTML = `
                <p class="empty-state">
                    Este roster todavía no tiene jugadores registrados.
                </p>
            `;

            return;
        }

        playersContainer.innerHTML = rosterPlayers.map((player) => `
            <div class="stats-player-row"
                 data-player-id="${escapeHTML(player.id)}">

                <div class="stats-player-identity">
                    <strong>${escapeHTML(player.nick || player.name || "Jugador")}</strong>
                    <span>${escapeHTML(player.name || "")}</span>
                </div>

                <div class="stats-player-fields">

                    <label>
                        Kills
                        <input
                            type="number"
                            data-stat="kills"
                            min="0"
                            step="1"
                            value="0"
                            required
                        >
                    </label>

                    <label>
                        Daño
                        <input
                            type="number"
                            data-stat="damage"
                            min="0"
                            step="1"
                            value="0"
                            required
                        >
                    </label>

                    <label>
                        Asistencias
                        <input
                            type="number"
                            data-stat="assists"
                            min="0"
                            step="1"
                            value="0"
                            required
                        >
                    </label>

                    <label>
                        Derribos
                        <input
                            type="number"
                            data-stat="knockdowns"
                            min="0"
                            step="1"
                            value="0"
                            required
                        >
                    </label>

                    <label>
                        Muertes
                        <input
                            type="number"
                            data-stat="deaths"
                            min="0"
                            step="1"
                            value="0"
                            required
                        >
                    </label>

                    
                    <label>
                        Estrategia (1–10)
                        <input
                            type="number"
                            data-stat="strategy_score"
                            min="1"
                            max="10"
                            step="1"
                            placeholder="Sin evaluar"
                        >
                    </label>

                    <label>
                        Movilidad (1–10)
                        <input
                            type="number"
                            data-stat="mobility_score"
                            min="1"
                            max="10"
                            step="1"
                            placeholder="Sin evaluar"
                        >
                    </label>

                </div>
            </div>
        `).join("");
    }

    // Actualizar los jugadores cuando cambia el roster.
    rosterSelect.addEventListener("change", renderPlayerRows);

    // Guardar los resultados en Supabase.
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        message.textContent = "";

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient?.auth
        ) {
            message.textContent =
                "No se pudo conectar con Supabase.";
            return;
        }

        const rosterId = rosterSelect.value;
        const matchDate = dateInput.value;
        const blockNumber = Number(
            document.getElementById("statsBlock").value
        );
        const roomNumber = Number(
            document.getElementById("statsRoom").value
        );

        const map = document.getElementById("statsMap").value;
        const position = Number(
            document.getElementById("statsPosition").value
        );

        if (
    !rosterId ||
    !matchDate ||
    !blockNumber ||
    !roomNumber ||
    !map ||
    !position
) {
    message.textContent =
        "Completa la fecha, el roster, el bloque, la sala, el mapa y la posición.";
    return;
}

        const playerRows = [
            ...playersContainer.querySelectorAll(".stats-player-row")
        ];

        if (playerRows.length === 0) {
            message.textContent =
                "El roster seleccionado no tiene jugadores para registrar.";
            return;
        }

        const records = [];

        for (const row of playerRows) {
            const playerId = Number(row.dataset.playerId);

            if (!Number.isSafeInteger(playerId) || playerId <= 0) {
                message.textContent =
                    "Se encontró un identificador de jugador no válido.";
                return;
            }

            const record = {
                player_id: playerId
            };

            for (const field of [
                "kills",
                "damage",
                "assists",
                "knockdowns",
                "deaths"
            ]) {
                const input = row.querySelector(
                    `[data-stat="${field}"]`
                );
                const value = Number(input.value);

                if (
                    input.value.trim() === "" ||
                    !Number.isSafeInteger(value) ||
                    value < 0
                ) {
                    message.textContent =
                        "Todos los resultados deben ser números enteros iguales o mayores que cero.";
                    input.focus();
                    return;
                }

                record[field] = value;
            }

            
for (const field of [
    "strategy_score",
    "mobility_score"
]) {
    const input = row.querySelector(
        `[data-stat="${field}"]`
    );

    const rawValue = input.value.trim();

    if (rawValue === "") {
        record[field] = null;
        continue;
    }

    const value = Number(rawValue);

    if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > 10
    ) {
        message.textContent =
            "Estrategia y Movilidad deben ser números enteros entre 1 y 10.";
        input.focus();
        return;
    }

    record[field] = value;
}

            records.push(record);
        }

        saveButton.disabled = true;
        saveButton.textContent = "Guardando...";

        try {
            const { data: userData, error: userError } =
                await supabaseClient.auth.getUser();

            if (userError) throw userError;

            const user = userData?.user;

            if (!user) {
                throw new Error(
                    "Tu sesión no está activa. Inicia sesión nuevamente."
                );
            }
       
const rowsToSave = records.map((record) => ({
    ...record,
    user_id: user.id,
    match_date: matchDate,
    block_number: blockNumber,
    room_number: roomNumber,
    map: map,
    position: position
}));

            const { error: saveError } = await supabaseClient
                .from("match_player_stats")
                .upsert(rowsToSave, {
                    onConflict:
                        "user_id,player_id,match_date,block_number,room_number"
                });

            if (saveError) throw saveError;

            state.matchPlayerStats = [];

            await loadDataFromSupabase();

            message.textContent =
                "Resultados guardados correctamente.";
            message.className = "form-message success";

        } catch (error) {
            console.error(
                "LOPZEK: Error guardando estadísticas:",
                error
            );

            message.textContent =
                error.message ||
                "No fue posible guardar los resultados.";
            message.className = "form-message error";

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Guardar resultados";
        }
    });

    // Permitir actualizar los rosters después de cargar los datos.
    window.renderMatchStats = renderRosterOptions;

    renderRosterOptions();

    return {
        renderMatchStats: renderRosterOptions
    };
}


/* =====================================================
   LOPZEK — MÓDULO DE INFORMES
   Calendario, historial diario, semanal y mensual
===================================================== */

function initReportsModule() {
    const dailyList = $("reportsDailyList");
    const calendar = $("reportsCalendar");
    const monthLabel = $("reportsMonthLabel");
    const periodSummary = $("reportsPeriodSummary");
    const reportsTypeFilter = $("reportsTypeFilter");
    const reportsRosterFilter = $("reportsRosterFilter");
    const reportsPlayerFilter = $("reportsPlayerFilter");
    const reportsRosterFilterGroup = $("reportsRosterFilterGroup");
    const reportsPlayerFilterGroup = $("reportsPlayerFilterGroup");

    if (!dailyList || !calendar || !monthLabel || !periodSummary) {
        console.warn("LOPZEK: Faltan elementos HTML de Informes.");
        return { renderReports: () => {} };
    }

    const today = new Date();

    let selectedDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    let visibleYear = today.getFullYear();
    let visibleMonth = today.getMonth();
    let selectedMode = "day";

    const pad = (number) => String(number).padStart(2, "0");

    function dateKey(year, month, day) {
        return `${year}-${pad(month + 1)}-${pad(day)}`;
    }

    function parseDate(value) {
        const [year, month, day] = String(value).split("-").map(Number);
        return new Date(year, month - 1, day, 12);
    }

    function formatDate(value) {
        return parseDate(value).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function getWeekDates(value) {
        const date = parseDate(value);
        const mondayOffset = (date.getDay() + 6) % 7;

        date.setDate(date.getDate() - mondayOffset);

        return Array.from({ length: 5 }, (_, index) => {
            const day = new Date(date);
            day.setDate(date.getDate() + index);

            return dateKey(
                day.getFullYear(),
                day.getMonth(),
                day.getDate()
            );
        });
    }

    function getMatches(dateList) {
        const allowedDates = new Set(dateList);
        const grouped = new Map();

        state.matchPlayerStats.forEach((stat) => {
            if (!allowedDates.has(String(stat.matchDate))) return;

            const key =
                `${stat.matchDate}|${stat.blockNumber}|${stat.roomNumber}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    key,
                    date: stat.matchDate,
                    block: stat.blockNumber,
                    room: stat.roomNumber,
                    map: stat.map || "Sin mapa",
                    position: stat.position,
                    kills: 0,
                    damage: 0,
                    assists: 0,
                    players: 0
                });
            }

            const match = grouped.get(key);

            match.kills += stat.kills;
            match.damage += stat.damage;
            match.assists += stat.assists;
            match.players += 1;

            if (stat.position != null) {
                match.position = stat.position;
            }

            if (stat.map) {
                match.map = stat.map;
            }
        });

        return [...grouped.values()].sort((a, b) =>
            a.date.localeCompare(b.date) ||
            a.block - b.block ||
            a.room - b.room
        );
    }

    function renderCalendar() {
        const firstDay = new Date(visibleYear, visibleMonth, 1);
        const daysInMonth = new Date(
            visibleYear,
            visibleMonth + 1,
            0
        ).getDate();

        const mondayOffset = (firstDay.getDay() + 6) % 7;

        const monthName = firstDay.toLocaleDateString("es-CO", {
            month: "long",
            year: "numeric"
        });

        monthLabel.textContent =
            monthName.charAt(0).toUpperCase() + monthName.slice(1);

        const activeDates = new Set(
            state.matchPlayerStats.map((stat) => String(stat.matchDate))
        );

        let daysHTML = "";

        ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
            .forEach((day) => {
                daysHTML += `<span class="reports-weekday">${day}</span>`;
            });

        for (let i = 0; i < mondayOffset; i++) {
            daysHTML += `<span class="reports-calendar-blank"></span>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const key = dateKey(visibleYear, visibleMonth, day);
            const hasMatches = activeDates.has(key);
            const selected = key === selectedDate;

            daysHTML += `
                <button
                    type="button"
                    class="reports-calendar-day
                        ${hasMatches ? "has-matches" : ""}
                        ${selected ? "is-selected" : ""}"
                    data-report-date="${key}"
                    aria-label="${key}${hasMatches ? ", con partidas" : ""}"
                >
                    ${day}
                    ${hasMatches ? '<span class="reports-day-dot"></span>' : ""}
                </button>
            `;
        }

        calendar.innerHTML = `
            <div class="reports-calendar-navigation">
                <button type="button" data-report-action="previous-month"
                    aria-label="Mes anterior">‹</button>

                <strong>${monthLabel.textContent}</strong>

                <button type="button" data-report-action="next-month"
                    aria-label="Mes siguiente">›</button>
            </div>

            <div class="reports-calendar-grid">
                ${daysHTML}
            </div>

            <p class="reports-calendar-legend">
                <span class="reports-day-dot"></span>
                Día con partidas registradas
            </p>
        `;
    }

    function renderDailyList() {
        const weekDates = getWeekDates(selectedDate);
        const weekdayNames = [
            "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"
        ];

        dailyList.innerHTML = `
            <div class="reports-period-controls">
                <button type="button" data-report-mode="day"
                    class="${selectedMode === "day" ? "is-active" : ""}">
                    Día
                </button>

                <button type="button" data-report-mode="week"
                    class="${selectedMode === "week" ? "is-active" : ""}">
                    Semana
                </button>

                <button type="button" data-report-mode="month"
                    class="${selectedMode === "month" ? "is-active" : ""}">
                    Mes
                </button>
            </div>

            <p class="reports-list-caption">
                Semana de lunes a viernes
            </p>

            ${weekDates.map((date, index) => {
                const matches = getMatches([date]);

                return `
                    <button
                        type="button"
                        class="reports-daily-item
                            ${date === selectedDate ? "is-selected" : ""}"
                        data-report-date="${date}"
                    >
                        <span class="reports-daily-date">
                            <strong>${weekdayNames[index]}</strong>
                            <small>${pad(parseDate(date).getDate())}/${pad(parseDate(date).getMonth() + 1)}</small>
                        </span>

                        <span class="reports-daily-count">
                            ${matches.length}
                            ${matches.length === 1 ? "partida" : "partidas"}
                        </span>
                    </button>
                `;
            }).join("")}
        `;
    }

    
function renderSummary() {
    let dates = [selectedDate];
    let title = `Jornada del ${formatDate(selectedDate)}`;

    if (selectedMode === "week") {
        dates = getWeekDates(selectedDate);
        title = "Resumen semanal · lunes a viernes";
    }

    if (selectedMode === "month") {
        const totalDays = new Date(
            visibleYear,
            visibleMonth + 1,
            0
        ).getDate();

        dates = Array.from({ length: totalDays }, (_, index) =>
            dateKey(visibleYear, visibleMonth, index + 1)
        );

        title = `Resumen mensual · ${monthLabel.textContent}`;
    }

    const allowedDates = new Set(dates);

    const selectedType = reportsTypeFilter?.value || "general";
    const selectedRosterId = reportsRosterFilter?.value || "";
    const selectedPlayerId = reportsPlayerFilter?.value || "";

    const periodStats = state.matchPlayerStats.filter((stat) =>
        allowedDates.has(String(stat.matchDate))
    );

    const getPlayerStats = (player) => {
        const stats = periodStats.filter(
            (stat) => String(stat.playerId) === String(player.id)
        );

        const matches = new Set(
            stats.map((stat) =>
                `${stat.matchDate}|${stat.blockNumber}|${stat.roomNumber}`
            )
        );

        return {
            player,
            matches: matches.size,
            kills: stats.reduce((sum, stat) => sum + Number(stat.kills || 0), 0),
            damage: stats.reduce((sum, stat) => sum + Number(stat.damage || 0), 0),
            assists: stats.reduce((sum, stat) => sum + Number(stat.assists || 0), 0),
            knockdowns: stats.reduce(
                (sum, stat) => sum + Number(stat.knockdowns || 0), 0
            ),
            deaths: stats.reduce((sum, stat) => sum + Number(stat.deaths || 0), 0)
        };
    };

    const renderPlayerCard = (item) => {
        const photo = item.player.photo || "assets/avatar-default.png";

        return `
            <article class="reports-player-card">
                <div class="reports-player-card-header">
                    <img
                        src="${photo}"
                        alt="Foto de ${item.player.nick || "jugador"}"
                        class="reports-player-photo"
                        onerror="this.onerror=null;this.src='assets/avatar-default.png';"
                    >

                    <div>
                        <h4>${item.player.nick || "Sin nick"}</h4>
                        <p>${item.player.role || "Sin rol asignado"}</p>
                    </div>
                </div>

                <div class="reports-player-stats">
                    <div>
                        <span>Partidas</span>
                        <strong>${item.matches}</strong>
                    </div>
                    <div>
                        <span>Kills</span>
                        <strong>${item.kills.toLocaleString("es-CO")}</strong>
                    </div>
                    <div>
                        <span>Daño</span>
                        <strong>${item.damage.toLocaleString("es-CO")}</strong>
                    </div>
                    <div>
                        <span>Asistencias</span>
                        <strong>${item.assists.toLocaleString("es-CO")}</strong>
                    </div>
                    <div>
                        <span>Derribos</span>
                        <strong>${item.knockdowns.toLocaleString("es-CO")}</strong>
                    </div>
                    <div>
                        <span>Muertes</span>
                        <strong>${item.deaths.toLocaleString("es-CO")}</strong>
                    </div>
                </div>
            </article>
        `;
    };

    // INFORME POR ROSTER
    if (selectedType === "roster") {
        const roster = state.rosters.find(
            (item) => String(item.id) === String(selectedRosterId)
        );

        if (!roster) {
            periodSummary.innerHTML = `
                <div class="reports-empty-message">
                    Selecciona un roster para generar su informe.
                </div>
            `;
            return;
        }

        const rosterPlayers = state.players.filter(
            (player) => String(player.rosterId) === String(roster.id)
        );

        const playersWithStats = rosterPlayers
            .map(getPlayerStats)
            .sort((a, b) => b.kills - a.kills);

        const totals = playersWithStats.reduce((sum, item) => ({
    matches: sum.matches + item.matches,
    kills: sum.kills + item.kills,
    damage: sum.damage + item.damage,
    assists: sum.assists + item.assists,
    knockdowns: sum.knockdowns + item.knockdowns,
    deaths: sum.deaths + item.deaths
}), {
    matches: 0,
    kills: 0,
    damage: 0,
    assists: 0,
    knockdowns: 0,
    deaths: 0
});

        periodSummary.innerHTML = `
            <div class="reports-roster-heading">
                ${roster.image ? `
                    <img
                        src="${roster.image}"
                        alt="Logo de ${roster.name || "roster"}"
                        class="reports-roster-image"
                    >
                ` : ""}

                <div>
                    <h3>${roster.name || "Roster sin nombre"}</h3>
                    <p>${roster.tag || ""} · ${title}</p>
                </div>
            </div>

            <div class="reports-summary-grid">
                <div class="reports-summary-stat">
                    <span>Jugadores</span>
                    <strong>${rosterPlayers.length}</strong>
                </div>
                <div class="reports-summary-stat">
                    <span>Kills del roster</span>
                    <strong>${totals.kills.toLocaleString("es-CO")}</strong>
                </div>
                <div class="reports-summary-stat">
                    <span>Daño del roster</span>
                    <strong>${totals.damage.toLocaleString("es-CO")}</strong>
                </div>
                <div class="reports-summary-stat">
                    <span>Asistencias</span>
                    <strong>${totals.assists.toLocaleString("es-CO")}</strong>
                </div>
                
                <div class="reports-summary-stat">
    <span>Derribos</span>
    <strong>${totals.knockdowns.toLocaleString("es-CO")}</strong>
</div>

<div class="reports-summary-stat">
    <span>Muertes</span>
    <strong>${totals.deaths.toLocaleString("es-CO")}</strong>
</div>

            </div>

            <h4 class="reports-summary-subtitle">Rendimiento de los jugadores</h4>

            <div class="reports-player-cards-grid">
                ${playersWithStats.length
                    ? playersWithStats.map(renderPlayerCard).join("")
                    : `<div class="reports-empty-message">
                        Este roster todavía no tiene jugadores registrados.
                       </div>`
                }
            </div>
        `;
        return;
    }

    // INFORME INDIVIDUAL
    if (selectedType === "player") {
        const player = state.players.find(
            (item) => String(item.id) === String(selectedPlayerId)
        );

        if (!player) {
            periodSummary.innerHTML = `
                <div class="reports-empty-message">
                    Selecciona un jugador para generar su informe.
                </div>
            `;
            return;
        }

        const item = getPlayerStats(player);

        periodSummary.innerHTML = `
            <h4 class="reports-summary-title">${title}</h4>

            ${renderPlayerCard(item)}

            <div class="reports-summary-grid">
                <div class="reports-summary-stat">
                    <span>K/D</span>
                    <strong>
                        ${item.deaths
                            ? (item.kills / item.deaths).toFixed(2)
                            : item.kills.toFixed(2)}
                    </strong>
                </div>
                <div class="reports-summary-stat">
                    <span>Promedio de kills</span>
                    <strong>
                        ${item.matches
                            ? (item.kills / item.matches).toFixed(2)
                            : "0.00"}
                    </strong>
                </div>
                <div class="reports-summary-stat">
                    <span>Daño promedio</span>
                    <strong>
                        ${item.matches
                            ? Math.round(item.damage / item.matches).toLocaleString("es-CO")
                            : "0"}
                    </strong>
                </div>
            </div>
        `;
        return;
    }

    // INFORME GENERAL EXISTENTE
    const matches = getMatches(dates);

    const totals = matches.reduce((sum, match) => ({
        kills: sum.kills + match.kills,
        damage: sum.damage + match.damage,
        assists: sum.assists + match.assists
    }), { kills: 0, damage: 0, assists: 0 });

    const averageKills = matches.length
        ? (totals.kills / matches.length).toFixed(2)
        : "0.00";

    periodSummary.innerHTML = `
        <h4 class="reports-summary-title">${title}</h4>

        <div class="reports-summary-grid">
            <div class="reports-summary-stat">
                <span>Partidas</span>
                <strong>${matches.length}</strong>
            </div>

            <div class="reports-summary-stat">
                <span>Kills totales</span>
                <strong>${totals.kills.toLocaleString("es-CO")}</strong>
            </div>

            <div class="reports-summary-stat">
                <span>Daño total</span>
                <strong>${totals.damage.toLocaleString("es-CO")}</strong>
            </div>

            <div class="reports-summary-stat">
                <span>Asistencias</span>
                <strong>${totals.assists.toLocaleString("es-CO")}</strong>
            </div>

            <div class="reports-summary-stat">
                <span>Kills por partida</span>
                <strong>${averageKills}</strong>
            </div>
        </div>

        <h4 class="reports-summary-subtitle">Partidas del período</h4>

        ${matches.length ? matches.map((match) => `
            <article class="reports-match-item">
                <div>
                    <strong>${formatDate(match.date)}</strong>
                    <p>
                        Bloque ${match.block} · Sala ${match.room}
                        · ${match.map}
                    </p>
                </div>

                <div class="reports-match-results">
                    <span>${match.kills} kills</span>
                    <span>${match.damage.toLocaleString("es-CO")} daño</span>
                    <span>
                        ${match.position != null
                            ? `Posición ${match.position}`
                            : "Sin posición"}
                    </span>
                </div>
            </article>
        `).join("") : `
            <div class="reports-empty-message">
                No hay partidas registradas para este período.
                Cuando guardes resultados en Estadísticas,
                aparecerán aquí automáticamente.
            </div>
        `}
    `;
}

    function renderReports() {
        renderCalendar();
        renderDailyList();
        renderSummary();
    }
    
function updateReportFilters() {
    if (!reportsTypeFilter) return;

    const type = reportsTypeFilter.value;

    if (reportsRosterFilterGroup) {
        reportsRosterFilterGroup.style.display =
            type === "roster" ? "" : "none";
    }

    if (reportsPlayerFilterGroup) {
        reportsPlayerFilterGroup.style.display =
            type === "player" ? "" : "none";
    }

    if (reportsRosterFilter) {
        const currentRoster = reportsRosterFilter.value;

        reportsRosterFilter.innerHTML = `
            <option value="">Selecciona un roster</option>
            ${state.rosters.map((roster) => `
                <option value="${roster.id}">
                    ${roster.name || roster.tag || "Roster sin nombre"}
                </option>
            `).join("")}
        `;

        if (state.rosters.some(
            (roster) => String(roster.id) === currentRoster
        )) {
            reportsRosterFilter.value = currentRoster;
        }
    }

    if (reportsPlayerFilter) {
        const currentPlayer = reportsPlayerFilter.value;

        reportsPlayerFilter.innerHTML = `
            <option value="">Selecciona un jugador</option>
            ${state.players.map((player) => `
                <option value="${player.id}">
                    ${player.nick || player.name || "Jugador sin nick"}
                </option>
            `).join("")}
        `;

        if (state.players.some(
            (player) => String(player.id) === currentPlayer
        )) {
            reportsPlayerFilter.value = currentPlayer;
        }
    }
}

reportsTypeFilter?.addEventListener("change", () => {
    updateReportFilters();
    renderSummary();
});

reportsRosterFilter?.addEventListener("change", renderSummary);
reportsPlayerFilter?.addEventListener("change", renderSummary);

    calendar.addEventListener("click", (event) => {
        const monthButton = event.target.closest("[data-report-action]");

        if (monthButton) {
            visibleMonth +=
                monthButton.dataset.reportAction === "next-month" ? 1 : -1;

            if (visibleMonth < 0) {
                visibleMonth = 11;
                visibleYear--;
            }

            if (visibleMonth > 11) {
                visibleMonth = 0;
                visibleYear++;
            }
};

        const dayButton = event.target.closest("[data-report-date]");

        if (dayButton) {
            selectedDate = dayButton.dataset.reportDate;
            const date = parseDate(selectedDate);

            visibleYear = date.getFullYear();
            visibleMonth = date.getMonth();

            renderReports();
        }
    });

    dailyList.addEventListener("click", (event) => {
        const modeButton = event.target.closest("[data-report-mode]");

        if (modeButton) {
            selectedMode = modeButton.dataset.reportMode;
            renderReports();
            return;
        }

        const dayButton = event.target.closest("[data-report-date]");

        if (dayButton) {
            selectedDate = dayButton.dataset.reportDate;
            const date = parseDate(selectedDate);

            visibleYear = date.getFullYear();
            visibleMonth = date.getMonth();

            selectedMode = "day";
            renderReports();
        }
    });

       updateReportFilters();
    renderReports();

    return {
        renderReports,
        updateReportFilters
    };
}

    /* =====================================================
       INICIALIZACIÓN
    ===================================================== */

    function init() {
        initNavigation();

        const rosterModule = initRosterModule();
        const playerModule = initPlayerModule();
        const matchStatsModule = initMatchStatsModule();
        const reportsModule = initReportsModule();
        
        window.renderRosters = rosterModule.renderRosters;
        window.renderPlayers = playerModule.renderPlayers;
        window.renderReports = reportsModule.renderReports;

        // Los módulos ya están preparados cuando llega este evento.
        window.addEventListener(
            "lopzek-authenticated",
            loadDataFromSupabase
        );

        // Cargar también si ya había una sesión válida.
        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient?.auth
        ) {
            supabaseClient.auth.getSession()
                .then(({ data, error }) => {
                    if (error) throw error;

                    if (data.session) {
                        return loadDataFromSupabase();
                    }
                })
                .catch((error) => {
                    console.error("Error comprobando sesión:", error);
                });
        }

        // Funciones de diagnóstico opcionales.
        window.lopzekReloadData = loadDataFromSupabase;

        // Primer render vacío; se actualizará al cargar Supabase.
        rosterModule?.renderRosters?.();
        playerModule?.renderPlayers?.();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
