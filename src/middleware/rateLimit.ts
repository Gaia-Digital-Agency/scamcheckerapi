import rateLimit from "express-rate-limit";
import { config } from "../config";

export const limiter = rateLimit({
  windowMs: config.rateLimitWindowMin * 60 * 1000,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait and try again." },
});
