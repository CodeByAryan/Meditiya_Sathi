import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import ScrollToTop from "./components/ScrollToTop";

import { setBaseUrl } from "@workspace/api-client-react";

// Backend URL
setBaseUrl(
  import.meta.env.VITE_API_URL || "https://meditiya-sathi.onrender.com"
);

createRoot(document.getElementById("root")!).render(
  <>
    <ScrollToTop />
    <App />
  </>
);