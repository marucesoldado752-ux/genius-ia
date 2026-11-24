/* =========================================
   GENIUS IA
   LE FUTUR COMMENCE AVEC NOUS
   Application principale
========================================= */

const APP_NAME = "GENIUS IA";

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


/* =========================================
   INITIALISATION
========================================= */

function initializeApp() {

    loadConversations();

    const savedActive = localStorage.getItem(ACTIVE_KEY);

    if (savedActive && conversations.some(c => c.id === savedActive)) {
        activeConversation = savedActive;
        renderConversation(savedActive);
    } else {
        showWelcome();
    }

    attachEvents();

}


/* =========================================
   CHARGEMENT DES CONVERSATIONS
========================================= */

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


/* =========================================
   SAUVEGARDE
========================================= */

function saveConversations() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );

        if (activeConversation) {
            localStorage.setItem(ACTIVE_KEY, activeConversation);
        }

    } catch (error) {

        console.error("Erreur de sauvegarde :", error);

        alert("Impossible de sauvegarder cette conversation.");

    }

}


/* =========================================
   NOUVELLE CONVERSATION
========================================= */

function createNewConversation() {

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


/* =========================================
   IDENTIFIANT UNIQUE
========================================= */

function generateID() {

    return "genius_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 9);

}


/* =========================================
   AFFICHAGE ACCUEIL
========================================= */

function showWelcome() {

    welcome.style.display = "block";

    chatArea.style.display = "none";

}


/* =========================================
   AFFICHAGE DISCUSSION
========================================= */

function showChat() {

    welcome.style.display = "none";

    chatArea.style.display = "block";

}


/* =========================================
   AFFICHER UNE CONVERSATION
========================================= */

function renderConversation(id) {

    const conversation = conversations.find(c => c.id === id);

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


/* =========================================
   AFFICHER UN MESSAGE
========================================= */

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

}


/* =========================================
   SCROLL AUTOMATIQUE
========================================= */

function scrollToBottom() {

    setTimeout(() => {

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
        });

    }, 100);

}


/* =========================================
   ENVOYER UN MESSAGE
========================================= */

async function sendMessage() {

    if (isSending) return;

    const text = userInput.value.trim();

    if (!text) return;

    if (!activeConversation) {
        createNewConversation();
    }

    const conversation = conversations.find(
        c => c.id === activeConversation
    );

    if (!conversation) return;

    isSending = true;

    sendButton.disabled = true;

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

    try {

        /*
         * LE MOTEUR IA SERA CONNECTÉ
         * À NOTRE BACKEND DANS LA PROCHAINE PHASE.
         *
         * Ne pas mettre de clé API ici.
         */

        await new Promise(resolve => setTimeout(resolve, 500));

        const answer =
            "Merci pour votre message ! Je suis GENIUS IA. " +
            "Mon moteur d'intelligence artificielle est en cours " +
            "d'installation. La prochaine étape consistera à " +
            "connecter mon serveur IA sécurisé pour vous fournir " +
            "de véritables réponses intelligentes.";

        conversation.messages.push({

            role: "assistant",

            content: answer,

            createdAt: new Date().toISOString()

        });

        displayMessage("assistant", answer);

        conversation.updatedAt = new Date().toISOString();

        saveConversations();

    } catch (error) {

        console.error("Erreur :", error);

        displayMessage(
            "assistant",
            "Une erreur est survenue. Veuillez réessayer."
        );

    } finally {

        isSending = false;

        sendButton.disabled = false;

        userInput.focus();

    }

}


/* =========================================
   SUGGESTIONS
========================================= */

function attachSuggestionEvents() {

    const suggestions = document.querySelectorAll(
        ".suggestion"
    );

    suggestions.forEach(button => {

        button.addEventListener("click", () => {

            const prompt = button.dataset.prompt;

            userInput.value = prompt;

            sendMessage();

        });

    });

}


/* =========================================
   HISTORIQUE
========================================= */

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

    alert(
        "HISTORIQUE GENIUS IA\n\n" +
        history +
        "\n\nLa navigation dans l'historique sera améliorée dans une prochaine version."
    );

}


/* =========================================
   MENU MOBILE
========================================= */

function toggleSidebar() {

    sidebar.classList.toggle("open");

}


/* =========================================
   ÉVÉNEMENTS
========================================= */

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


/* =========================================
   DÉMARRAGE
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeApp();

});
