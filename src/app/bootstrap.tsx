import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initPwa } from "@/features/pwa";
import { App } from "./App";
import "./styles.css";

export function bootstrap() {
  initPwa();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
