const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

const PORT = Number(process.env.PORT || 8080);
const API_KEY = process.env.FEEDBACK_API_KEY || "";
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "licenses.json");

const ALLOWED_DAYS = new Set([1, 3, 7, 30]);
let licenses = {};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      licenses = JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "{}");
    }
  } catch (err) {
    console.error("Gagal membaca database:", err.message);
    licenses = {};
  }
}

function saveData() {
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(licenses, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function cleanKey(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function validApiKey(req) {
  if (!API_KEY) return true;
  const supplied = req.get("x-api-key") || req.body?.apiKey || "";
  return supplied === API_KEY;
}

function auth(req, res, next) {
  if (!validApiKey(req)) {
    return res.status(401).json({
      ok: false,
      error: "UNAUTHORIZED"
    });
  }
  next();
}

function makeKey() {
  const random = crypto.randomBytes(9).toString("hex").toUpperCase();
  return `FLUX-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(8, 12)}`;
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function publicLicense(record) {
  const current = now();
  const active = Boolean(record.activatedAt && record.expireTime > current && !record.revoked);

  return {
    key: record.key,
    active,
    revoked: Boolean(record.revoked),
    activatedAt: record.activatedAt || null,
    expireTime: record.expireTime || null,
    durationDays: record.durationDays || null,
    remainingSeconds: active ? record.expireTime - current : 0
  };
}

loadData();

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "FLUXMOD License Server",
    status: "online"
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "FLUXMOD License Server",
    status: "online",
    licenseCount: Object.keys(licenses).length
  });
});

// Admin: buat key baru.
// Body: { "days": 7 }
app.post("/admin/create", auth, (req, res) => {
  const days = Number(req.body?.days);

  if (!ALLOWED_DAYS.has(days)) {
    return res.status(400).json({
      ok: false,
      error: "INVALID_DURATION",
      allowedDays: [1, 3, 7, 30]
    });
  }

  let key;
  do {
    key = makeKey();
  } while (licenses[key]);

  licenses[key] = {
    key,
    durationDays: days,
    activatedAt: null,
    expireTime: null,
    revoked: false,
    createdAt: now()
  };

  saveData();

  res.json({
    ok: true,
    message: "LICENSE_CREATED",
    license: publicLicense(licenses[key])
  });
});

// Client: aktivasi key.
// Body: { "key": "FLUX-XXXX-XXXX-XXXX" }
app.post("/activate", (req, res) => {
  const key = cleanKey(req.body?.key);

  if (!key) {
    return res.status(400).json({
      ok: false,
      error: "KEY_REQUIRED"
    });
  }

  const record = licenses[key];

  if (!record) {
    return res.status(404).json({
      ok: false,
      error: "KEY_NOT_FOUND"
    });
  }

  if (record.revoked) {
    return res.status(403).json({
      ok: false,
      error: "KEY_REVOKED"
    });
  }

  if (record.activatedAt && record.expireTime > now()) {
    return res.json({
      ok: true,
      message: "ALREADY_ACTIVE",
      license: publicLicense(record)
    });
  }

  if (record.activatedAt && record.expireTime <= now()) {
    return res.status(410).json({
      ok: false,
      error: "KEY_EXPIRED"
    });
  }

  record.activatedAt = now();
  record.expireTime = record.activatedAt + (record.durationDays * 86400);

  saveData();

  res.json({
    ok: true,
    message: "ACTIVATED",
    license: publicLicense(record)
  });
});

// Client: cek status.
// Body: { "key": "FLUX-XXXX-XXXX-XXXX" }
app.post("/check", (req, res) => {
  const key = cleanKey(req.body?.key);

  if (!key) {
    return res.status(400).json({
      ok: false,
      error: "KEY_REQUIRED"
    });
  }

  const record = licenses[key];

  if (!record) {
    return res.status(404).json({
      ok: false,
      error: "KEY_NOT_FOUND"
    });
  }

  const license = publicLicense(record);

  res.json({
    ok: license.active,
    message: license.active ? "ACTIVE" : "EXPIRED_OR_INACTIVE",
    license
  });
});

// Admin: reset/revoke key.
// Body: { "key": "FLUX-XXXX-XXXX-XXXX" }
app.post("/reset", auth, (req, res) => {
  const key = cleanKey(req.body?.key);
  const record = licenses[key];

  if (!record) {
    return res.status(404).json({
      ok: false,
      error: "KEY_NOT_FOUND"
    });
  }

  record.activatedAt = null;
  record.expireTime = null;
  record.revoked = false;

  saveData();

  res.json({
    ok: true,
    message: "KEY_RESET",
    license: publicLicense(record)
  });
});

// Admin: revoke key permanen.
// Body: { "key": "FLUX-XXXX-XXXX-XXXX" }
app.post("/revoke", auth, (req, res) => {
  const key = cleanKey(req.body?.key);
  const record = licenses[key];

  if (!record) {
    return res.status(404).json({
      ok: false,
      error: "KEY_NOT_FOUND"
    });
  }

  record.revoked = true;
  saveData();

  res.json({
    ok: true,
    message: "KEY_REVOKED",
    license: publicLicense(record)
  });
});

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: "NOT_FOUND"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FLUXMOD License Server online on port ${PORT}`);
});
