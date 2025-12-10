import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { CryptoProvider } from "./crypto/CryptoProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CryptoProvider>
      <App />
    </CryptoProvider>
  </StrictMode>
);
