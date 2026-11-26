"use strict";

/* =========================================================
   GENIUS IA V2.6.0
   Créateur : MARUCE SOLDADO 🇬🇳
   Slogan : Le futur commence avec nous.
========================================================= */

const APP_NAME = "GENIUS IA";
const APP_VERSION = "2.6.0";

const API_BASE_URL = "https://genius-ia-sand.vercel.app";

const STORAGE = {
    token: "genius_token",
    user: "genius_user",
    conversations: "genius_conversations",
    activeConversation: "genius_active_conversation"
};

const state = {
    token: localStorage.getItem(STORAGE.token) || "",
    user: JSON.parse(localStorage.getItem(STORAGE.user) || "null"),
    conversations: JSON.parse(localStorage.getItem(STORAGE.conversations) || "[]"),
    activeConversation: localStorage.getItem(STORAGE.activeConversation) || null,
    messages: [],
    loading: false
};

/* =========================================================
   OUTILS
========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function saveState() {
    localStorage.setItem(STORAGE.conversations, JSON.stringify(state.conversations));

    if (state.activeConversation) {
        localStorage.setItem(STORAGE.activeConversation, state.activeConversation);
    }
}

function saveSession() {
    localStorage.setItem(STORAGE.token, state.token);
    localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
}

function getHeaders(json = true) {
    const headers = {};

    if (json) headers["Content-Type"] = "application/json";
    if (state.token) headers.Authorization = `Bearer ${state.token}`;

    return headers;
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getHeaders(options.body !== undefined),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            logout(false);
        }

        throw new Error(data.message || data.error || "Une erreur est survenue.");
    }

    return data;
}

/* =========================================================
   AUTHENTIFICATION
========================================================= */

async function register(name, email, password) {
    try {
        const data = await apiRequest("/api/register", {
            method: "POST",
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        if (data.token) {
            state.token = data.token;
            state.user = data.user || data.profile || null;
            saveSession();
        }

        showNotification("Inscription réussie !");
        showApplication();
        return data;

    } catch (error) {
        showNotification(error.message, "error");
        throw error;
    }
}

async function login(email, password) {
    try {
        const data = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({
                email,
                password
            })
        });

        state.token = data.token || "";
        state.user = data.user || data.profile || null;

        saveSession();

        showNotification("Connexion réussie !");
        showApplication();

        return data;

    } catch (error) {
        showNotification(error.message, "error");
        throw error;
    }
}

function logout(notify = true) {
    state.token = "";
    state.user = null;
    state.messages = [];
    state.activeConversation = null;

    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.user);
    localStorage.removeItem(STORAGE.activeConversation);

    if (notify) showNotification("Déconnexion réussie.");

    showAuthentication();
}

/* =========================================================
   PROFIL
========================================================= */

async function loadProfile() {
    if (!state.token) return;

    try {
        const data = await apiRequest("/api/profile");

        state.user = data.user || data.profile || data;
        saveSession();

        updateProfileDisplay();

    } catch (error) {
        console.error("Profil :", error.message);
    }
}

function updateProfileDisplay() {
    const name = state.user?.name || state.user?.full_name || "Utilisateur";

    const elements = [
        "#userName",
        "#profileName",
        ".user-name"
    ];

    elements.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.textContent = name;
        });
    });
}

/* =========================================================
   CONVERSATIONS
========================================================= */

function createConversation() {
    const conversation = {
        id: crypto.randomUUID(),
        title: "Nouvelle conversation",
        messages: [],
        created_at: new Date().toISOString()
    };

    state.conversations.unshift(conversation);
    state.activeConversation = conversation.id;
    state.messages = [];

    saveState();
    renderMessages();
    renderConversationList();

    return conversation;
}

function getActiveConversation() {
    return state.conversations.find(
        conversation => conversation.id === state.activeConversation
    );
}

async function openConversation(id) {
    state.activeConversation = id;

    const conversation = getActiveConversationById(id);

    if (!conversation) return;

    state.messages = conversation.messages || [];

    saveState();
    renderMessages();
    renderConversationList();

    try {
        const data = await apiRequest(
            `/api/conversations/${encodeURIComponent(id)}/messages`
        );

        if (Array.isArray(data.messages)) {
            state.messages = data.messages.map(message => ({
                role: message.role,
                content: message.content
            }));

            conversation.messages = state.messages;
            saveState();
            renderMessages();
        }

    } catch (error) {
        console.warn("Chargement distant des messages :", error.message);
    }
}

function getActiveConversationById(id) {
    return state.conversations.find(item => item.id === id);
}

function renderConversationList() {
    const container = $("#conversationList");

    if (!container) return;

    container.innerHTML = state.conversations.map(conversation => `
        <button
            class="conversation-item ${conversation.id === state.activeConversation ? "active" : ""}"
            data-conversation-id="${escapeHTML(conversation.id)}"
        >
            ${escapeHTML(conversation.title)}
        </button>
    `).join("");

    container.querySelectorAll("[data-conversation-id]").forEach(button => {
        button.addEventListener("click", () => {
            openConversation(button.dataset.conversationId);
        });
    });
}

function updateConversationTitle(conversation) {
    if (!conversation || conversation.messages.length === 0) return;

    const firstMessage = conversation.messages.find(
        message => message.role === "user"
    );

    if (firstMessage) {
        conversation.title = firstMessage.content.slice(0, 40);
        saveState();
        renderConversationList();
    }
}

/* =========================================================
   AFFICHAGE DES MESSAGES
========================================================= */

function renderMessages() {
    const container = $("#chatMessages");

    if (!container) return;

    container.innerHTML = "";

    if (state.messages.length === 0) {
        container.innerHTML = `
            <div class="genius-welcome">
                <h2>Bonjour, bienvenue sur GENIUS IA 🤖</h2>
                <p>Le futur commence avec nous.</p>
                <p>Comment puis-je t'aider aujourd'hui ?</p>
            </div>
        `;
        return;
    }

    state.messages.forEach((message, index) => {
        displayMessage(message.role, message.content, index);
    });

    container.scrollTop = container.scrollHeight;
}

function displayMessage(role, content, index = null) {
    const container = $("#chatMessages");

    if (!container) return;

    const message = document.createElement("div");

    message.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;

    const formatted = escapeHTML(content)
        .replace(/\n/g, "<br>");

    message.innerHTML = `
        <div class="message-content">${formatted}</div>
        ${role === "assistant" ? `
            <div class="message-actions">
                <button type="button" class="copy-answer">Copier</button>
            </div>
        ` : ""}
    `;

    const copyButton = message.querySelector(".copy-answer");

    if (copyButton) {
        copyButton.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(content);
                showNotification("Réponse copiée !");
            } catch {
                showNotification("Impossible de copier.", "error");
            }
        });
    }

    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
}

/* =========================================================
   INDICATEUR DE RÉFLEXION
========================================================= */

function showThinking() {
    const container = $("#chatMessages");

    if (!container) return;

    removeThinking();

    const thinking = document.createElement("div");
    thinking.id = "geniusThinking";
    thinking.className = "message assistant-message";

    thinking.innerHTML = `
        <div class="thinking-dots">
            GENIUS IA réfléchit
            <span>●</span>
            <span>●</span>
            <span>●</span>
        </div>
    `;

    container.appendChild(thinking);
    container.scrollTop = container.scrollHeight;
}

function removeThinking() {
    $("#geniusThinking")?.remove();
}

/* =========================================================
   CHAT IA ET MÉMOIRE V2.6.0
========================================================= */

async function askGeniusAI(message, conversationId) {
    return await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({
            message,
            conversation_id: conversationId
        })
    });
}

async function sendMessage() {
    if (state.loading) return;

    const input = $("#messageInput");
    if (!input) return;

    const message = input.value.trim();

    if (!message) return;

    if (!state.token) {
        showNotification("Connecte-toi pour utiliser GENIUS IA.", "error");
        showAuthentication();
        return;
    }

    if (!getActiveConversation()) {
        createConversation();
    }

    const conversation = getActiveConversation();

    state.loading = true;
    input.value = "";
    input.disabled = true;

    state.messages.push({
        role: "user",
        content: message
    });

    conversation.messages = state.messages;

    updateConversationTitle(conversation);
    saveState();
    renderMessages();

    showThinking();

    try {
        const data = await askGeniusAI(message, conversation.id);

        removeThinking();

        if (!data.success && !data.reply && !data.message) {
            throw new Error(data.error || "GENIUS IA n'a pas répondu.");
        }

        const answer =
            data.reply ||
            data.message ||
            data.response ||
            data.answer ||
            "";

        if (!answer) {
            throw new Error("La réponse de l'intelligence artificielle est vide.");
        }

        state.messages.push({
            role: "assistant",
            content: answer
        });

        conversation.messages = state.messages;

        saveState();
        renderMessages();

    } catch (error) {
        removeThinking();
        showNotification(error.message, "error");

    } finally {
        state.loading = false;
        input.disabled = false;
        input.focus();
    }
}

/* =========================================================
   NOUVELLE CONVERSATION
========================================================= */

function newChat() {
    createConversation();
    showNotification("Nouvelle conversation créée.");
}

/* =========================================================
   SUPPRESSION D'UNE CONVERSATION LOCALE
========================================================= */

function deleteConversation(id) {
    state.conversations = state.conversations.filter(
        conversation => conversation.id !== id
    );

    if (state.activeConversation === id) {
        state.activeConversation = null;
        state.messages = [];
        localStorage.removeItem(STORAGE.activeConversation);
    }

    saveState();
    renderConversationList();
    renderMessages();

    showNotification("Conversation supprimée de cet appareil.");
}

/* =========================================================
   RECHERCHE
========================================================= */

function searchConversations(query) {
    const search = query.toLowerCase().trim();

    return state.conversations.filter(conversation =>
        conversation.title.toLowerCase().includes(search) ||
        conversation.messages.some(message =>
            message.content.toLowerCase().includes(search)
        )
    );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function showNotification(message, type = "success") {
    let notification = $("#geniusNotification");

    if (!notification) {
        notification = document.createElement("div");
        notification.id = "geniusNotification";

        Object.assign(notification.style, {
            position: "fixed",
            bottom: "25px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "13px 20px",
            borderRadius: "12px",
            background: "#14243b",
            color: "#fff",
            zIndex: "99999",
            fontSize: "14px",
            maxWidth: "90%",
            textAlign: "center"
        });

        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.border = type === "error"
        ? "1px solid #ff5252"
        : "1px solid #2585ff";

    notification.style.display = "block";

    clearTimeout(notification.timer);

    notification.timer = setTimeout(() => {
        notification.style.display = "none";
    }, 3500);
}

/* =========================================================
   INTERFACE AUTHENTIFICATION
========================================================= */

function showAuthentication() {
    const auth = $("#authScreen");
    const app = $("#app");

    if (auth) auth.style.display = "flex";
    if (app) app.style.display = "none";
}

function showApplication() {
    const auth = $("#authScreen");
    const app = $("#app");

    if (auth) auth.style.display = "none";
    if (app) app.style.display = "block";

    updateProfileDisplay();
    renderConversationList();
    renderMessages();
}

/* =========================================================
   ÉVÉNEMENTS
========================================================= */

function initializeEvents() {
    $("#sendButton")?.addEventListener("click", sendMessage);

    $("#messageInput")?.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    $("#newChatButton")?.addEventListener("click", newChat);

    $("#logoutButton")?.addEventListener("click", () => logout());

    $("#loginForm")?.addEventListener("submit", async event => {
        event.preventDefault();

        const email = $("#loginEmail")?.value.trim();
        const password = $("#loginPassword")?.value;

        if (!email || !password) {
            showNotification("Remplis tous les champs.", "error");
            return;
        }

        await login(email, password);
    });

    $("#registerForm")?.addEventListener("submit", async event => {
        event.preventDefault();

        const name = $("#registerName")?.value.trim();
        const email = $("#registerEmail")?.value.trim();
        const password = $("#registerPassword")?.value;

        if (!name || !email || !password) {
            showNotification("Remplis tous les champs.", "error");
            return;
        }

        await register(name, email, password);
    });

    $("#searchConversations")?.addEventListener("input", event => {
        const results = searchConversations(event.target.value);
        const container = $("#conversationList");

        if (!container) return;

        container.innerHTML = results.map(conversation => `
            <button
                class="conversation-item"
                data-conversation-id="${escapeHTML(conversation.id)}"
            >
                ${escapeHTML(conversation.title)}
            </button>
        `).join("");

        container.querySelectorAll("[data-conversation-id]").forEach(button => {
            button.addEventListener("click", () => {
                openConversation(button.dataset.conversationId);
            });
        });
    });
}

/* =========================================================
   INITIALISATION
========================================================= */

async function initializeGenius() {
    initializeEvents();

    if (state.token) {
        showApplication();

        await loadProfile();

        if (state.activeConversation) {
            await openConversation(state.activeConversation);
        }

    } else {
        showAuthentication();
    }

    console.log(
        `${APP_NAME} V${APP_VERSION} initialisé.`
    );
}

document.addEventListener("DOMContentLoaded", initializeGenius);

/* =========================================================
   FIN GENIUS IA V2.6.0
   Créateur : MARUCE SOLDADO 🇬🇳
========================================================= */
