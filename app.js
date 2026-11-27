/* =========================================================
   GENIUS IA V2.5.1
   AUTHENTIFICATION + CHAT IA + HISTORIQUE
   PROFIL + PARAMÈTRES + ADMINISTRATION
   CHAT MARKDOWN + SYNCHRONISATION
   Créateur : MARUCE SOLDADO 🇬🇳
========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const APP_NAME = "GENIUS IA";
const APP_VERSION = "2.5.1";

const API_BASE_URL = "https://genius-ia-sand.vercel.app";

const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;
const LOGIN_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
const REGISTER_ENDPOINT = `${API_BASE_URL}/api/auth/register`;
const PROFILE_ENDPOINT = `${API_BASE_URL}/api/auth/me`;
const UPDATE_PROFILE_ENDPOINT = `${API_BASE_URL}/api/profile`;
const PASSWORD_ENDPOINT = `${API_BASE_URL}/api/auth/password`;

const CONVERSATIONS_ENDPOINT = `${API_BASE_URL}/api/conversations`;

const ADMIN_DASHBOARD_ENDPOINT =
    `${API_BASE_URL}/api/admin/dashboard`;

const ADMIN_USERS_ENDPOINT =
    `${API_BASE_URL}/api/admin/users`;

const TOKEN_KEY = "genius_ia_token";
const USER_KEY = "genius_ia_user";
const ACTIVE_KEY = "genius_ia_active_v1";

let STORAGE_KEY = null;

let currentUser = null;
let conversations = [];
let activeConversation = null;

let isSending = false;
let eventsAttached = false;
let historySearchTimer = null;


/* =========================================================
   ÉLÉMENTS HTML
========================================================= */

const authScreen = document.getElementById("authScreen");
const mainApp = document.getElementById("mainApp");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const authMessage = document.getElementById("authMessage");

const welcome = document.getElementById("welcome");
const chatArea = document.getElementById("chatArea");
const messages = document.getElementById("messages");

const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");

const newChatButton = document.getElementById("newChat");
const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");

const historyButton = document.getElementById("historyButton");
const logoutButton = document.getElementById("logoutButton");

const userNameElement = document.getElementById("userName");
const userPhoneElement = document.getElementById("userPhone");
const userAvatar = document.getElementById("userAvatar");


/* =========================================================
   STYLES
========================================================= */

function injectGeniusStyles() {

    if (document.getElementById("genius-v24-styles")) return;

    const style = document.createElement("style");

    style.id = "genius-v24-styles";

    style.textContent = `

        .genius-panel {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: rgba(3, 8, 18, .96);
            backdrop-filter: blur(14px);
            overflow-y: auto;
            padding: 24px;
        }

        .genius-panel-inner {
            width: 100%;
            max-width: 950px;
            margin: 25px auto;
            background: #0d1728;
            border: 1px solid rgba(37,133,255,.25);
            border-radius: 18px;
            padding: 24px;
            color: #fff;
        }

        .genius-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 25px;
            flex-wrap: wrap;
        }

        .genius-panel-header h2 {
            margin: 0;
            font-size: 23px;
        }

        .genius-close {
            border: 0;
            border-radius: 9px;
            padding: 10px 15px;
            background: #1b2b43;
            color: white;
            cursor: pointer;
        }

        .genius-input {
            width: 100%;
            box-sizing: border-box;
            padding: 13px;
            margin: 7px 0 15px;
            background: #07111f;
            color: white;
            border: 1px solid #263c5c;
            border-radius: 9px;
            outline: none;
        }

        .genius-label {
            display: block;
            color: #aebed3;
            font-size: 13px;
            margin-top: 10px;
        }

        .genius-button {
            border: 0;
            border-radius: 9px;
            padding: 11px 16px;
            background: #2585ff;
            color: white;
            font-weight: 700;
            cursor: pointer;
            margin: 4px;
        }

        .genius-button.secondary {
            background: #1b2b43;
        }

        .genius-button.danger {
            background: #b92e45;
        }

        .genius-button:disabled {
            opacity: .5;
            cursor: not-allowed;
        }

        .genius-card {
            background: #101f34;
            border: 1px solid #203955;
            border-radius: 12px;
            padding: 17px;
            margin: 12px 0;
        }

        .genius-card h3 {
            margin: 0 0 8px;
            font-size: 16px;
        }

        .genius-card p {
            color: #a9bad0;
            font-size: 13px;
            overflow-wrap: anywhere;
        }

        .genius-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 12px;
        }

        .genius-stat-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
        }

        .genius-stat {
            background: #101f34;
            border: 1px solid #203955;
            padding: 17px;
            border-radius: 12px;
        }

        .genius-stat strong {
            display: block;
            font-size: 25px;
            color: #36a0ff;
            margin-top: 8px;
        }

        .genius-empty {
            padding: 35px 15px;
            text-align: center;
            color: #a9bad0;
        }

        .genius-status {
            color: #36d995;
            font-size: 12px;
        }

        .genius-status.off {
            color: #ff6878;
        }

        .genius-panel-message {
            color: #36d995;
            margin: 10px 0;
            font-size: 13px;
        }

        .genius-panel-message.error {
            color: #ff6878;
        }

        .genius-panel-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        @media(max-width:650px) {

            .genius-panel {
                padding: 10px;
            }

            .genius-panel-inner {
                margin: 5px auto;
                padding: 16px;
            }

            .genius-stat-grid {
                grid-template-columns: repeat(2, 1fr);
            }

        }

    `;

    document.head.appendChild(style);
}


/* =========================================================
   STYLES CHAT V2.5
========================================================= */

function injectGeniusChatStyles() {

    if (document.getElementById("genius-v25-chat-styles")) return;

    const style = document.createElement("style");

    style.id = "genius-v25-chat-styles";

    style.textContent = `

        #messages {
            background: #000000 !important;
        }

        .user-message,
        .assistant-message {
            margin: 20px 0;
            animation: geniusMessageIn .3s ease;
        }

        .user-message .message-content,
        .assistant-message .message-content {
            background: #0c1422;
            border: 1px solid #1c2b40;
            border-radius: 15px;
            padding: 16px;
            color: #ffffff;
            max-width: 100%;
            overflow-wrap: anywhere;
        }

        .user-message .message-content {
            background: #10233c;
            border-color: #2585ff;
        }

        .message-content strong {
            display: block;
            color: #36a0ff;
            margin-bottom: 10px;
            font-size: 12px;
            letter-spacing: 1px;
        }

        .message-content p {
            color: #ffffff;
            line-height: 1.8;
            margin: 0;
            overflow-wrap: anywhere;
        }

        .message-content pre {
            overflow-x: auto;
            max-width: 100%;
        }

        .message-content code {
            overflow-wrap: anywhere;
        }

        .genius-message-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 12px;
        }

        .genius-message-actions button {
            background: #101d30;
            color: #b9d5f5;
            border: 1px solid #263d5c;
            border-radius: 8px;
            padding: 7px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: .2s;
        }

        .genius-message-actions button:hover {
            background: #2585ff;
            color: white;
            border-color: #2585ff;
        }

        .genius-message-actions button:disabled {
            opacity: .5;
            cursor: not-allowed;
        }

        .genius-code-block {
            background: #050a12;
            border: 1px solid #263d5c;
            border-radius: 10px;
            padding: 14px;
            overflow-x: auto;
            margin: 12px 0;
            color: #80d5ff;
            white-space: pre;
        }

        .genius-thinking-dots {
            display: flex;
            gap: 5px;
            padding: 10px 0;
        }

        .genius-thinking-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #2585ff;
            animation: geniusThinking 1s infinite ease-in-out;
        }

        .genius-thinking-dots span:nth-child(2) {
            animation-delay: .15s;
        }

        .genius-thinking-dots span:nth-child(3) {
            animation-delay: .3s;
        }

        @keyframes geniusThinking {
            0%, 80%, 100% {
                transform: translateY(0);
                opacity: .4;
            }
            40% {
                transform: translateY(-7px);
                opacity: 1;
            }
        }

        @keyframes geniusMessageIn {
            from {
                opacity: 0;
                transform: translateY(8px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media(max-width:650px) {
            .genius-message-actions button {
                padding: 8px 10px;
            }

            .message-content {
                max-width: 100%;
            }
        }

    `;

    document.head.appendChild(style);
}


/* =========================================================
   OUTILS GÉNÉRAUX
========================================================= */

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}


function getUserStorageKey(userId) {
    return `genius_ia_conversations_${userId}`;
}


function showAuthMessage(message, type = "error") {

    if (!authMessage) return;

    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
}


function setButtonLoading(button, loading, normalText) {

    if (!button) return;

    button.disabled = loading;

    button.textContent = loading
        ? "Patientez..."
        : normalText;
}


function generateID() {

    return "genius_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 9);
}


function getConversationTitle(text) {

    const cleanText = String(text || "").trim();

    if (!cleanText) return "Nouvelle conversation";

    return cleanText.length > 45
        ? cleanText.substring(0, 45) + "..."
        : cleanText;
}


function normalizeConversation(conversation) {

    return {

        id: conversation.id,

        title: conversation.title || "Nouvelle conversation",

        messages: Array.isArray(conversation.messages)
            ? conversation.messages
            : [],

        createdAt:
            conversation.created_at ||
            conversation.createdAt ||
            new Date().toISOString(),

        updatedAt:
            conversation.updated_at ||
            conversation.updatedAt ||
            new Date().toISOString(),

        isLocal: Boolean(conversation.isLocal)

    };
}


function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];

    });
}


function formatDate(value) {

    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("fr-FR", {

        dateStyle: "medium",
        timeStyle: "short"

    });
}


function closeSidebar() {
    sidebar?.classList.remove("open");
}


/* =========================================================
   REQUÊTES API
========================================================= */

async function apiRequest(url, options = {}) {

    const headers = {

        Accept: "application/json",

        ...(options.headers || {})

    };

    if (options.body !== undefined && !headers["Content-Type"]) {

        headers["Content-Type"] = "application/json";

    }

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {

        response = await fetch(url, {

            ...options,

            headers

        });

    } catch (error) {

        throw new Error(
            "Impossible de joindre le serveur. Vérifiez votre connexion Internet."
        );

    }

    let data;

    try {

        data = await response.json();

    } catch {

        throw new Error("Réponse invalide du serveur.");

    }

    if (!response.ok || data.success === false) {

        throw new Error(
            data.error || data.message || "Une erreur est survenue."
        );

    }

    return data;
}


/* =========================================================
   PANNEAUX
========================================================= */

function closePanel() {

    document.getElementById("geniusDynamicPanel")?.remove();

}


function openPanel(title, content) {

    closePanel();

    injectGeniusStyles();

    const panel = document.createElement("div");

    panel.id = "geniusDynamicPanel";
    panel.className = "genius-panel";

    panel.innerHTML = `

        <div class="genius-panel-inner">

            <div class="genius-panel-header">

                <h2>${escapeHTML(title)}</h2>

                <button class="genius-close" id="geniusClosePanel">
                    ✕ Fermer
                </button>

            </div>

            <div id="geniusPanelContent">
                ${content}
            </div>

        </div>

    `;

    document.body.appendChild(panel);

    panel.querySelector("#geniusClosePanel")
        ?.addEventListener("click", closePanel);

    panel.addEventListener("click", event => {

        if (event.target === panel) closePanel();

    });

    return panel.querySelector("#geniusPanelContent");
}


function showPanelMessage(element, message, error = false) {

    if (!element) return;

    element.textContent = message;

    element.className = error
        ? "genius-panel-message error"
        : "genius-panel-message";
}


/* =========================================================
   AUTHENTIFICATION
========================================================= */

function showLoginForm() {

    if (!loginForm || !registerForm) return;

    loginForm.hidden = false;
    registerForm.hidden = true;

    loginTab?.classList.add("active");
    registerTab?.classList.remove("active");

    showAuthMessage("");
}


function showRegisterForm() {

    if (!loginForm || !registerForm) return;

    loginForm.hidden = true;
    registerForm.hidden = false;

    loginTab?.classList.remove("active");
    registerTab?.classList.add("active");

    showAuthMessage("");
}


loginTab?.addEventListener("click", showLoginForm);
registerTab?.addEventListener("click", showRegisterForm);


/* =========================================================
   INSCRIPTION
========================================================= */

registerForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const button = registerForm.querySelector(
        'button[type="submit"]'
    );

    const full_name = document
        .getElementById("registerName")
        ?.value.trim();

    const country = document
        .getElementById("registerCountry")
        ?.value.trim();

    const phone = document
        .getElementById("registerPhone")
        ?.value.trim();

    const password = document
        .getElementById("registerPassword")
        ?.value;

    if (!full_name || !country || !phone || !password) {

        showAuthMessage("Veuillez remplir tous les champs.");

        return;

    }

    if (password.length < 8) {

        showAuthMessage(
            "Le mot de passe doit contenir au moins 8 caractères."
        );

        return;

    }

    setButtonLoading(button, true, "Créer mon compte");

    showAuthMessage("Création de votre compte...", "loading");

    try {

        const data = await apiRequest(REGISTER_ENDPOINT, {

            method: "POST",

            body: JSON.stringify({

                full_name,
                country,
                phone,
                password

            })

        });

        if (!data.token || !data.user) {

            throw new Error("Réponse d'inscription incomplète.");

        }

        localStorage.setItem(TOKEN_KEY, data.token);

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(data.user)
        );

        currentUser = data.user;

        registerForm.reset();

        await enterApplication();

    } catch (error) {

        console.error("REGISTER ERROR:", error);

        showAuthMessage(error.message);

    } finally {

        setButtonLoading(button, false, "Créer mon compte");

    }

});


/* =========================================================
   CONNEXION
========================================================= */

loginForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const button = loginForm.querySelector(
        'button[type="submit"]'
    );

    const phone = document
        .getElementById("loginPhone")
        ?.value.trim();

    const password = document
        .getElementById("loginPassword")
        ?.value;

    if (!phone || !password) {

        showAuthMessage(
            "Veuillez saisir votre numéro et votre mot de passe."
        );

        return;

    }

    setButtonLoading(button, true, "Se connecter");

    showAuthMessage("Connexion en cours...", "loading");

    try {

        const data = await apiRequest(LOGIN_ENDPOINT, {

            method: "POST",

            body: JSON.stringify({

                phone,
                password

            })

        });

        if (!data.token || !data.user) {

            throw new Error("Réponse de connexion incomplète.");

        }

        localStorage.setItem(TOKEN_KEY, data.token);

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(data.user)
        );

        currentUser = data.user;

        loginForm.reset();

        await enterApplication();

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        showAuthMessage(error.message);

    } finally {

        setButtonLoading(button, false, "Se connecter");

    }

});


/* =========================================================
   SESSION
========================================================= */

async function verifySession() {

    const token = getToken();

    if (!token) {

        showAuthentication();

        return false;

    }

    try {

        const data = await apiRequest(PROFILE_ENDPOINT, {

            method: "GET"

        });

        if (!data.user) {

            throw new Error("Session invalide.");

        }

        currentUser = data.user;

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(currentUser)
        );

        return true;

    } catch (error) {

        console.warn("SESSION EXPIRÉE:", error.message);

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        currentUser = null;

        showAuthentication();

        return false;

    }

}


function showAuthentication() {

    if (authScreen) authScreen.hidden = false;

    if (mainApp) mainApp.hidden = true;

    closePanel();

    showLoginForm();

}


/* =========================================================
   OUVERTURE APPLICATION
========================================================= */

async function enterApplication() {

    if (!currentUser) {

        showAuthentication();

        return;

    }

    if (authScreen) authScreen.hidden = true;

    if (mainApp) mainApp.hidden = false;

    STORAGE_KEY = getUserStorageKey(currentUser.id);

    updateUserProfile();

    attachEvents();

    await initializeChat();

}


/* =========================================================
   PROFIL UTILISATEUR
========================================================= */

function updateUserProfile() {

    if (!currentUser) return;

    const name =
        currentUser.full_name ||
        currentUser.phone ||
        "Utilisateur";

    if (userNameElement) {
        userNameElement.textContent = name;
    }

    if (userPhoneElement) {
        userPhoneElement.textContent = currentUser.phone || "";
    }

    if (userAvatar) {
        userAvatar.textContent = name.charAt(0).toUpperCase();
    }

}


/* =========================================================
   DÉCONNEXION
========================================================= */

logoutButton?.addEventListener("click", () => {

    if (!confirm("Voulez-vous vraiment vous déconnecter ?")) {
        return;
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    currentUser = null;

    conversations = [];
    activeConversation = null;

    STORAGE_KEY = null;

    closePanel();

    showAuthentication();

});


/* =========================================================
   INITIALISATION CHAT
========================================================= */

async function initializeChat() {

    if (!STORAGE_KEY || !currentUser) return;

    loadLocalConversations();

    try {

        await loadRemoteConversations();

    } catch (error) {

        console.error("CHARGEMENT HISTORIQUE:", error);

    }

    const savedActive = localStorage.getItem(
        `${ACTIVE_KEY}_${currentUser.id}`
    );

    if (savedActive && conversations.some(c => c.id === savedActive)) {

        await openConversation(savedActive);

    } else {

        activeConversation = null;

        showWelcome();

    }

    updateAdminNavigation();

}


/* =========================================================
   CHARGEMENT LOCAL
========================================================= */

function loadLocalConversations() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        const local = saved ? JSON.parse(saved) : [];

        conversations = Array.isArray(local)
            ? local.map(normalizeConversation)
            : [];

    } catch (error) {

        console.error("ERREUR HISTORIQUE LOCAL:", error);

        conversations = [];

    }

}


/* =========================================================
   CHARGEMENT SUPABASE
========================================================= */

async function loadRemoteConversations(search = "") {

    const url = new URL(CONVERSATIONS_ENDPOINT);

    if (search.trim()) {
        url.searchParams.set("q", search.trim());
    }

    const data = await apiRequest(url.toString(), {
        method: "GET"
    });

    const remoteList = Array.isArray(data.conversations)
        ? data.conversations
        : [];

    const remoteConversations = remoteList.map(item => {

        return normalizeConversation({

            ...item,

            messages: [],

            isLocal: false

        });

    });

    const remoteIds = new Set(
        remoteConversations.map(c => c.id)
    );

    const oldLocalConversations = conversations.filter(c => {

        return c.isLocal || !remoteIds.has(c.id);

    });

    conversations = [

        ...remoteConversations,

        ...oldLocalConversations

    ];

    conversations.sort((a, b) => {

        return new Date(b.updatedAt) - new Date(a.updatedAt);

    });

    saveConversations();

    return remoteConversations;

}


/* =========================================================
   SAUVEGARDE LOCALE
========================================================= */

function saveConversations() {

    if (!STORAGE_KEY) return;

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );

        if (activeConversation && currentUser) {

            localStorage.setItem(
                `${ACTIVE_KEY}_${currentUser.id}`,
                activeConversation
            );

        } else if (currentUser) {

            localStorage.removeItem(
                `${ACTIVE_KEY}_${currentUser.id}`
            );

        }

    } catch (error) {

        console.error("ERREUR SAUVEGARDE:", error);

    }

}


/* =========================================================
   CRÉATION CONVERSATION SERVEUR
========================================================= */

async function createRemoteConversation(title) {

    const data = await apiRequest(CONVERSATIONS_ENDPOINT, {

        method: "POST",

        body: JSON.stringify({

            title: title || "Nouvelle conversation"

        })

    });

    const conversation = data.conversation || data;

    if (!conversation.id) {

        throw new Error(
            "Le serveur n'a pas retourné l'identifiant de la conversation."
        );

    }

    return normalizeConversation({

        ...conversation,

        messages: [],

        isLocal: false

    });

}


/* =========================================================
   MIGRATION CONVERSATION LOCALE
========================================================= */

async function migrateLocalConversation(conversation) {

    if (!conversation || !conversation.isLocal) {
        return conversation;
    }

    const oldId = conversation.id;

    const remote = await createRemoteConversation(
        conversation.title
    );

    conversation.id = remote.id;
    conversation.isLocal = false;

    conversation.updatedAt = new Date().toISOString();

    if (activeConversation === oldId) {
        activeConversation = remote.id;
    }

    saveConversations();

    return conversation;

}


/* =========================================================
   NOUVELLE CONVERSATION
========================================================= */

async function createNewConversation() {

    if (isSending || !currentUser) return;

    closePanel();

    if (newChatButton) {
        newChatButton.disabled = true;
    }

    try {

        const conversation = await createRemoteConversation(
            "Nouvelle conversation"
        );

        conversations.unshift(conversation);

        activeConversation = conversation.id;

        saveConversations();

        if (messages) messages.innerHTML = "";

        showChat();

        if (userInput) {

            userInput.value = "";
            userInput.focus();

        }

    } catch (error) {

        console.error("NOUVELLE CONVERSATION:", error);

        alert(
            "Impossible de créer une conversation sur le serveur : " +
            error.message
        );

    } finally {

        if (newChatButton) {
            newChatButton.disabled = false;
        }

    }

}


/* =========================================================
   ACCUEIL ET CHAT
========================================================= */

function showWelcome() {

    if (welcome) welcome.style.display = "block";

    if (chatArea) chatArea.style.display = "none";

}


function showChat() {

    if (welcome) welcome.style.display = "none";

    if (chatArea) chatArea.style.display = "block";

}


/* =========================================================
   CHARGEMENT MESSAGES
========================================================= */

async function loadConversationMessages(id) {

    const data = await apiRequest(

        `${CONVERSATIONS_ENDPOINT}/${encodeURIComponent(id)}/messages`,

        {
            method: "GET"
        }

    );

    return Array.isArray(data.messages)
        ? data.messages
        : [];

}


/* =========================================================
   OUVERTURE CONVERSATION
========================================================= */

async function openConversation(id) {

    const conversation = conversations.find(c => c.id === id);

    if (!conversation) {

        showWelcome();

        return;

    }

    closePanel();

    activeConversation = id;

    if (messages) messages.innerHTML = "";

    showChat();

    closeSidebar();

    try {

        if (!conversation.isLocal) {

            const remoteMessages =
                await loadConversationMessages(id);

            conversation.messages = remoteMessages.map(message => ({

                role: message.role,

                content: message.content,

                createdAt:
                    message.created_at ||
                    new Date().toISOString()

            }));

        }

        renderConversation(conversation.id);

    } catch (error) {

        console.error("CHARGEMENT DES MESSAGES:", error);

        renderConversation(conversation.id);

        alert(
            "Impossible de récupérer les messages : " +
            error.message
        );

    }

}


/* =========================================================
   AFFICHAGE CONVERSATION
========================================================= */

function renderConversation(id) {

    const conversation = conversations.find(c => c.id === id);

    if (!conversation) {

        activeConversation = null;

        showWelcome();

        return;

    }

    activeConversation = id;

    if (messages) messages.innerHTML = "";

    showChat();

    conversation.messages.forEach(message => {

        if (
            message.role === "user" ||
            message.role === "assistant"
        ) {

            displayMessage(message.role, message.content);

        }

    });

    saveConversations();

}


/* =========================================================
   FORMATAGE MARKDOWN
========================================================= */

function formatGeniusAnswer(text) {

    const container = document.createElement("div");

    const source = String(text ?? "");

    if (
        typeof marked !== "undefined" &&
        typeof DOMPurify !== "undefined"
    ) {

        const html = marked.parse(source);

        container.innerHTML = DOMPurify.sanitize(html, {

            USE_PROFILES: {
                html: true
            }

        });

        container.querySelectorAll("pre code").forEach(code => {

            code.parentElement.classList.add("genius-code-block");

        });

    } else {

        container.style.whiteSpace = "pre-wrap";

        container.textContent = source;

    }

    return container;

}


/* =========================================================
   COPIER UNE RÉPONSE
========================================================= */

async function copyGeniusAnswer(text, button) {

    const originalText = button.textContent;

    try {

        if (navigator.clipboard && window.isSecureContext) {

            await navigator.clipboard.writeText(text);

        } else {

            const textarea = document.createElement("textarea");

            textarea.value = text;

            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.select();

            const copied = document.execCommand("copy");

            textarea.remove();

            if (!copied) {
                throw new Error("Copie impossible.");
            }

        }

        button.textContent = "✓ Copié";

        setTimeout(() => {

            button.textContent = originalText;

        }, 1800);

    } catch (error) {

        console.error("COPIE:", error);

        button.textContent = "Échec";

        setTimeout(() => {

            button.textContent = originalText;

        }, 1800);

    }

}


/* =========================================================
   AFFICHAGE MESSAGE
========================================================= */

function displayMessage(role, content) {

    if (!messages) return null;

    const wrapper = document.createElement("div");

    wrapper.className =
        role === "user"
            ? "user-message"
            : "assistant-message";

    const avatar = document.createElement("div");

    avatar.className =
        role === "user"
            ? "message-avatar user-avatar"
            : "message-avatar";

    avatar.textContent = role === "user" ? "U" : "G";

    const messageContent = document.createElement("div");

    messageContent.className = "message-content";

    const name = document.createElement("strong");

    name.textContent = role === "user" ? "VOUS" : APP_NAME;

    messageContent.appendChild(name);

    if (role === "assistant") {

        const formatted = formatGeniusAnswer(content);

        messageContent.appendChild(formatted);

        const actions = document.createElement("div");

        actions.className = "genius-message-actions";

        const copyButton = document.createElement("button");

        copyButton.type = "button";
        copyButton.textContent = "📋 Copier";

        copyButton.addEventListener("click", () => {

            copyGeniusAnswer(String(content ?? ""), copyButton);

        });

        actions.appendChild(copyButton);

        messageContent.appendChild(actions);

    } else {

        const paragraph = document.createElement("p");

        paragraph.style.whiteSpace = "pre-wrap";

        paragraph.textContent = String(content ?? "");

        messageContent.appendChild(paragraph);

    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(messageContent);

    messages.appendChild(wrapper);

    scrollToBottom();

    return wrapper;

}


/* =========================================================
   INDICATEUR DE RÉFLEXION
========================================================= */

function showThinking() {

    if (!messages) return;

    removeThinking();

    const wrapper = document.createElement("div");

    wrapper.className = "assistant-message";
    wrapper.id = "genius-thinking";

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";
    avatar.textContent = "G";

    const content = document.createElement("div");

    content.className = "message-content";

    const name = document.createElement("strong");

    name.textContent = APP_NAME;

    const label = document.createElement("p");

    label.textContent = "Je réfléchis à votre demande";

    const dots = document.createElement("div");

    dots.className = "genius-thinking-dots";

    dots.innerHTML = "<span></span><span></span><span></span>";

    content.appendChild(name);
    content.appendChild(label);
    content.appendChild(dots);

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    messages.appendChild(wrapper);

    scrollToBottom();

}


function removeThinking() {

    document.getElementById("genius-thinking")?.remove();

}


/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {

    setTimeout(() => {

        if (!messages) return;

        const lastMessage = messages.lastElementChild;

        lastMessage?.scrollIntoView({

            behavior: "smooth",

            block: "end"

        });

    }, 100);

}


/* =========================================================
   MOTEUR IA
========================================================= */

async function askGeniusAI(messageHistory, conversationId) {

    const body = {

        messages: messageHistory

    };

    if (
        conversationId &&
        !String(conversationId).startsWith("genius_")
    ) {

        body.conversation_id = conversationId;

    }

    const data = await apiRequest(CHAT_ENDPOINT, {

        method: "POST",

        body: JSON.stringify(body)

    });

    if (
        typeof data.reply !== "string" ||
        !data.reply.trim()
    ) {

        throw new Error("Réponse IA invalide.");

    }

    return {

        reply: data.reply,

        conversation_id: data.conversation_id || null

    };

}


/* =========================================================
   ENVOI MESSAGE
========================================================= */

async function sendMessage() {

    if (isSending || !currentUser || !userInput) return;

    const text = userInput.value.trim();

    if (!text) return;

    let conversation = conversations.find(
        c => c.id === activeConversation
    );

    if (!conversation) {

        try {

            conversation = await createRemoteConversation(
                "Nouvelle conversation"
            );

            conversations.unshift(conversation);

            activeConversation = conversation.id;

        } catch (error) {

            console.error("CRÉATION CONVERSATION:", error);

            alert(
                "Impossible de démarrer une conversation : " +
                error.message
            );

            return;

        }

    }

    isSending = true;

    if (sendButton) sendButton.disabled = true;

    userInput.disabled = true;

    userInput.value = "";

    showChat();

    try {

        // Les anciennes conversations locales obtiennent
        // un véritable identifiant serveur avant l'envoi.

        if (conversation.isLocal) {

            conversation = await migrateLocalConversation(
                conversation
            );

            activeConversation = conversation.id;

        }

        conversation.messages.push({

            role: "user",

            content: text,

            createdAt: new Date().toISOString()

        });

        if (conversation.messages.length === 1) {

            conversation.title = getConversationTitle(text);

        }

        displayMessage("user", text);

        conversation.updatedAt = new Date().toISOString();

        saveConversations();

        showThinking();

        const messageHistory = conversation.messages

            .filter(message => {

                return ["user", "assistant"].includes(message.role);

            })

            .slice(-30)

            .map(message => ({

                role: message.role,

                content: message.content

            }));

        const result = await askGeniusAI(
            messageHistory,
            conversation.id
        );

        removeThinking();

        if (
            result.conversation_id &&
            result.conversation_id !== conversation.id
        ) {

            const oldId = conversation.id;

            conversation.id = result.conversation_id;

            conversation.isLocal = false;

            if (activeConversation === oldId) {

                activeConversation = result.conversation_id;

            }

        }

        conversation.messages.push({

            role: "assistant",

            content: result.reply,

            createdAt: new Date().toISOString()

        });

        conversation.updatedAt = new Date().toISOString();

        displayMessage("assistant", result.reply);

        conversations.sort((a, b) => {

            return new Date(b.updatedAt) - new Date(a.updatedAt);

        });

        saveConversations();

    } catch (error) {

        console.error("GENIUS IA ERROR:", error);

        removeThinking();

        displayMessage(

            "assistant",

            "Impossible de traiter votre demande.\n\n" +
            error.message

        );

    } finally {

        isSending = false;

        if (sendButton) sendButton.disabled = false;

        userInput.disabled = false;

        userInput.focus();

    }

}


/* =========================================================
   HISTORIQUE : AFFICHAGE
========================================================= */

async function showHistory() {

    closeSidebar();

    const content = openPanel("Historique des conversations", `

        <input
            type="search"
            id="geniusHistorySearch"
            class="genius-input"
            placeholder="Rechercher une conversation..."
        >

        <div id="geniusHistoryList">
            <div class="genius-empty">Chargement de l'historique...</div>
        </div>

    `);

    const searchInput = content.querySelector("#geniusHistorySearch");

    searchInput.addEventListener("input", () => {

        clearTimeout(historySearchTimer);

        historySearchTimer = setTimeout(() => {

            renderHistoryList(searchInput.value);

        }, 300);

    });

    await renderHistoryList("");

}


/* =========================================================
   AFFICHER HISTORIQUE
========================================================= */

async function renderHistoryList(search = "") {

    const list = document.getElementById("geniusHistoryList");

    if (!list) return;

    try {

        let visibleConversations = [];

        if (!search.trim()) {

            await loadRemoteConversations();

            visibleConversations = [...conversations];

        } else {

            const url = new URL(CONVERSATIONS_ENDPOINT);

            url.searchParams.set("q", search.trim());

            const data = await apiRequest(url.toString(), {

                method: "GET"

            });

            const remote = (data.conversations || []).map(item => {

                return normalizeConversation({

                    ...item,

                    messages: [],

                    isLocal: false

                });

            });

            const localMatches = conversations.filter(c => {

                return c.isLocal &&
                    c.title.toLowerCase().includes(search.toLowerCase());

            });

            visibleConversations = [...remote, ...localMatches];

        }

        const currentList = document.getElementById(
            "geniusHistoryList"
        );

        if (!currentList) return;

        if (visibleConversations.length === 0) {

            currentList.innerHTML = `
                <div class="genius-empty">
                    Aucune conversation trouvée.
                </div>
            `;

            return;

        }

        currentList.innerHTML = visibleConversations.map(conversation => `

            <div class="genius-card">

                <h3>${escapeHTML(conversation.title)}</h3>

                <p>
                    ${escapeHTML(formatDate(conversation.updatedAt))}
                </p>

                <div class="genius-actions">

                    <button
                        class="genius-button"
                        data-action="open"
                        data-id="${escapeHTML(conversation.id)}"
                    >
                        Ouvrir
                    </button>

                    <button
                        class="genius-button secondary"
                        data-action="rename"
                        data-id="${escapeHTML(conversation.id)}"
                    >
                        Renommer
                    </button>

                    <button
                        class="genius-button secondary"
                        data-action="export"
                        data-id="${escapeHTML(conversation.id)}"
                    >
                        Exporter
                    </button>

                    <button
                        class="genius-button danger"
                        data-action="delete"
                        data-id="${escapeHTML(conversation.id)}"
                    >
                        Supprimer
                    </button>

                </div>

            </div>

        `).join("");

        currentList.querySelectorAll("[data-action]").forEach(button => {

            button.addEventListener("click", async () => {

                const id = button.dataset.id;
                const action = button.dataset.action;

                if (action === "open") {

                    await openConversation(id);

                }

                if (action === "rename") {

                    await renameConversation(id);

                }

                if (action === "export") {

                    await exportConversation(id);

                }

                if (action === "delete") {

                    await deleteConversation(id);

                    if (document.getElementById("geniusDynamicPanel")) {

                        await renderHistoryList(search);

                    }

                }

            });

        });

    } catch (error) {

        console.error("HISTORIQUE:", error);

        const currentList = document.getElementById(
            "geniusHistoryList"
        );

        if (currentList) {

            currentList.innerHTML = `
                <div class="genius-empty">
                    Impossible de charger l'historique.
                    <br><br>
                    ${escapeHTML(error.message)}
                </div>
            `;

        }

    }

}


/* =========================================================
   RENOMMER CONVERSATION
========================================================= */

async function renameConversation(id) {

    const conversation = conversations.find(c => c.id === id);

    if (!conversation) return;

    const title = prompt(
        "Nouveau titre de la conversation :",
        conversation.title
    );

    if (title === null) return;

    const cleanTitle = title.trim();

    if (!cleanTitle) {

        alert("Le titre ne peut pas être vide.");

        return;

    }

    try {

        if (!conversation.isLocal) {

            await apiRequest(

                `${CONVERSATIONS_ENDPOINT}/${encodeURIComponent(id)}`,

                {

                    method: "PUT",

                    body: JSON.stringify({

                        title: cleanTitle

                    })

                }

            );

        }

        conversation.title = cleanTitle;

        conversation.updatedAt = new Date().toISOString();

        saveConversations();

        await renderHistoryList(
            document.getElementById("geniusHistorySearch")?.value || ""
        );

    } catch (error) {

        alert("Impossible de renommer : " + error.message);

    }

}


/* =========================================================
   SUPPRESSION CONVERSATION
========================================================= */

async function deleteConversation(id) {

    const conversation = conversations.find(c => c.id === id);

    if (!conversation) return;

    if (!confirm("Voulez-vous supprimer cette conversation ?")) {
        return;
    }

    try {

        if (!conversation.isLocal) {

            await apiRequest(

                `${CONVERSATIONS_ENDPOINT}/${encodeURIComponent(id)}`,

                {

                    method: "DELETE"

                }

            );

        }

        conversations = conversations.filter(c => c.id !== id);

        if (activeConversation === id) {

            activeConversation = null;

            if (messages) messages.innerHTML = "";

            showWelcome();

        }

        saveConversations();

    } catch (error) {

        console.error("SUPPRESSION CONVERSATION:", error);

        alert(
            "Impossible de supprimer cette conversation : " +
            error.message
        );

    }

}


/* =========================================================
   EXPORT CONVERSATION
========================================================= */

async function exportConversation(id) {

    try {

        const conversation = conversations.find(c => c.id === id);

        let data;

        if (conversation?.isLocal) {

            data = conversation;

        } else {

            data = await apiRequest(

                `${CONVERSATIONS_ENDPOINT}/${encodeURIComponent(id)}/export`,

                {
                    method: "GET"
                }

            );

        }

        const json = JSON.stringify(data, null, 2);

        const blob = new Blob([json], {

            type: "application/json;charset=utf-8"

        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download = `genius-ia-conversation-${id}.json`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {

        console.error("EXPORT:", error);

        alert("Export impossible : " + error.message);

    }

}


/* =========================================================
   BIBLIOTHÈQUE
========================================================= */

async function showLibrary() {

    await showHistory();

}


/* =========================================================
   PROFIL : MODIFICATION
========================================================= */

function showProfileSettings() {

    if (!currentUser) return;

    const content = openPanel("Mon profil", `

        <div class="genius-card">

            <h3>Informations personnelles</h3>

            <label class="genius-label">Nom complet</label>

            <input
                id="geniusProfileName"
                class="genius-input"
                value="${escapeHTML(currentUser.full_name || "")}"
            >

            <label class="genius-label">Pays</label>

            <input
                id="geniusProfileCountry"
                class="genius-input"
                value="${escapeHTML(currentUser.country || "")}"
            >

            <p>
                Numéro : ${escapeHTML(currentUser.phone || "")}
            </p>

            <div id="geniusProfileMessage"></div>

            <button
                class="genius-button"
                id="geniusSaveProfile"
            >
                Enregistrer les modifications
            </button>

        </div>

        <div class="genius-card">

            <h3>Changer mon mot de passe</h3>

            <label class="genius-label">Mot de passe actuel</label>

            <input
                type="password"
                id="geniusCurrentPassword"
                class="genius-input"
                autocomplete="current-password"
            >

            <label class="genius-label">Nouveau mot de passe</label>

            <input
                type="password"
                id="geniusNewPassword"
                class="genius-input"
                autocomplete="new-password"
            >

            <label class="genius-label">Confirmer le nouveau mot de passe</label>

            <input
                type="password"
                id="geniusConfirmPassword"
                class="genius-input"
                autocomplete="new-password"
            >

            <div id="geniusPasswordMessage"></div>

            <button
                class="genius-button"
                id="geniusChangePassword"
            >
                Modifier mon mot de passe
            </button>

        </div>

    `);

    content.querySelector("#geniusSaveProfile")
        ?.addEventListener("click", saveUserProfile);

    content.querySelector("#geniusChangePassword")
        ?.addEventListener("click", changeUserPassword);

}


/* =========================================================
   ENREGISTRER PROFIL
========================================================= */

async function saveUserProfile() {

    const name = document
        .getElementById("geniusProfileName")
        ?.value.trim();

    const country = document
        .getElementById("geniusProfileCountry")
        ?.value.trim();

    const message = document.getElementById("geniusProfileMessage");

    if (!name || !country) {

        showPanelMessage(
            message,
            "Veuillez remplir le nom et le pays.",
            true
        );

        return;

    }

    const button = document.getElementById("geniusSaveProfile");

    if (!button) return;

    button.disabled = true;

    try {

        const data = await apiRequest(UPDATE_PROFILE_ENDPOINT, {

            method: "PUT",

            body: JSON.stringify({

                full_name: name,

                country

            })

        });

        currentUser = data.user || {

            ...currentUser,

            full_name: name,

            country

        };

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(currentUser)
        );

        updateUserProfile();

        showPanelMessage(
            message,
            "Votre profil a été mis à jour."
        );

    } catch (error) {

        showPanelMessage(message, error.message, true);

    } finally {

        button.disabled = false;

    }

}


/* =========================================================
   CHANGER MOT DE PASSE
========================================================= */

async function changeUserPassword() {

    const current_password = document
        .getElementById("geniusCurrentPassword")
        ?.value;

    const new_password = document
        .getElementById("geniusNewPassword")
        ?.value;

    const confirmation = document
        .getElementById("geniusConfirmPassword")
        ?.value;

    const message = document.getElementById("geniusPasswordMessage");

    if (!current_password || !new_password || !confirmation) {

        showPanelMessage(
            message,
            "Veuillez remplir tous les champs.",
            true
        );

        return;

    }

    if (new_password.length < 8) {

        showPanelMessage(
            message,
            "Le nouveau mot de passe doit contenir au moins 8 caractères.",
            true
        );

        return;

    }

    if (new_password !== confirmation) {

        showPanelMessage(
            message,
            "Les deux nouveaux mots de passe ne correspondent pas.",
            true
        );

        return;

    }

    const button = document.getElementById("geniusChangePassword");

    if (!button) return;

    button.disabled = true;

    try {

        await apiRequest(PASSWORD_ENDPOINT, {

            method: "PUT",

            body: JSON.stringify({

                current_password,

                new_password

            })

        });

        document.getElementById("geniusCurrentPassword").value = "";
        document.getElementById("geniusNewPassword").value = "";
        document.getElementById("geniusConfirmPassword").value = "";

        showPanelMessage(
            message,
            "Votre mot de passe a été modifié."
        );

    } catch (error) {

        showPanelMessage(message, error.message, true);

    } finally {

        button.disabled = false;

    }

}


/* =========================================================
   PARAMÈTRES
========================================================= */

function showSettings() {

    const content = openPanel("Paramètres", `

        <div class="genius-card">

            <h3>Compte</h3>

            <p>
                Gérez vos informations personnelles et votre sécurité.
            </p>

            <button
                class="genius-button"
                id="geniusOpenProfile"
            >
                Mon profil
            </button>

        </div>

        <div class="genius-card">

            <h3>Session</h3>

            <p>
                Déconnectez-vous de votre compte GENIUS IA.
            </p>

            <button
                class="genius-button danger"
                id="geniusSettingsLogout"
            >
                Déconnexion
            </button>

        </div>

        <div class="genius-card">

            <h3>Application</h3>

            <p>${APP_NAME} — Version ${APP_VERSION}</p>

            <p>Créateur : MARUCE SOLDADO 🇬🇳</p>

            <p>Le futur commence avec nous.</p>

        </div>

    `);

    content.querySelector("#geniusOpenProfile")
        ?.addEventListener("click", showProfileSettings);

    content.querySelector("#geniusSettingsLogout")
        ?.addEventListener("click", () => logoutButton?.click());

}


/* =========================================================
   ADMINISTRATION
========================================================= */

function isAdmin() {

    return Boolean(
        currentUser &&
        String(currentUser.role || "").toLowerCase() === "admin"
    );

}


function updateAdminNavigation() {

    if (!sidebar) return;

    let adminButton = document.getElementById("geniusAdminButton");

    if (isAdmin()) {

        if (!adminButton) {

            adminButton = document.createElement("button");

            adminButton.id = "geniusAdminButton";
            adminButton.className = "nav-item";
            adminButton.textContent = "Administration";

            adminButton.addEventListener("click", showAdminDashboard);

            const navigation = sidebar.querySelector(".navigation");

            if (navigation) {

                navigation.appendChild(adminButton);

            } else {

                sidebar.appendChild(adminButton);

            }

        }

    } else {

        adminButton?.remove();

    }

}


/* =========================================================
   TABLEAU DE BORD ADMIN
========================================================= */

async function showAdminDashboard() {

    closeSidebar();

    if (!isAdmin()) {

        alert("Accès réservé aux administrateurs.");

        return;

    }

    const content = openPanel("Administration GENIUS IA", `

        <div class="genius-stat-grid" id="geniusAdminStats">

            <div class="genius-stat">
                Utilisateurs
                <strong>...</strong>
            </div>

            <div class="genius-stat">
                Actifs
                <strong>...</strong>
            </div>

            <div class="genius-stat">
                Conversations
                <strong>...</strong>
            </div>

            <div class="genius-stat">
                Messages
                <strong>...</strong>
            </div>

        </div>

        <div class="genius-card">

            <h3>Gestion des utilisateurs</h3>

            <input
                id="geniusAdminSearch"
                class="genius-input"
                placeholder="Rechercher un utilisateur..."
            >

            <div id="geniusAdminUsers">
                <div class="genius-empty">
                    Chargement des utilisateurs...
                </div>
            </div>

        </div>

    `);

    try {

        const data = await apiRequest(ADMIN_DASHBOARD_ENDPOINT, {

            method: "GET"

        });

        const stats = data.statistics || {};

        const statsElement = content.querySelector("#geniusAdminStats");

        statsElement.innerHTML = `

            <div class="genius-stat">
                Utilisateurs
                <strong>${Number(stats.total_users || 0)}</strong>
            </div>

            <div class="genius-stat">
                Actifs
                <strong>${Number(stats.active_users || 0)}</strong>
            </div>

            <div class="genius-stat">
                Conversations
                <strong>${Number(stats.total_conversations || 0)}</strong>
            </div>

            <div class="genius-stat">
                Messages
                <strong>${Number(stats.total_messages || 0)}</strong>
            </div>

        `;

    } catch (error) {

        console.error("ADMIN DASHBOARD:", error);

        alert(
            "Impossible de charger les statistiques : " +
            error.message
        );

    }

    const search = content.querySelector("#geniusAdminSearch");

    search.addEventListener("input", () => {

        clearTimeout(historySearchTimer);

        historySearchTimer = setTimeout(() => {

            loadAdminUsers(search.value);

        }, 350);

    });

    await loadAdminUsers("");

}


/* =========================================================
   LISTE DES UTILISATEURS ADMIN
========================================================= */

async function loadAdminUsers(search = "") {

    if (!isAdmin()) return;

    const container = document.getElementById("geniusAdminUsers");

    if (!container) return;

    try {

        const url = new URL(ADMIN_USERS_ENDPOINT);

        if (search.trim()) {

            url.searchParams.set("q", search.trim());

        }

        const data = await apiRequest(url.toString(), {

            method: "GET"

        });

        const users = Array.isArray(data.users)
            ? data.users
            : [];

        if (users.length === 0) {

            container.innerHTML = `
                <div class="genius-empty">
                    Aucun utilisateur trouvé.
                </div>
            `;

            return;

        }

        container.innerHTML = users.map(user => {

            const active = user.is_active !== false;

            return `

                <div class="genius-card">

                    <h3>${escapeHTML(user.full_name || "Utilisateur")}</h3>

                    <p>
                        Téléphone : ${escapeHTML(user.phone || "")}
                    </p>

                    <p>
                        Pays : ${escapeHTML(user.country || "")}
                    </p>

                    <p>
                        Rôle : ${escapeHTML(user.role || "user")}
                    </p>

                    <p class="genius-status ${active ? "" : "off"}">
                        ${active ? "Compte actif" : "Compte désactivé"}
                    </p>

                    <div class="genius-actions">

                        <button
                            class="genius-button ${active ? "danger" : ""}"
                            data-user-id="${escapeHTML(user.id)}"
                            data-status="${active ? "false" : "true"}"
                        >
                            ${active ? "Désactiver" : "Activer"}
                        </button>

                    </div>

                </div>

            `;

        }).join("");

        container.querySelectorAll("[data-user-id]").forEach(button => {

            button.addEventListener("click", async () => {

                const userId = button.dataset.userId;

                const is_active = button.dataset.status === "true";

                await updateUserStatus(userId, is_active);

                await loadAdminUsers(search);

            });

        });

    } catch (error) {

        console.error("ADMIN USERS:", error);

        container.innerHTML = `
            <div class="genius-empty">
                Impossible de charger les utilisateurs.
                <br><br>
                ${escapeHTML(error.message)}
            </div>
        `;

    }

}


/* =========================================================
   ACTIVER / DÉSACTIVER UTILISATEUR
========================================================= */

async function updateUserStatus(userId, is_active) {

    if (!isAdmin()) {

        alert("Accès refusé.");

        return;

    }

    const action = is_active ? "activer" : "désactiver";

    if (!confirm(`Voulez-vous vraiment ${action} ce compte ?`)) {

        return;

    }

    try {

        await apiRequest(

            `${ADMIN_USERS_ENDPOINT}/${encodeURIComponent(userId)}/status`,

            {

                method: "PUT",

                body: JSON.stringify({

                    is_active

                })

            }

        );

    } catch (error) {

        alert(
            "Impossible de modifier ce compte : " +
            error.message
        );

    }

}


/* =========================================================
   SUGGESTIONS
========================================================= */

function attachSuggestionEvents() {

    document.querySelectorAll(".suggestion").forEach(button => {

        if (button.dataset.geniusBound === "true") return;

        button.dataset.geniusBound = "true";

        button.addEventListener("click", () => {

            const prompt = button.dataset.prompt;

            if (!prompt || !userInput) return;

            userInput.value = prompt;

            sendMessage();

        });

    });

}


/* =========================================================
   NAVIGATION
========================================================= */

function attachNavigationEvents() {

    if (!sidebar) return;

    const navigationButtons = sidebar.querySelectorAll(
        ".navigation .nav-item"
    );

    navigationButtons.forEach(button => {

        if (button.dataset.geniusNavigationBound === "true") return;

        button.dataset.geniusNavigationBound = "true";

        button.addEventListener("click", () => {

            const label = button.textContent
                .trim()
                .toLowerCase();

            if (
                label.includes("accueil") ||
                label.includes("home")
            ) {

                closePanel();

                activeConversation = null;

                if (messages) messages.innerHTML = "";

                saveConversations();

                showWelcome();

                closeSidebar();

                return;

            }

            if (label.includes("historique")) {

                showHistory();

                return;

            }

            if (
                label.includes("bibliothèque") ||
                label.includes("bibliotheque")
            ) {

                showLibrary();

                return;

            }

            if (
                label.includes("paramètres") ||
                label.includes("parametres") ||
                label.includes("settings")
            ) {

                showSettings();

                return;

            }

            if (
                label.includes("découvrir") ||
                label.includes("decouvrir") ||
                label.includes("outils")
            ) {

                showTools();

                return;

            }

        });

    });

}


/* =========================================================
   DÉCOUVRIR LES OUTILS
========================================================= */

function showTools() {

    const content = openPanel("Découvrir les outils", `

        <div class="genius-card">

            <h3>✍️ Rédaction</h3>

            <p>
                Rédiger des textes, lettres, messages,
                publications et documents.
            </p>

            <button
                class="genius-button"
                data-prompt="Aide-moi à rédiger un texte professionnel."
            >
                Utiliser
            </button>

        </div>

        <div class="genius-card">

            <h3>🌍 Traduction</h3>

            <p>
                Traduire des textes et comprendre différentes langues.
            </p>

            <button
                class="genius-button"
                data-prompt="Je souhaite traduire un texte. Aide-moi."
            >
                Utiliser
            </button>

        </div>

        <div class="genius-card">

            <h3>💻 Programmation</h3>

            <p>
                Comprendre, écrire et corriger du code informatique.
            </p>

            <button
                class="genius-button"
                data-prompt="Aide-moi à programmer et à corriger mon code."
            >
                Utiliser
            </button>

        </div>

        <div class="genius-card">

            <h3>📚 Apprentissage</h3>

            <p>
                Apprendre, réviser et obtenir des explications.
            </p>

            <button
                class="genius-button"
                data-prompt="Je veux apprendre quelque chose de nouveau. Propose-moi une leçon."
            >
                Utiliser
            </button>

        </div>

        <div class="genius-card">

            <h3>🔎 Recherche et idées</h3>

            <p>
                Réfléchir, organiser des projets et trouver des idées.
            </p>

            <button
                class="genius-button"
                data-prompt="Aide-moi à développer une idée de projet."
            >
                Utiliser
            </button>

        </div>

    `);

    content.querySelectorAll("[data-prompt]").forEach(button => {

        button.addEventListener("click", () => {

            const prompt = button.dataset.prompt;

            closePanel();

            if (userInput) {

                userInput.value = prompt;

                userInput.focus();

            }

        });

    });

}


/* =========================================================
   MENU MOBILE
========================================================= */

function toggleSidebar() {

    if (!sidebar) return;

    sidebar.classList.toggle("open");

}


/* =========================================================
   ÉVÉNEMENTS PRINCIPAUX
========================================================= */

function attachEvents() {

    if (eventsAttached) return;

    eventsAttached = true;

    sendButton?.addEventListener("click", sendMessage);

    newChatButton?.addEventListener(
        "click",
        createNewConversation
    );

    mobileMenu?.addEventListener(
        "click",
        toggleSidebar
    );

    historyButton?.addEventListener(
        "click",
        showHistory
    );

    userInput?.addEventListener("keydown", event => {

        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();

            sendMessage();

        }

    });

    userInput?.addEventListener("input", () => {

        userInput.style.height = "auto";

        userInput.style.height =
            Math.min(userInput.scrollHeight, 160) + "px";

    });

    document.addEventListener("click", event => {

        if (

            window.innerWidth <= 650 &&

            sidebar?.classList.contains("open") &&

            !sidebar.contains(event.target) &&

            !mobileMenu?.contains(event.target)

        ) {

            sidebar.classList.remove("open");

        }

    });

    attachSuggestionEvents();

    attachNavigationEvents();

}


/* =========================================================
   DÉMARRAGE
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    injectGeniusStyles();

    injectGeniusChatStyles();

    if (

        !authScreen ||

        !mainApp ||

        !loginForm ||

        !registerForm

    ) {

        console.error(
            "Interface d'authentification introuvable. Vérifie index.html."
        );

        return;

    }

    showAuthentication();

    const validSession = await verifySession();

    if (validSession) {

        await enterApplication();

    }

});


console.log(
    `${APP_NAME} V${APP_VERSION} — Application initialisée.`
);
