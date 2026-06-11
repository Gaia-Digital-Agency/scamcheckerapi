import path from "node:path";
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

// Static test console (plain page) served at /
app.use(express.static(path.join(__dirname, "..", "public")));

app.use((_req, res) => res.status(404).json({ error: "Endpoint not found." }));

app.listen(config.port, config.host, () => {
  console.log(`ScamCheck API listening on ${config.host}:${config.port}`);
  console.log(`Providers configured: ${configuredProviders().join(", ") || "NONE (set keys in .env)"}`);
});
