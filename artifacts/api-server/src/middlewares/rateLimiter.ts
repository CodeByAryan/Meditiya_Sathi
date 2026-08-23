import type { Request, Response, NextFunction, RequestHandler } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const {
    windowMs,
    max,
    message = "Too many requests. Please try again later.",
    statusCode = 429,
    keyGenerator = (req: Request) => {
      const forwarded = req.headers["x-forwarded-for"];
      if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
      }
      return req.ip || req.socket.remoteAddress || "unknown";
    },
  } = options;

  const hits = new Map<string, ClientRecord>();

  // Periodically clean up expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 60000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = hits.get(key);

    if (!record || now > record.resetTime) {
      hits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      next();
      return;
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.status(statusCode).json({ error: message });
      return;
    }

    record.count += 1;
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    next();
  };
}

// Pre-configured rate limiters
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: "Too many login attempts. Please try again after 15 minutes.",
});

export const publicFormRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests
  message: "Too many submission attempts. Please try again later.",
});

export const pdfRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests
  message: "Too many PDF download requests. Please slow down.",
});

export const votingRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 attempts
  message: "Too many voting requests. Please try again later.",
});
