"use strict";

/* =========================================================
   GENIUS IA — BACKEND V2.5.0
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
const VERSION = "2.5.0";

/* CONFIGURATION */

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

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error("Configuration Supabase obligatoire");
}

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET doit contenir au moins 32 caractères");
}

/* SUPABASE */

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

/* MIDDLEWARES */

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(
  cors({
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
  })
);

app.use(express.json({ limit: "2mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb"
  })
);

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

/* OUTILS */

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

function safeConversation(conversation) {
  return {
    id: conversation.id,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at
  };
}

/* AUTHENTIFICATION */

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

/* VÉRIFICATION DU COMPTE */

async function getActiveUser(userId) {
  const { data: user, error } = await supabase
    .from("genius_users")
    .select("id, full_name, phone, country, role, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!user || !user.is_active) {
    return null;
  }

  return user;
}

/* PROTECTION ADMINISTRATEUR */

async function adminOnly(req, res, next) {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: "Compte introuvable ou désactivé"
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Accès réservé à l'administrateur"
      });
    }

    req.admin = user;
    next();

  } catch (error) {
    console.error("ADMIN AUTH ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Vérification administrateur impossible"
    });
  }
}

/* VÉRIFICATION DE PROPRIÉTÉ */

async function getOwnedConversation(conversationId, userId) {
  const { data, error } = await supabase
    .from("genius_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/* ACCUEIL */

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

/* HEALTH CHECK */

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

/* INSCRIPTION */

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

/* CONNEXION */

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

/* PROFIL UTILISATEUR */

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
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

/* MODIFIER SON PROFIL */

app.put("/api/profile", auth, async (req, res) => {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: "Compte désactivé"
      });
    }

    const full_name = cleanText(req.body.full_name, 100);
    const country = cleanText(req.body.country, 80);

    if (!full_name || !country) {
      return res.status(400).json({
        success: false,
        error: "Nom et pays obligatoires"
      });
    }

    const { data, error } = await supabase
      .from("genius_users")
      .update({
        full_name,
        country,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id)
      .select(
        "id, full_name, country, phone, role, created_at"
      )
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: "Profil modifié",
      user: safeUser(data)
    });

  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de modifier le profil"
    });
  }
});

/* CHANGER SON MOT DE PASSE */

app.put("/api/auth/password", auth, async (req, res) => {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: "Compte désactivé"
      });
    }

    const currentPassword = req.body.current_password;
    const newPassword = req.body.new_password;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Informations manquantes"
      });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        error: "Le nouveau mot de passe doit contenir entre 8 et 128 caractères"
      });
    }

    const { data: account, error: accountError } =
      await supabase
        .from("genius_users")
        .select("password_hash")
        .eq("id", user.id)
        .single();

    if (accountError) throw accountError;

    const valid = await bcrypt.compare(
      currentPassword,
      account.password_hash
    );

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Mot de passe actuel incorrect"
      });
    }

    const password_hash = await bcrypt.hash(newPassword, 12);

    const { error } = await supabase
      .from("genius_users")
      .update({
        password_hash,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Mot de passe modifié avec succès"
    });

  } catch (error) {
    console.error("PASSWORD ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de changer le mot de passe"
    });
  }
});

/* CRÉER UNE CONVERSATION */

app.post("/api/conversations", auth, async (req, res) => {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: "Compte désactivé"
      });
    }

    const title =
      cleanText(req.body.title, 100) ||
      "Nouvelle conversation";

    const { data, error } = await supabase
      .from("genius_conversations")
      .insert({
        user_id: user.id,
        title
      })
      .select("*")
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      conversation: safeConversation(data)
    });

  } catch (error) {
    console.error("CREATE CONVERSATION ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de créer la conversation"
    });
  }
});

/* RECHERCHER ET RÉCUPÉRER LES CONVERSATIONS */

app.get("/api/conversations", auth, async (req, res) => {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: "Compte désactivé"
      });
    }

    const search = cleanText(req.query.q, 100);

    let request = supabase
      .from("genius_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", {
        ascending: false
      })
      .limit(100);

    if (search) {
      const safeSearch = search.replace(/[%_]/g, "");
      request = request.ilike("title", `%${safeSearch}%`);
    }

    const { data, error } = await request;

    if (error) throw error;

    return res.json({
      success: true,
      conversations: (data || []).map(safeConversation)
    });

  } catch (error) {
    console.error("GET CONVERSATIONS ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de récupérer les conversations"
    });
  }
});

/* RENOMMER UNE CONVERSATION */

app.put(
  "/api/conversations/:id",
  auth,
  async (req, res) => {
    try {
      const user = await getActiveUser(req.user.id);

      if (!user) {
        return res.status(403).json({
          success: false,
          error: "Compte désactivé"
        });
      }

      const title = cleanText(req.body.title, 100);

      if (!title) {
        return res.status(400).json({
          success: false,
          error: "Le titre est obligatoire"
        });
      }

      const conversation = await getOwnedConversation(
        req.params.id,
        user.id
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation introuvable"
        });
      }

      const { data, error } = await supabase
        .from("genius_conversations")
        .update({
          title,
          updated_at: new Date().toISOString()
        })
        .eq("id", conversation.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: "Conversation renommée",
        conversation: safeConversation(data)
      });

    } catch (error) {
      console.error("RENAME CONVERSATION ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: "Impossible de renommer la conversation"
      });
    }
  }
);

/* RÉCUPÉRER LES MESSAGES */

app.get(
  "/api/conversations/:id/messages",
  auth,
  async (req, res) => {
    try {
      const user = await getActiveUser(req.user.id);

      if (!user) {
        return res.status(403).json({
          success: false,
          error: "Compte désactivé"
        });
      }

      const conversation = await getOwnedConversation(
        req.params.id,
        user.id
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation introuvable"
        });
      }

      const { data, error } = await supabase
        .from("genius_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversation.id)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true
        });

      if (error) throw error;

      return res.json({
        success: true,
        conversation: safeConversation(conversation),
        messages: data || []
      });

    } catch (error) {
      console.error("GET MESSAGES ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: "Impossible de récupérer les messages"
      });
    }
  }
);

/* EXPORTER UNE CONVERSATION */

app.get(
  "/api/conversations/:id/export",
  auth,
  async (req, res) => {
    try {
      const user = await getActiveUser(req.user.id);

      if (!user) {
        return res.status(403).json({
          success: false,
          error: "Compte désactivé"
        });
      }

      const conversation = await getOwnedConversation(
        req.params.id,
        user.id
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation introuvable"
        });
      }

      const { data: messages, error } = await supabase
        .from("genius_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversation.id)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true
        });

      if (error) throw error;

      return res.json({
        success: true,
        application: "GENIUS IA",
        conversation: safeConversation(conversation),
        messages: messages || [],
        exported_at: new Date().toISOString()
      });

    } catch (error) {
      console.error("EXPORT ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: "Impossible d'exporter la conversation"
      });
    }
  }
);

/* SUPPRIMER UNE CONVERSATION */

app.delete(
  "/api/conversations/:id",
  auth,
  async (req, res) => {
    try {
      const user = await getActiveUser(req.user.id);

      if (!user) {
        return res.status(403).json({
          success: false,
          error: "Compte désactivé"
        });
      }

      const conversation = await getOwnedConversation(
        req.params.id,
        user.id
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation introuvable"
        });
      }

      const { error } = await supabase
        .from("genius_conversations")
        .delete()
        .eq("id", conversation.id)
        .eq("user_id", user.id);

      if (error) throw error;

      return res.json({
        success: true,
        message: "Conversation supprimée"
      });

    } catch (error) {
      console.error("DELETE CONVERSATION ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: "Impossible de supprimer la conversation"
      });
    }
  }
);

/* SUPPRIMER TOUTES SES CONVERSATIONS */

app.delete("/api/conversations", auth, async (req, res) => {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
      return res.status(403).json({
        success: false,
        error: "Compte désactivé"
      });
    }

    const { error } = await supabase
      .from("genius_conversations")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Toutes vos conversations ont été supprimées"
    });

  } catch (error) {
    console.error("DELETE ALL ERROR:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de supprimer les conversations"
    });
  }
});

/* CHAT GENIUS IA */

app.post("/api/chat", auth, async (req, res) => {
  try {
    const user = await getActiveUser(req.user.id);

    if (!user) {
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

    const cleanMessages = [];

    for (const message of messages) {
      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
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

    /* CONVERSATION */

    let conversation = null;
    const conversationId = req.body.conversation_id;

    if (conversationId) {
      conversation = await getOwnedConversation(
        conversationId,
        user.id
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: "Conversation introuvable"
        });
      }

    } else {
      const firstMessage = cleanMessages
        .filter(message => message.role === "user")
        .at(-1);

      const title = cleanText(
        firstMessage?.content || "Nouvelle conversation",
        80
      );

      const { data, error } = await supabase
        .from("genius_conversations")
        .insert({
          user_id: user.id,
          title: title || "Nouvelle conversation"
        })
        .select("*")
        .single();

      if (error) throw error;

      conversation = data;
    }

    /* PERSONNALITÉ GENIUS IA V2.5.0 */

    const systemPrompt = `
IDENTITÉ ET MISSION

Tu es GENIUS IA 🤖, une intelligence artificielle conversationnelle
internationale, utile, cultivée, accessible et agréable à utiliser.

Nom officiel : GENIUS IA 🤖
Créateur : MARUCE SOLDADO 🇬🇳
Pays d'origine du projet : Guinée.
Slogan officiel : « Le futur commence avec nous. »

Lorsque quelqu'un demande qui t'a créé, réponds clairement que GENIUS IA
a été créé par MARUCE SOLDADO, en Guinée. N'invente aucun autre créateur,
aucune biographie, aucun diplôme, aucune entreprise ni réussite qui ne
t'a pas été confirmée. Ne prétends pas être une personne humaine.

PERSONNALITÉ ET TON

- Sois naturel, chaleureux, sympathique, respectueux et facile à comprendre.
- Adopte le ton d'un ami ou d'une amie de confiance : détendu, attentif,
  encourageant et parfois drôle lorsque le contexte s'y prête.
- Tu peux utiliser un langage familier léger si l'utilisateur le fait,
  sans devenir irrespectueux ni excessif.
- Montre de l'intérêt pour ce que l'utilisateur raconte et tiens compte
  du contexte de la conversation.
- Ne répète pas inutilement le nom de l'utilisateur.
- Ne commence pas systématiquement par « Bien sûr », « En tant qu'IA »
  ou une longue introduction.
- Ne termine pas chaque réponse par une question. Pose-en une seulement
  lorsqu'elle aide réellement à poursuivre ou clarifier la discussion.
- Ne prétends pas ressentir des émotions humaines ou avoir une vie,
  des expériences personnelles, un corps ou des souvenirs vécus.
  Tu peux néanmoins répondre avec empathie et bienveillance.

CONVERSATION ET DÉBATS

Tu peux discuter de presque tous les sujets : amour, couple, amitié,
famille, société, culture, sport, philosophie, histoire, sciences,
technologie, politique, économie, entrepreneuriat, éducation,
actualité, divertissement et sujets du quotidien.

- Écoute précisément la question et réponds au sujet demandé.
- Participe aux débats avec des arguments structurés et compréhensibles.
- Présente les différents points de vue lorsqu'un sujet est controversé.
- Explique les arguments et contre-arguments sans caricaturer les opinions.
- Ne donne pas automatiquement raison à l'utilisateur : sois honnête,
  même si cela implique de signaler une erreur avec tact.
- Ne contredis pas l'utilisateur juste pour le contredire.
- Distingue les faits vérifiables, les opinions, les hypothèses et
  les interprétations.
- Sur les sujets sensibles, reste calme, équilibré et respectueux.
- Pour la religion et les convictions personnelles, explique sans
  mépriser ni imposer une croyance.
- Pour la politique, analyse les idées et les faits sans inventer
  d'informations ni manipuler l'utilisateur.

ASSISTANCE PERSONNELLE ET PROFESSIONNELLE

Aide l'utilisateur à :
- réfléchir à ses décisions et organiser ses idées ;
- développer ses projets personnels, scolaires et professionnels ;
- apprendre, réviser et comprendre des notions difficiles ;
- rédiger, corriger, reformuler et améliorer des textes ;
- traduire et expliquer plusieurs langues ;
- programmer, déboguer et comprendre du code ;
- préparer des présentations, plans, courriers et documents ;
- trouver des idées, créer des stratégies et résoudre des problèmes ;
- comprendre des informations et des documents fournis dans la discussion.

Pour les tâches complexes, avance étape par étape. Donne des exemples
concrets lorsque cela facilite la compréhension. Si une information
essentielle manque, demande une clarification précise au lieu de deviner.

QUALITÉ ET FIABILITÉ

- Réponds dans la langue utilisée par l'utilisateur, sauf demande contraire.
- Donne d'abord la réponse utile, puis les explications nécessaires.
- Sois clair, précis, cohérent et adapté au niveau de l'utilisateur.
- Évite les répétitions, les introductions creuses et les réponses
  inutilement longues.
- Si l'utilisateur demande un résultat complet, fournis un résultat
  complet plutôt qu'un simple extrait.
- Pour le code, indique clairement les fichiers concernés et préserve
  les fonctionnalités existantes lorsqu'il s'agit d'une modification.
- N'invente jamais de chiffres, citations, sources, événements ou résultats.
- Si tu n'es pas sûr, dis-le et explique ce qui reste à vérifier.
- Ne prétends pas avoir consulté Internet, testé du code, envoyé un fichier,
  modifié un compte ou effectué une action si tu ne l'as pas réellement fait.
- Tes connaissances peuvent ne pas inclure les événements les plus récents.
  Pour une information actuelle que tu ne peux pas vérifier, précise cette
  limite et n'invente pas une réponse.
- Respecte la confidentialité et ne demande pas de mots de passe,
  clés API ou autres secrets.

SÉCURITÉ ET RESPECT

Reste respectueux, même en cas de désaccord ou de provocation.
Ne facilite pas les actes dangereux, illégaux ou malveillants.
Lorsque tu ne peux pas aider sur une demande précise, explique brièvement
pourquoi et propose une solution sûre et utile.

RÈGLE FINALE

Ton objectif est que chaque personne puisse parler librement avec
GENIUS IA, apprendre, réfléchir, progresser et se sentir écoutée,
tout en recevant des réponses honnêtes, utiles et responsables.
Sois un assistant fiable et un compagnon de conversation agréable,
sans jamais prétendre être humain.
`;

    /* APPEL OPENROUTER */

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
            temperature: 0.8,
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

    const reply = result.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== "string") {
      return res.status(502).json({
        success: false,
        error: "L'intelligence artificielle n'a pas retourné de réponse"
      });
    }

    /* ENREGISTREMENT DES MESSAGES */

    const lastUserMessage = cleanMessages
      .filter(message => message.role === "user")
      .at(-1);

    const { error: saveError } = await supabase
      .from("genius_messages")
      .insert([
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: "user",
          content: lastUserMessage.content
        },
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: "assistant",
          content: reply.trim()
        }
      ]);

    if (saveError) throw saveError;

    /* MISE À JOUR DU TITRE */

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (conversation.title === "Nouvelle conversation") {
      updateData.title = cleanText(
        lastUserMessage.content,
        80
      ) || "Nouvelle conversation";
    }

    const { error: updateError } = await supabase
      .from("genius_conversations")
      .update(updateData)
      .eq("id", conversation.id)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    return res.json({
      success: true,
      reply: reply.trim(),
      model: AI_MODEL,
      conversation_id: conversation.id
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

/* ADMIN — TABLEAU DE BORD */

app.get(
  "/api/admin/dashboard",
  auth,
  adminOnly,
  async (req, res) => {
    try {
      const [
        usersResult,
        conversationsResult,
        messagesResult,
        activeUsersResult
      ] = await Promise.all([
        supabase
          .from("genius_users")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("genius_conversations")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("genius_messages")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("genius_users")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
      ]);

      if (
        usersResult.error ||
        conversationsResult.error ||
        messagesResult.error ||
        activeUsersResult.error
      ) {
        throw new Error("Erreur de récupération des statistiques");
      }

      return res.json({
        success: true,
        version: VERSION,
        statistics: {
          total_users: usersResult.count || 0,
          active_users: activeUsersResult.count || 0,
          total_conversations: conversationsResult.count || 0,
          total_messages: messagesResult.count || 0
        }
      });

    } catch (error) {
      console.error("ADMIN DASHBOARD ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: "Impossible de récupérer les statistiques"
      });
    }
  }
);

/* ADMIN — LISTE DES UTILISATEURS */

app.get(
  "/api/admin/users",
  auth,
  adminOnly,
  async (req, res) => {
    try {
      const search = cleanText(req.query.q, 100);

      let request = supabase
        .from("genius_users")
        .select(
          "id, full_name, country, phone, role, is_active, created_at"
        )
        .order("created_at", {
          ascending: false
        })
        .limit(100);

      if (search) {
        const safeSearch = search.replace(/[%_]/g, "");

        request = request.or(
          `full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`
        );
      }

      const { data, error } = await request;

      if (error) throw error;

      return res.json({
        success: true,
        users: data || []
      });

    } catch (error) {
      console.error("ADMIN USERS ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: "Impossible de récupérer les utilisateurs"
      });
    }
  }
);

/* ADMIN — ACTIVER OU DÉSACTIVER UN COMPTE */

app.put(
  "/api/admin/users/:id/status",
  auth,
  adminOnly,
  async (req, res) => {
    try {
      const targetId = req.params.id;
      const is_active = req.body.is_active;

      if (typeof is_active !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "Statut invalide"
        });
      }

      if (targetId === req.admin.id) {
        return res.status(400).json({
          success: false,
          error: "Vous ne pouvez pas désactiver votre propre compte"
        });
      }

      const { data: target, error: targetError } = await supabase
        .from("genius_users")
        .select("id, role")
        .eq("id", targetId)
        .maybeSingle();

      if (targetError) throw targetError;

      if (!target) {
        return res.status(404).json({
          success: false,
          error: "Utilisateur introuvable"
        });
      }

      if (target.role === "admin") {
        return res.status(403).json({
          success: false,
          error: "Modification d'un compte administrateur interdite"
        });
      }

      const { error } = await supabase
        .from("genius_users")
        .update({
          is_active
        })
        .eq("id", targetId);

      if (error) throw error;

      return res.json({
        success: true,
        message: is_active
          ? "Compte réactivé"
          : "Compte désactivé"
      });

    } catch (error) {
      console.error("ADMIN STATUS ERROR:", error.message);

      return res.status(500).json({
        success: false,
        error: "Impossible de modifier le compte"
      });
    }
  }
);

/* ROUTE INCONNUE */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route introuvable",
    path: req.originalUrl
  });
});

/* GESTION DES ERREURS */

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

/* DÉMARRAGE */

app.listen(PORT, () => {
  console.log("-----------------------------------");
  console.log("GENIUS IA V" + VERSION);
  console.log("Créateur : MARUCE SOLDADO 🇬🇳");
  console.log("Serveur opérationnel");
  console.log("Port :", PORT);
  console.log("-----------------------------------");
});

module.exports = app;
