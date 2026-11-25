/* =================================================
   GENIUS IA V2.0
   LE FUTUR COMMENCE AVEC NOUS
   Créateur : MARUCE SOLDADO 🇬🇳
   MOTEUR IA : OPENROUTER
   SERVEUR : VERCEL
================================================= */

"use strict";

const APP_NAME = "GENIUS IA";

const API_BASE_URL = "https://genius-ia-sand.vercel.app";

const CHAT_ENDPOINT = `${API_BASE_URL}/api/chat`;

const STORAGE_KEY = "genius_ia_conversations_v1";
const ACTIVE_KEY = "genius_ia_active_v1";

const welcome = document.getElementById("welcome");
const chatArea = document.getElementById("chatArea");
const messages = document.getElementById("messages");

const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");

const newChatButton = document.getElementById("newChat");
const mobileMenu = document.getElementById("mobileMenu");
const sidebar = document.getElementById("sidebar");
const historyButton = document.getElementById("historyButton");

let conversations = [];
let activeConversation = null;
let isSending = false;


/* =================================================
   INITIALISATION
================================================= */

function initializeApp() {

    loadConversations();

    const savedActive = localStorage.getItem(ACTIVE_KEY);

    if (
        savedActive &&
        conversations.some(c => c.id === savedActive)
    ) {

        activeConversation = savedActive;

        renderConversation(savedActive);

    } else {

        showWelcome();

    }

    attachEvents();

}


/* =================================================
   CHARGEMENT DES CONVERSATIONS
================================================= */

function loadConversations() {

    try {

        const saved = localStorage.getItem(STORAGE_KEY);

        conversations = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(conversations)) {
            conversations = [];
        }

    } catch (error) {

        console.error("Erreur de chargement :", error);

        conversations = [];

    }

}


/* =================================================
   SAUVEGARDE
================================================= */

function saveConversations() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );

        if (activeConversation) {

            localStorage.setItem(
                ACTIVE_KEY,
                activeConversation
            );

        }

    } catch (error) {

        console.error("Erreur de sauvegarde :", error);

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
   AFFICHAGE ACCUEIL
================================================= */

function showWelcome() {

    welcome.style.display = "block";

    chatArea.style.display = "none";

}


/* =================================================
   AFFICHAGE DISCUSSION
================================================= */

function showChat() {

    welcome.style.display = "none";

    chatArea.style.display = "block";

}


/* =================================================
   AFFICHER UNE CONVERSATION
================================================= */

function renderConversation(id) {

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

    conversation.messages.forEach(message => {

        displayMessage(
            message.role,
            message.content
        );

    });

    saveConversations();

}


/* =================================================
   AFFICHAGE DES MESSAGES
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
   SUPPRIMER INDICATEUR
================================================= */

function removeThinking() {

    const thinking = document.getElementById(
        "genius-thinking"
    );

    if (thinking) {
        thinking.remove();
    }

}


/* =================================================
   SCROLL AUTOMATIQUE
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
   COMMUNICATION AVEC LE SERVEUR
================================================= */

async function askGeniusAI(messageHistory) {

    const response = await fetch(CHAT_ENDPOINT, {

        method: "POST",

        headers: {

            "Content-Type": "application/json"

        },

        body: JSON.stringify({

            messages: messageHistory

        })

    });

    let data;

    try {

        data = await response.json();

    } catch (error) {

        throw new Error(
            "Le serveur a envoyé une réponse invalide."
        );

    }

    if (!response.ok || !data.success) {

        throw new Error(
            data.error ||
            "Impossible de contacter GENIUS IA."
        );

    }

    if (
        typeof data.reply !== "string" ||
        !data.reply.trim()
    ) {

        throw new Error(
            "GENIUS IA n'a pas reçu de réponse valide."
        );

    }

    return data.reply;

}


/* =================================================
   ENVOYER UN MESSAGE
================================================= */

async function sendMessage() {

    if (isSending) return;

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

        // Garder uniquement les messages utiles
        // Le serveur accepte maximum 30 messages.

        const messageHistory = conversation.messages
            .filter(message =>
                ["user", "assistant"].includes(message.role)
            )
            .slice(-30)
            .map(message => ({

                role: message.role,

                content: message.content

            }));


        // CONNEXION AU VÉRITABLE MOTEUR IA

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
            "Impossible de traiter votre demande pour le moment.\n\n" +
            error.message +
            "\n\nVeuillez réessayer."
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

    const suggestions = document.querySelectorAll(
        ".suggestion"
    );

    suggestions.forEach(button => {

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
        .map((conversation, index) => {

            return `${index + 1}. ${conversation.title}`;

        })
        .join("\n");

    const selection = prompt(
        "HISTORIQUE GENIUS IA\n\n" +
        history +
        "\n\nEntrez le numéro de la conversation à ouvrir :"
    );

    if (selection === null) return;

    const index = Number(selection) - 1;

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= conversations.length
    ) {

        alert("Numéro de conversation invalide.");

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
   ÉVÉNEMENTS
================================================= */

function attachEvents() {

    sendButton.addEventListener(
        "click",
        sendMessage
    );

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

document.addEventListener("DOMContentLoaded", () => {

    initializeApp();

});
