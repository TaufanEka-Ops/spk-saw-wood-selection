import { isProduction } from "../config/env.js";

/** 404 for unmatched routes — the original returned Express' HTML default. */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: "not_found", message: `No route for ${req.method} ${req.originalUrl}` });
}

/** Thrown by route handlers to produce a deterministic status code. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Terminal error handler.
 *
 * The original controllers caught every exception and answered with
 * `console.log(error.message)` and no `res.*` call at all: the request hung
 * until the client timed out, and the operator saw a log line. That is the
 * classic silent failure, and it is why `catch` blocks below always respond.
 */
export function errorHandler(error, req, res, _next) {
  const status = error.status ?? 500;
  const payload = {
    error: status >= 500 ? "internal_error" : "request_error",
    message: status >= 500 && isProduction() ? "Unexpected server error" : error.message,
  };
  if (error.details) payload.details = error.details;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, error);

  res.status(status).json(payload);
}

/** Wrap an async handler so a rejected promise reaches errorHandler. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
