import { Router } from "express";
import { configuredProviders } from "../config";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "scamcheck-api",
    version: "1.0.0",
    providers: configuredProviders(),
  });
});
