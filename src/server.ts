import path from "node:path";
import fs from "node:fs";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config, configuredProviders } from "./config";
import { limiter } from "./middleware/rateLimit";
import { healthRouter } from "./routes/health";
import { checkRouter } from "./routes/check";

const app = express();

app.use(helmet({ contentSecurityPolicy: false })); // allow inline test page
app.use(express.json());

// CORS allowlist (server-to-server callers send no Origin and are allowed).
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
  })
);

app.use("/api/", limiter);

app.use(healthRouter);
app.use(checkRouter);

// Test console served at / with the API key pre-injected (page is public by choice).
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const indexHtml = fs
  .readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf8")
  .replace("%%SCAMCHECK_KEY%%", config.scamcheckApiKey);
app.get("/", (_req, res) => res.type("html").send(indexHtml));

// Other static assets (if any)
app.use(express.static(PUBLIC_DIR));

app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));

app.listen(config.port, config.host, () => {
  console.log(`ScamCheck API listening on ${config.host}:${config.port}`);
  console.log(`Providers configured: ${configuredProviders().join(", ") || "NONE (set keys in .env)"}`);
});
