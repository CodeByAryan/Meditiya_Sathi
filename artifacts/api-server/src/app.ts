import "./load-env.js";
import express, {
  type Express,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttpModule from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// Support both CommonJS and ESM exports
const pinoHttp =
  (pinoHttpModule as any).default ?? pinoHttpModule;

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: Request) {
        return {
          id: (req as any).id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = [
  "https://meditiya-sathi.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
];

if (process.env.PUBLIC_APP_URL) {
  allowedOrigins.push(process.env.PUBLIC_APP_URL.replace(/\/+$/, ""));
}
if (process.env.VITE_PUBLIC_APP_URL) {
  allowedOrigins.push(process.env.VITE_PUBLIC_APP_URL.replace(/\/+$/, ""));
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ""));
}
if (process.env.WEB_APP_URL) {
  allowedOrigins.push(process.env.WEB_APP_URL.replace(/\/+$/, ""));
}

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalized) || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // In development mode, allow any localhost port
      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

// HTTP Security Headers (Step 13)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api", router);

// Forward public PDF requests to API route
app.get(["/tshirt-pdf/:collectionId"], (req, res) => {
  const rawId = req.params.collectionId;
  const collectionId = Array.isArray(rawId) ? rawId[0] : rawId;
  res.redirect(`/api/tshirt-pdf/${encodeURIComponent(collectionId || "")}`);
});

// Redirect browser GETs for scanned QR / collection URLs to the frontend web app
app.get(["/tshirt-distribution/:tshirtId", "/tshirt-collection-cash/:tshirtId", "/tshirt-collection/:tshirtId"], (req, res) => {
  const frontendBaseUrl =
    process.env.PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    process.env.VITE_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    process.env.WEB_APP_URL?.replace(/\/+$/, "") ||
    process.env.FRONTEND_URL?.replace(/\/+$/, "") ||
    "https://meditiya-sathi.vercel.app";
  const rawId = req.params.tshirtId;
  const tshirtId = Array.isArray(rawId) ? rawId[0] : rawId;
  res.redirect(`${frontendBaseUrl}/tshirt-collection-cash/${encodeURIComponent(tshirtId || "")}`);
});

app.get(["/tshirt-distribution", "/tshirt-collection-cash", "/tshirt-collection"], (req, res) => {
  const frontendBaseUrl =
    process.env.PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    process.env.VITE_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    process.env.WEB_APP_URL?.replace(/\/+$/, "") ||
    process.env.FRONTEND_URL?.replace(/\/+$/, "") ||
    "https://meditiya-sathi.vercel.app";
  res.redirect(`${frontendBaseUrl}/tshirt-collection-cash`);
});

// Centralized Safe Error Handler (Step 17)
app.use((err: any, req: Request, res: Response, _next: express.NextFunction) => {
  if (err?.message === "Not allowed by CORS") {
    res.status(403).json({ error: "CORS origin forbidden" });
    return;
  }
  logger.error({ err, path: req.path, method: req.method }, "Unhandled server error");
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: "Internal server error" });
});

export default app;
