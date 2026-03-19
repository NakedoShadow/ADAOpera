import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { useOperaStore } from "./stores/opera-store";
import * as deepskillHandler from "./engines/deepskill-handler";

// Expose internals for A/B test harness (Playwright)
(window as any).__OPERA_STORE__ = useOperaStore;
(window as any).__DEEPSKILL_HANDLER__ = deepskillHandler;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
