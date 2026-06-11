import type { Request, Response, NextFunction } from "express";
import { config } from "../config";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = (req.headers["x-api-key"] as string) || (req.query.api_key as string);
  if (!key || !config.scamcheckApiKeys.includes(key)) {
    return res.status(401).json({ error: "Unauthorised. Valid X-API-Key header required." });
  }
  next();
}
