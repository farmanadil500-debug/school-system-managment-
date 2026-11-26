import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.body.password",
    "req.body.passwordHash",
  ],
});

export const httpLogger = pinoHttp({
  logger,
  autoLogging: env.NODE_ENV !== "test",
});
