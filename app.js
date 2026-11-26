/* =================================================
   GENIUS IA V2.3
   AUTHENTIFICATION + CHAT IA + HISTORIQUE SUPABASE
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

const CONVERSATIONS_ENDPOINT = `${API_BASE_URL}/api/conversations`;

const TOKEN_KEY = "genius_ia_token";
const USER_KEY = "genius_ia_user";
const ACTIVE_KEY = "genius_ia_active_v1";

let STORAGE_KEY = null;

let currentUser = null;
let conversations = [];
let activeConversation = null;

let isSending = false;
let eventsAttached = false;


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
   OUTILS GÉNÉRAUX
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


/* =================================================
   REQUÊTES API
================================================= */

async function apiRequest(url, options = {}) {

    const headers = {

        "Content-Type": "application/json",

        ...(options.headers || {})

    };

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


/* =================================================
   INSCRIPTION
================================================= */

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

    showAuthMessage(
        "Création de votre compte...",
        "loading"
    );

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

            throw new Error(
                "Réponse d'inscription incomplète."
            );

        }

        localStorage.setItem(TOKEN_KEY, data.token);

        localStorage.setItem(
            USER_KEY,
            JSON.stringify(data.user)
        );

        currentUser = data.user;

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

    showAuthMessage(
        "Connexion en cours...",
        "loading"
    );

    try {

        const data = await apiRequest(LOGIN_ENDPOINT, {

            method: "POST",

            body: JSON.stringify({

                phone,
                password

            })

        });

        if (!data.token || !data.user) {

            throw new Error(
                "Réponse de connexion incomplète."
            );

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

        console.warn(
            "SESSION EXPIRÉE:",
            error.message
        );

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

    if (authScreen) authScreen.hidden = false;

    if (mainApp) mainApp.hidden = true;

    showLoginForm();

}


/* =================================================
   OUVERTURE APPLICATION
================================================= */

async function enterApplication() {

    if (!currentUser) {

        showAuthentication();

        return;

    }

    if (authScreen) authScreen.hidden = true;

    if (mainApp) mainApp.hidden = false;

    updateUserProfile();

    STORAGE_KEY = getUserStorageKey(currentUser.id);

    attachEvents();

    await initializeChat();

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

        userPhoneElement.textContent = currentUser.phone || "";

    }

    if (userAvatar) {

        userAvatar.textContent =
            name.charAt(0).toUpperCase();

    }

}


/* =================================================
   DÉCONNEXION
================================================= */

logoutButton?.addEventListener("click", () => {

    if (
        !confirm("Voulez-vous vraiment vous déconnecter ?")
    ) {

        return;

    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    currentUser = null;

    conversations = [];
    activeConversation = null;

    STORAGE_KEY = null;

    showAuthentication();

});


/* =================================================
   INITIALISATION CHAT
================================================= */

async function initializeChat() {

    if (!STORAGE_KEY || !currentUser) return;

    loadLocalConversations();

    try {

        await loadRemoteConversations();

    } catch (error) {

        console.error(
            "CHARGEMENT HISTORIQUE:",
            error
        );

    }

    const savedActive = localStorage.getItem(
        `${ACTIVE_KEY}_${currentUser.id}`
    );

    if (
        savedActive &&
        conversations.some(c => c.id === savedActive)
    ) {

        await openConversation(savedActive);

    } else {

        activeConversation = null;

        showWelcome();

    }

}


/* =================================================
   CHARGEMENT LOCAL
================================================= */

function loadLocalConversations() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        const local = saved
            ? JSON.parse(saved)
            : [];

        conversations = Array.isArray(local)
            ? local.map(normalizeConversation)
            : [];

    } catch (error) {

        console.error(
            "ERREUR HISTORIQUE LOCAL:",
            error
        );

        conversations = [];

    }

}


/* =================================================
   CHARGEMENT SUPABASE
================================================= */

async function loadRemoteConversations() {

    const data = await apiRequest(
        CONVERSATIONS_ENDPOINT,
        {
            method: "GET"
        }
    );

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

}


/* =================================================
   SAUVEGARDE LOCALE
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

        console.error(
            "ERREUR SAUVEGARDE:",
            error
        );

    }

}


/* =================================================
   CRÉATION CONVERSATION SERVEUR
================================================= */

async function createRemoteConversation(title) {

    const data = await apiRequest(
        CONVERSATIONS_ENDPOINT,
        {

            method: "POST",

            body: JSON.stringify({

                title: title || "Nouvelle conversation"

            })

        }
    );

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


/* =================================================
   NOUVELLE CONVERSATION
================================================= */

async function createNewConversation() {

    if (isSending || !currentUser) return;

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

        messages.innerHTML = "";

        showChat();

        if (userInput) {

            userInput.value = "";

            userInput.focus();

        }

    } catch (error) {

        console.error(
            "NOUVELLE CONVERSATION:",
            error
        );

        const conversation = {

            id: generateID(),

            title: "Nouvelle conversation",

            messages: [],

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString(),

            isLocal: true

        };

        conversations.unshift(conversation);

        activeConversation = conversation.id;

        saveConversations();

        messages.innerHTML = "";

        showChat();

        if (userInput) userInput.focus();

    } finally {

        if (newChatButton) {

            newChatButton.disabled = false;

        }

    }

}


/* =================================================
   ACCUEIL
================================================= */

function showWelcome() {

    if (welcome) welcome.style.display = "block";

    if (chatArea) chatArea.style.display = "none";

}


/* =================================================
   AFFICHAGE CHAT
================================================= */

function showChat() {

    if (welcome) welcome.style.display = "none";

    if (chatArea) chatArea.style.display = "block";

}


/* =================================================
   CHARGEMENT DES MESSAGES D'UNE CONVERSATION
================================================= */

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


/* =================================================
   OUVERTURE CONVERSATION
================================================= */

async function openConversation(id) {

    const conversation = conversations.find(
        c => c.id === id
    );

    if (!conversation) {

        showWelcome();

        return;

    }

    activeConversation = id;

    messages.innerHTML = "";

    showChat();

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

        renderConversation(id);

    } catch (error) {

        console.error(
            "CHARGEMENT DES MESSAGES:",
            error
        );

        renderConversation(id);

        alert(
            "Impossible de récupérer les messages sur le serveur."
        );

    }

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

        if (
            message.role === "user" ||
            message.role === "assistant"
        ) {

            displayMessage(
                message.role,
                message.content
            );

        }

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

        if (!messages) return;

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

    const data = await apiRequest(
        CHAT_ENDPOINT,
        {

            method: "POST",

            body: JSON.stringify(body)

        }
    );

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


/* =================================================
   ENVOI MESSAGE
================================================= */

async function sendMessage() {

    if (isSending || !currentUser || !userInput) return;

    const text = userInput.value.trim();

    if (!text) return;

    let conversation = conversations.find(
        c => c.id === activeConversation
    );

    if (!conversation) {

        conversation = {

            id: generateID(),

            title: "Nouvelle conversation",

            messages: [],

            createdAt: new Date().toISOString(),

            updatedAt: new Date().toISOString(),

            isLocal: true

        };

        conversations.unshift(conversation);

        activeConversation = conversation.id;

    }

    isSending = true;

    if (sendButton) sendButton.disabled = true;

    userInput.disabled = true;

    userInput.value = "";

    showChat();

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

    try {

        const messageHistory = conversation.messages

            .filter(message => {

                return ["user", "assistant"].includes(
                    message.role
                );

            })

            .slice(-30)

            .map(message => ({

                role: message.role,

                content: message.content

            }));

        const result = await askGeniusAI(
            messageHistory,
            conversation.isLocal ? null : conversation.id
        );

        removeThinking();

        /*
         * Le serveur peut créer automatiquement
         * une conversation si aucun identifiant
         * n'a été transmis.
         */

        if (result.conversation_id) {

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

        console.error(
            "GENIUS IA ERROR:",
            error
        );

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


/* =================================================
   SUPPRESSION CONVERSATION
================================================= */

async function deleteConversation(id) {

    const conversation = conversations.find(
        c => c.id === id
    );

    if (!conversation) return;

    if (
        !confirm("Voulez-vous supprimer cette conversation ?")
    ) {

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

        conversations = conversations.filter(
            c => c.id !== id
        );

        if (activeConversation === id) {

            activeConversation = null;

            messages.innerHTML = "";

            showWelcome();

        }

        saveConversations();

    } catch (error) {

        console.error(
            "SUPPRESSION CONVERSATION:",
            error
        );

        alert(
            "Impossible de supprimer cette conversation : " +
            error.message
        );

    }

}


/* =================================================
   SUGGESTIONS
================================================= */

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


/* =================================================
   HISTORIQUE
================================================= */

function showHistory() {

    if (conversations.length === 0) {

        alert("Aucune conversation enregistrée.");

        return;

    }

    const history = conversations

        .map((conversation, index) => {

            return `${index + 1}. ${conversation.title}`;

        })

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

    openConversation(conversations[index].id);

}


/* =================================================
   MENU MOBILE
================================================= */

function toggleSidebar() {

    if (!sidebar) return;

    sidebar.classList.toggle("open");

}


/* =================================================
   ÉVÉNEMENTS CHAT
================================================= */

function attachEvents() {

    if (eventsAttached) return;

    eventsAttached = true;

    sendButton?.addEventListener(
        "click",
        sendMessage
    );

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

        if (

            event.key === "Enter" &&

            !event.shiftKey

        ) {

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

        await enterApplication();

    }

});
