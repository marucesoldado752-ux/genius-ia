"use strict";

/* =========================================================
   GENIUS IA — BACKEND V2.2.0
   Créateur : MARUCE SOLDADO 🇬🇳
   Slogan : Le futur commence avec nous.
========================================================= */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const VERSION = "2.2.0";

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || "openai/gpt-4o-mini";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const JWT_SECRET = process.env.JWT_SECRET;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://marucesoldado752-ux.github.io";

if (!OPENROUTER_API_KEY) {
  console.error("ERREUR : OPENROUTER_API_KEY manquante");
}

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("ERREUR : configuration Supabase manquante");
}

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("ERREUR : JWT_SECRET absent ou trop court");
}

/* =========================================================
   SUPABASE
========================================================= */

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/* =========================================================
   MIDDLEWARES
========================================================= */

app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: [
    FRONTEND_URL,
    "https://marucesoldado752-ux.github.io",
    "https://genius-ia-sand.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ]
}));

app.use(express.json({
  limit: "2mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "2mb"
}));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Trop de demandes. Réessayez dans une minute."
  }
});

app.use("/api", apiLimiter);

/* =========================================================
   OUTILS
========================================================= */

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\u0000/g, "")
    .slice(0, maxLength);
}

function normalizePhone(phone) {
  return cleanText(phone, 30).replace(/[\s()-]/g, "");
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
      expiresIn: "30d"
    }
  );
}

function safeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    country: user.country,
    phone: user.phone,
    role: user.role,
    created_at: user.created_at
  };
}

/* =========================================================
   AUTHENTIFICATION
========================================================= */

function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Connexion obligatoire"
      });
    }

    const token = header.slice(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        error: "Session invalide"
      });
    }

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Session expirée ou invalide"
    });
  }
}

/* =========================================================
   ROUTE ACCUEIL
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    application: "GENIUS IA",
    creator: "MARUCE SOLDADO",
    slogan: "Le futur commence avec nous.",
    version: VERSION,
    server: "online"
  });
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    aiConfigured: Boolean(OPENROUTER_API_KEY),
    databaseConfigured: Boolean(
      SUPABASE_URL && SUPABASE_SECRET_KEY
    ),
    version: VERSION
  });
});

/* =========================================================
   INSCRIPTION
========================================================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const full_name = cleanText(req.body.full_name, 100);
    const country = cleanText(req.body.country, 80);
    const phone = normalizePhone(req.body.phone);
    const password = req.body.password;

    if (!full_name || !country || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: "Tous les champs sont obligatoires"
      });
    }

    if (!/^\+?[0-9]{8,20}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: "Numéro de téléphone invalide"
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

    const { data: existingUser, error: searchError } =
      await supabase
        .from("genius_users")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

    if (searchError) throw searchError;

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "Ce numéro possède déjà un compte"
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: newUser, error: insertError } =
      await supabase
        .from("genius_users")
        .insert({
          full_name,
          country,
          phone,
          password_hash,
          role: "user",
          is_active: true
        })
        .select(
          "id, full_name, country, phone, role, created_at"
        )
        .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(409).json({
          success: false,
          error: "Ce numéro possède déjà un compte"
        });
      }

      throw insertError;
    }

    const token = createToken(newUser);

    return res.status(201).json({
      success: true,
      message: "Compte créé avec succès",
      token,
      user: safeUser(newUser)
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de créer le compte"
    });
  }
});

/* =========================================================
   CONNEXION
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const password = req.body.password;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: "Numéro et mot de passe obligatoires"
      });
    }

    const { data: user, error } = await supabase
      .from("genius_users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Numéro ou mot de passe incorrect"
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: "Votre compte est désactivé"
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        error: "Numéro ou mot de passe incorrect"
      });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Connexion réussie",
      token,
      user: safeUser(user)
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de se connecter"
    });
  }
});

/* =========================================================
   PROFIL UTILISATEUR
========================================================= */

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("genius_users")
      .select(
        "id, full_name, country, phone, role, is_active, created_at"
      )
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!user || !user.is_active) {
      return res.status(403).json({
        success: false,
        error: "Compte introuvable ou désactivé"
      });
    }

    return res.json({
      success: true,
      user: safeUser(user)
    });

  } catch (error) {
    console.error("PROFILE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de récupérer le profil"
    });
  }
});

/* =========================================================
   CHAT GENIUS IA — ROUTE PROTÉGÉE
========================================================= */

app.post("/api/chat", auth, async (req, res) => {
  try {
    /* Vérifier que le compte existe et reste actif */

    const { data: user, error: userError } = await supabase
      .from("genius_users")
      .select("id, is_active")
      .eq("id", req.user.id)
      .maybeSingle();

    if (userError) throw userError;

    if (!user || !user.is_active) {
      return res.status(403).json({
        success: false,
        error: "Votre compte est désactivé"
      });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "Le service IA est momentanément indisponible"
      });
    }

    const messages = req.body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Votre message est vide"
      });
    }

    if (messages.length > 30) {
      return res.status(400).json({
        success: false,
        error: "Trop de messages dans cette conversation"
      });
    }

    const allowedRoles = ["user", "assistant"];

    const cleanMessages = [];

    for (const message of messages) {
      if (
        !message ||
        !allowedRoles.includes(message.role) ||
        typeof message.content !== "string"
      ) {
        continue;
      }

      const content = cleanText(message.content, 12000);

      if (content) {
        cleanMessages.push({
          role: message.role,
          content
        });
      }
    }

    if (
      cleanMessages.length === 0 ||
      cleanMessages[cleanMessages.length - 1].role !== "user"
    ) {
      return res.status(400).json({
        success: false,
        error: "Envoyez un message pour commencer"
      });
    }

    const systemPrompt = `
Tu es GENIUS IA 🤖, une intelligence artificielle internationale.

Créateur : MARUCE SOLDADO 🇬🇳
Slogan : Le futur commence avec nous.

Ta mission :
- Répondre clairement et rapidement.
- Aider à apprendre et à travailler.
- Rédiger et corriger des textes.
- Traduire dans plusieurs langues.
- Programmer et expliquer le code.
- Aider à comprendre les documents.
- Donner des explications utiles et précises.
- Accompagner les utilisateurs dans leurs projets.

Règles :
- Réponds dans la langue de l'utilisateur.
- Sois naturel, professionnel et utile.
- Évite les longues introductions inutiles.
- Ne prétends pas avoir effectué une action que tu n'as pas réalisée.
- Si tu ne connais pas une réponse, dis-le honnêtement.
- Respecte les utilisateurs.
`;

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 110000);

    let aiResponse;

    try {
      aiResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": FRONTEND_URL,
            "X-Title": "GENIUS IA"
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              ...cleanMessages
            ],
            temperature: 0.7,
            max_tokens: 4000
          }),
          signal: controller.signal
        }
      );

    } finally {
      clearTimeout(timeout);
    }

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error(
        "OPENROUTER ERROR:",
        result.error?.message || aiResponse.status
      );

      return res.status(502).json({
        success: false,
        error: "Le service IA n'a pas pu répondre. Réessayez."
      });
    }

    const reply =
      result.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return res.status(502).json({
        success: false,
        error: "L'intelligence artificielle n'a pas retourné de réponse"
      });
    }

    return res.json({
      success: true,
      reply: reply.trim(),
      model: AI_MODEL
    });

  } catch (error) {
    console.error("CHAT ERROR:", error.message);

    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        error: "Le délai de réponse est dépassé. Réessayez."
      });
    }

    return res.status(500).json({
      success: false,
      error: "Une erreur est survenue pendant la réponse de GENIUS IA"
    });
  }
});

/* =========================================================
   ROUTE INCONNUE
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route introuvable",
    path: req.originalUrl
  });
});

/* =========================================================
   GESTION DES ERREURS
========================================================= */

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    error: "Erreur interne du serveur"
  });
});

/* =========================================================
   DÉMARRAGE
========================================================= */

app.listen(PORT, () => {
  console.log("-----------------------------------");
  console.log("GENIUS IA V" + VERSION);
  console.log("Créateur : MARUCE SOLDADO 🇬🇳");
  console.log("Serveur opérationnel");
  console.log("Port :", PORT);
  console.log("-----------------------------------");
});

module.exports = app;
