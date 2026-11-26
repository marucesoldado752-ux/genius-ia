"use strict";

/* =========================================
   GENIUS IA — BACKEND V2.2
   Créateur : MARUCE SOLDADO 🇬🇳
   ========================================= */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const app = express();

/* =========================================
   CONFIGURATION
   ========================================= */

app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const JWT_SECRET = process.env.JWT_SECRET;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://marucesoldado752-ux.github.io";

if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY manquante");
}

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Configuration Supabase manquante");
}

if (!JWT_SECRET || JWT_SECRET.length < 64) {
    throw new Error("JWT_SECRET doit contenir au moins 64 caractères");
}

/* =========================================
   SUPABASE
   ========================================= */

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

/* =========================================
   SÉCURITÉ ET MIDDLEWARES
   ========================================= */

app.disable("x-powered-by");

app.use(helmet());

app.use(cors({
    origin: [
        FRONTEND_URL,
        "https://marucesoldado752-ux.github.io"
    ],
    methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS"
    ],
    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
}));

app.use(express.json({
    limit: "2mb"
}));

const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
        success: false,
        error: "Trop de requêtes. Réessaie dans une minute."
    }
});

app.use("/api", limiter);

/* =========================================
   OUTILS
   ========================================= */

function normalizePhone(phone) {
    return String(phone || "")
        .replace(/[^\d+]/g, "");
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            phone: user.phone,
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

/* =========================================
   AUTHENTIFICATION
   ========================================= */

function auth(req, res, next) {

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: "Connexion requise"
        });
    }

    const token = header.substring(7);

    try {

        req.user = jwt.verify(
            token,
            JWT_SECRET
        );

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            error: "Session invalide ou expirée"
        });

    }
}

/* =========================================
   PAGE D'ACCUEIL
   ========================================= */

app.get("/", (req, res) => {

    res.json({
        success: true,
        application: "GENIUS IA",
        creator: "MARUCE SOLDADO",
        version: "2.2.0",
        status: "online"
    });

});

/* =========================================
   ÉTAT DU SERVEUR
   ========================================= */

app.get("/health", (req, res) => {

    res.json({
        success: true,
        server: "online",
        aiConfigured: Boolean(OPENROUTER_API_KEY),
        databaseConfigured: Boolean(
            SUPABASE_URL && SUPABASE_SECRET_KEY
        ),
        version: "2.2.0"
    });

});

/* =========================================
   INSCRIPTION
   ========================================= */

app.post("/api/auth/register", async (req, res) => {

    try {

        const {
            phone,
            password,
            full_name,
            country
        } = req.body || {};

        const normalizedPhone = normalizePhone(phone);

        const normalizedName = String(
            full_name || ""
        ).trim().slice(0, 100);

        const normalizedCountry = String(
            country || ""
        ).trim().slice(0, 80);

        if (
            !normalizedPhone ||
            normalizedPhone.length < 8 ||
            normalizedPhone.length > 20
        ) {

            return res.status(400).json({
                success: false,
                error: "Numéro de téléphone invalide"
            });

        }

        if (!normalizedName) {

            return res.status(400).json({
                success: false,
                error: "Veuillez saisir votre nom complet"
            });

        }

        if (!normalizedCountry) {

            return res.status(400).json({
                success: false,
                error: "Veuillez saisir votre pays"
            });

        }

        if (
            typeof password !== "string" ||
            password.length < 8 ||
            password.length > 128
        ) {

            return res.status(400).json({
                success: false,
                error: "Le mot de passe doit contenir entre 8 et 128 caractères"
            });

        }

        const {
            data: existingUser,
            error: searchError
        } = await supabase
            .from("genius_users")
            .select("id")
            .eq("phone", normalizedPhone)
            .maybeSingle();

        if (searchError) {
            throw searchError;
        }

        if (existingUser) {

            return res.status(409).json({
                success: false,
                error: "Ce numéro possède déjà un compte"
            });

        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        const {
            data: user,
            error
        } = await supabase
            .from("genius_users")
            .insert({
                phone: normalizedPhone,
                password_hash: passwordHash,
                full_name: normalizedName,
                country: normalizedCountry,
                role: "user",
                is_active: true
            })
            .select(
                "id, phone, full_name, country, role"
            )
            .single();

        if (error) {
            throw error;
        }

        const token = createToken(user);

        return res.status(201).json({
            success: true,
            message: "Compte créé avec succès",
            token,
            user
        });

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "Impossible de créer le compte"
        });

    }

});

/* =========================================
   CONNEXION
   ========================================= */

app.post("/api/auth/login", async (req, res) => {

    try {

        const {
            phone,
            password
        } = req.body || {};

        const normalizedPhone = normalizePhone(phone);

        if (
            !normalizedPhone ||
            typeof password !== "string" ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                error: "Numéro et mot de passe obligatoires"
            });

        }

        const {
            data: user,
            error
        } = await supabase
            .from("genius_users")
            .select("*")
            .eq("phone", normalizedPhone)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!user || !user.is_active) {

            return res.status(401).json({
                success: false,
                error: "Identifiants incorrects"
            });

        }

        const validPassword = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!validPassword) {

            return res.status(401).json({
                success: false,
                error: "Identifiants incorrects"
            });

        }

        const token = createToken(user);

        return res.json({
            success: true,
            message: "Connexion réussie",
            token,
            user: {
                id: user.id,
                phone: user.phone,
                full_name: user.full_name,
                country: user.country,
                role: user.role
            }
        });

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "Erreur pendant la connexion"
        });

    }

});

/* =========================================
   PROFIL UTILISATEUR
   ========================================= */

app.get("/api/auth/me", auth, async (req, res) => {

    try {

        const {
            data: user,
            error
        } = await supabase
            .from("genius_users")
            .select(
                "id, phone, full_name, country, role, created_at, is_active"
            )
            .eq("id", req.user.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (
            !user ||
            !user.is_active ||
            user.role !== req.user.role
        ) {

            return res.status(401).json({
                success: false,
                error: "Compte invalide ou désactivé"
            });

        }

        const {
            is_active,
            ...safeUser
        } = user;

        return res.json({
            success: true,
            user: safeUser
        });

    } catch (error) {

        console.error(
            "PROFILE ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "Impossible de récupérer le profil"
        });

    }

});

/* =========================================
   INTELLIGENCE ARTIFICIELLE
   ROUTE PROTÉGÉE
   ========================================= */

app.post("/api/chat", auth, async (req, res) => {

    try {

        // Vérification que le compte existe
        // et qu'il est toujours actif.

        const {
            data: user,
            error: userError
        } = await supabase
            .from("genius_users")
            .select("id, is_active")
            .eq("id", req.user.id)
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user || !user.is_active) {

            return res.status(403).json({
                success: false,
                error: "Votre compte est désactivé"
            });

        }

        const messages = req.body?.messages;

        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            return res.status(400).json({
                success: false,
                error: "Aucun message fourni"
            });

        }

        const safeMessages = messages

            .filter(message =>
                message &&
                ["user", "assistant"].includes(message.role) &&
                typeof message.content === "string"
            )

            .slice(-30)

            .map(message => ({
                role: message.role,
                content: message.content.slice(0, 12000)
            }));

        if (!safeMessages.length) {

            return res.status(400).json({
                success: false,
                error: "Messages invalides"
            });

        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://marucesoldado752-ux.github.io/genius-ia/",
                    "X-Title": "GENIUS IA"
                },

                body: JSON.stringify({

                    model: AI_MODEL,

                    messages: [
                        {
                            role: "system",
                            content:
                                "Tu es GENIUS IA, une intelligence artificielle internationale créée par MARUCE SOLDADO en Guinée. Tu aides les utilisateurs à apprendre, travailler, rédiger, traduire, programmer et comprendre. Réponds clairement, précisément et dans la langue de l'utilisateur."
                        },

                        ...safeMessages
                    ],

                    max_tokens: 4000,

                    temperature: 0.7

                }),

                signal: AbortSignal.timeout(110000)

            }
        );

        const result = await response.json();

        if (!response.ok) {

            console.error(
                "OPENROUTER ERROR:",
                response.status
            );

            return res.status(502).json({
                success: false,
                error: "Le service IA est temporairement indisponible"
            });

        }

        const answer =
            result.choices?.[0]?.message?.content;

        if (
            typeof answer !== "string" ||
            !answer.trim()
        ) {

            return res.status(502).json({
                success: false,
                error: "Aucune réponse de l'intelligence artificielle"
            });

        }

        return res.json({
            success: true,
            application: "GENIUS IA",
            reply: answer,
            model: result.model || AI_MODEL
        });

    } catch (error) {

        console.error(
            "CHAT ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: "Une erreur est survenue pendant la réponse IA"
        });

    }

});

/* =========================================
   ROUTES INCONNUES
   ========================================= */

app.use((req, res) => {

    res.status(404).json({
        success: false,
        error: "Route introuvable"
    });

});

/* =========================================
   ERREURS JSON
   ========================================= */

app.use((error, req, res, next) => {

    if (error instanceof SyntaxError && error.status === 400) {

        return res.status(400).json({
            success: false,
            error: "Format JSON invalide"
        });

    }

    console.error("SERVER ERROR:", error.message);

    return res.status(500).json({
        success: false,
        error: "Erreur interne du serveur"
    });

});

/* =========================================
   DÉMARRAGE
   ========================================= */

app.listen(PORT, () => {

    console.log(
        `GENIUS IA V2.2 opérationnel sur le port ${PORT}`
    );

});
