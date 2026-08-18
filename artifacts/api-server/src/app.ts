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

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    process.env.WEB_APP_URL?.replace(/\/+$/, "") ||
    process.env.FRONTEND_URL?.replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "production" ? "https://meditiya-sathi.vercel.app" : "http://localhost:5173");
  const rawId = req.params.tshirtId;
  const tshirtId = Array.isArray(rawId) ? rawId[0] : rawId;
  res.redirect(`${frontendBaseUrl}/tshirt-distribution/${encodeURIComponent(tshirtId || "")}`);
});

app.get(["/tshirt-distribution", "/tshirt-collection-cash", "/tshirt-collection"], (req, res) => {
  const frontendBaseUrl =
    process.env.WEB_APP_URL?.replace(/\/+$/, "") ||
    process.env.FRONTEND_URL?.replace(/\/+$/, "") ||
    (process.env.NODE_ENV === "production" ? "https://meditiya-sathi.vercel.app" : "http://localhost:5173");
  res.redirect(`${frontendBaseUrl}/tshirt-distribution`);
});

export default app;
