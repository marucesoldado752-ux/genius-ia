/* =================================================
   GENIUS IA V2.2
   AUTHENTIFICATION + CHAT IA
   Créateur : MARUCE SOLDADO 🇬🇳
================================================= */

"use strict";

/* =================================================
   CONFIGURATION
================================================= */

const APP_NAME = "GENIUS IA";

const API_BASE_URL = "https://genius-ia-sand.vercel.app";

const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;
const LOGIN_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
const REGISTER_ENDPOINT = `${API_BASE_URL}/api/auth/register`;
const PROFILE_ENDPOINT = `${API_BASE_URL}/api/auth/me`;

const TOKEN_KEY = "genius_ia_token";
const USER_KEY = "genius_ia_user";

const ACTIVE_KEY = "genius_ia_active_v1";

let STORAGE_KEY = null;

let currentUser = null;
let conversations = [];
let activeConversation = null;
let isSending = false;


/* =================================================
   ÉLÉMENTS HTML
================================================= */

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


/* =================================================
   OUTILS
================================================= */

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
    button.textContent = loading ? "Patientez..." : normalText;
}

async function apiRequest(url, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("Réponse invalide du serveur.");
    }

    if (!response.ok || !data.success) {

        throw new Error(
            data.error || "Une erreur est survenue."
        );

    }

    return data;
}


/* =================================================
   AFFICHAGE CONNEXION / INSCRIPTION
================================================= */

function showLoginForm() {

    loginForm.hidden = false;
    registerForm.hidden = true;

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    showAuthMessage("");

}

function showRegisterForm() {

    loginForm.hidden = true;
    registerForm.hidden = false;

    loginTab.classList.remove("active");
    registerTab.classList.add("active");

    showAuthMessage("");

}

loginTab.addEventListener("click", showLoginForm);
registerTab.addEventListener("click", showRegisterForm);


/* =================================================
   INSCRIPTION
================================================= */

registerForm.addEventListener("submit", async event => {

    event.preventDefault();

    const button = registerForm.querySelector(
        'button[type="submit"]'
    );

    const full_name = document
        .getElementById("registerName")
        .value.trim();

    const country = document
        .getElementById("registerCountry")
        .value.trim();

    const phone = document
        .getElementById("registerPhone")
        .value.trim();

    const password = document
        .getElementById("registerPassword")
        .value;

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

        showAuthMessage(
            "Compte créé avec succès !",
            "success"
        );

        registerForm.reset();

        enterApplication();

    } catch (error) {

        console.error("REGISTER ERROR:", error);

        showAuthMessage(error.message);

    } finally {

        setButtonLoading(button, false, "Créer mon compte");

    }

});


/* =================================================
   CONNEXION
================================================= */

loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    const button = loginForm.querySelector(
        'button[type="submit"]'
    );

    const phone = document
        .getElementById("loginPhone")
        .value.trim();

    const password = document
        .getElementById("loginPassword")
        .value;

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

        enterApplication();

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        showAuthMessage(error.message);

    } finally {

        setButtonLoading(button, false, "Se connecter");

    }

});


/* =================================================
   VÉRIFICATION DE SESSION
================================================= */

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


/* =================================================
   AFFICHAGE AUTHENTIFICATION
================================================= */

function showAuthentication() {

    authScreen.hidden = false;
    mainApp.hidden = true;

    showLoginForm();

}


/* =================================================
   OUVERTURE APPLICATION
================================================= */

function enterApplication() {

    if (!currentUser) {
        showAuthentication();
        return;
    }

    authScreen.hidden = true;
    mainApp.hidden = false;

    updateUserProfile();

    STORAGE_KEY = getUserStorageKey(currentUser.id);

    initializeChat();

}


/* =================================================
   PROFIL UTILISATEUR
================================================= */

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
        userPhoneElement.textContent = currentUser.phone;
    }

    if (userAvatar) {
        userAvatar.textContent = name.charAt(0).toUpperCase();
    }

}


/* =================================================
   DÉCONNEXION
================================================= */

logoutButton.addEventListener("click", () => {

    if (!confirm("Voulez-vous vraiment vous déconnecter ?")) {
        return;
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    currentUser = null;

    conversations = [];
    activeConversation = null;

    showAuthentication();

});


/* =================================================
   INITIALISATION CHAT
================================================= */

function initializeChat() {

    if (!STORAGE_KEY) return;

    loadConversations();

    const savedActive = localStorage.getItem(
        `${ACTIVE_KEY}_${currentUser.id}`
    );

    if (
        savedActive &&
        conversations.some(c => c.id === savedActive)
    ) {

        activeConversation = savedActive;

        renderConversation(savedActive);

    } else {

        activeConversation = null;

        showWelcome();

    }

    attachEvents();

}


/* =================================================
   CHARGEMENT CONVERSATIONS
================================================= */

function loadConversations() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        conversations = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(conversations)) {
            conversations = [];
        }

    } catch (error) {

        console.error("Erreur de chargement:", error);

        conversations = [];

    }

}


/* =================================================
   SAUVEGARDE
================================================= */

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

        }

    } catch (error) {

        console.error("Erreur de sauvegarde:", error);

    }

}


/* =================================================
   IDENTIFIANT UNIQUE
================================================= */

function generateID() {

    return "genius_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 9);

}


/* =================================================
   NOUVELLE CONVERSATION
================================================= */

function createNewConversation() {

    if (isSending) return;

    const conversation = {

        id: generateID(),

        title: "Nouvelle conversation",

        messages: [],

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()

    };

    conversations.unshift(conversation);

    activeConversation = conversation.id;

    saveConversations();

    messages.innerHTML = "";

    showChat();

    userInput.value = "";

    userInput.focus();

}


/* =================================================
   ACCUEIL
================================================= */

function showWelcome() {

    welcome.style.display = "block";

    chatArea.style.display = "none";

}


/* =================================================
   DISCUSSION
================================================= */

function showChat() {

    welcome.style.display = "none";

    chatArea.style.display = "block";

}


/* =================================================
   AFFICHAGE CONVERSATION
================================================= */

function renderConversation(id) {

    const conversation = conversations.find(
        c => c.id === id
    );

    if (!conversation) {

        activeConversation = null;

        showWelcome();

        return;

    }

    activeConversation = id;

    messages.innerHTML = "";

    showChat();

    conversation.messages.forEach(message => {

        displayMessage(
            message.role,
            message.content
        );

    });

    saveConversations();

}


/* =================================================
   AFFICHAGE MESSAGE
================================================= */

function displayMessage(role, content) {

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

    avatar.textContent =
        role === "user" ? "U" : "G";

    const messageContent = document.createElement("div");

    messageContent.className = "message-content";

    const name = document.createElement("strong");

    name.textContent =
        role === "user" ? "VOUS" : APP_NAME;

    const paragraph = document.createElement("p");

    paragraph.style.whiteSpace = "pre-wrap";

    paragraph.textContent = content;

    messageContent.appendChild(name);
    messageContent.appendChild(paragraph);

    wrapper.appendChild(avatar);
    wrapper.appendChild(messageContent);

    messages.appendChild(wrapper);

    scrollToBottom();

    return wrapper;

}


/* =================================================
   INDICATEUR DE RÉFLEXION
================================================= */

function showThinking() {

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

    const paragraph = document.createElement("p");

    paragraph.textContent = "GENIUS IA réfléchit...";

    content.appendChild(name);
    content.appendChild(paragraph);

    wrapper.appendChild(avatar);
    wrapper.appendChild(content);

    messages.appendChild(wrapper);

    scrollToBottom();

}


/* =================================================
   SUPPRESSION INDICATEUR
================================================= */

function removeThinking() {

    const thinking = document.getElementById(
        "genius-thinking"
    );

    if (thinking) thinking.remove();

}


/* =================================================
   SCROLL
================================================= */

function scrollToBottom() {

    setTimeout(() => {

        const lastMessage = messages.lastElementChild;

        if (lastMessage) {

            lastMessage.scrollIntoView({
                behavior: "smooth",
                block: "end"
            });

        }

    }, 100);

}


/* =================================================
   APPEL MOTEUR IA
================================================= */

async function askGeniusAI(messageHistory) {

    const response = await fetch(CHAT_ENDPOINT, {

        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getToken()}`
        },

        body: JSON.stringify({
            messages: messageHistory
        })

    });

    let data;

    try {

        data = await response.json();

    } catch {

        throw new Error("Réponse invalide du serveur.");

    }

    if (!response.ok || !data.success) {

        throw new Error(
            data.error || "Impossible de contacter GENIUS IA."
        );

    }

    if (
        typeof data.reply !== "string" ||
        !data.reply.trim()
    ) {

        throw new Error("Réponse IA invalide.");

    }

    return data.reply;

}


/* =================================================
   ENVOI MESSAGE
================================================= */

async function sendMessage() {

    if (isSending || !currentUser) return;

    const text = userInput.value.trim();

    if (!text) return;

    if (!activeConversation) {

        const conversation = {

            id: generateID(),

            title: "Nouvelle conversation",

            messages: [],

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString()

        };

        conversations.unshift(conversation);

        activeConversation = conversation.id;

    }

    const conversation = conversations.find(
        c => c.id === activeConversation
    );

    if (!conversation) return;

    isSending = true;

    sendButton.disabled = true;
    userInput.disabled = true;

    userInput.value = "";

    showChat();

    conversation.messages.push({

        role: "user",

        content: text,

        createdAt: new Date().toISOString()

    });

    if (conversation.messages.length === 1) {

        conversation.title =
            text.length > 35
                ? text.substring(0, 35) + "..."
                : text;

    }

    displayMessage("user", text);

    conversation.updatedAt = new Date().toISOString();

    saveConversations();

    showThinking();

    try {

        const messageHistory = conversation.messages

            .filter(message =>
                ["user", "assistant"].includes(message.role)
            )

            .slice(-30)

            .map(message => ({
                role: message.role,
                content: message.content
            }));

        const answer = await askGeniusAI(messageHistory);

        removeThinking();

        conversation.messages.push({

            role: "assistant",

            content: answer,

            createdAt: new Date().toISOString()

        });

        displayMessage("assistant", answer);

        conversation.updatedAt = new Date().toISOString();

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

        sendButton.disabled = false;
        userInput.disabled = false;

        userInput.focus();

    }

}


/* =================================================
   SUGGESTIONS
================================================= */

function attachSuggestionEvents() {

    document.querySelectorAll(".suggestion").forEach(button => {

        button.addEventListener("click", () => {

            const prompt = button.dataset.prompt;

            if (!prompt) return;

            userInput.value = prompt;

            sendMessage();

        });

    });

}


/* =================================================
   HISTORIQUE
================================================= */

function showHistory() {

    if (conversations.length === 0) {

        alert("Aucune conversation enregistrée.");

        return;

    }

    const history = conversations
        .map((conversation, index) =>
            `${index + 1}. ${conversation.title}`
        )
        .join("\n");

    const selection = prompt(
        "HISTORIQUE GENIUS IA\n\n" +
        history +
        "\n\nEntrez le numéro de la conversation :"
    );

    if (selection === null) return;

    const index = Number(selection) - 1;

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= conversations.length
    ) {

        alert("Numéro invalide.");

        return;

    }

    renderConversation(conversations[index].id);

}


/* =================================================
   MENU MOBILE
================================================= */

function toggleSidebar() {

    sidebar.classList.toggle("open");

}


/* =================================================
   ÉVÉNEMENTS CHAT
================================================= */

let eventsAttached = false;

function attachEvents() {

    if (eventsAttached) return;

    eventsAttached = true;

    sendButton.addEventListener("click", sendMessage);

    newChatButton.addEventListener(
        "click",
        createNewConversation
    );

    mobileMenu.addEventListener(
        "click",
        toggleSidebar
    );

    historyButton.addEventListener(
        "click",
        showHistory
    );

    userInput.addEventListener("keydown", event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    });

    userInput.addEventListener("input", () => {

        userInput.style.height = "auto";

        userInput.style.height =
            Math.min(userInput.scrollHeight, 160) + "px";

    });

    document.addEventListener("click", event => {

        if (
            window.innerWidth <= 650 &&
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !mobileMenu.contains(event.target)
        ) {

            sidebar.classList.remove("open");

        }

    });

    attachSuggestionEvents();

}


/* =================================================
   DÉMARRAGE
================================================= */

document.addEventListener("DOMContentLoaded", async () => {

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
        enterApplication();
    }

});
