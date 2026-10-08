import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { ToastProvider } from "./components/ui/toast";
import { toastManager } from "./lib/toast";
import { TooltipProvider } from "./components/ui/tooltip";
import { TemaProvider } from "./tema";
import "./globais.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <BrowserRouter>
      <TemaProvider>
        <TooltipProvider delay={350} timeout={400}>
          <ToastProvider closeLabel="Fechar" toastManager={toastManager}>
            <App />
          </ToastProvider>
        </TooltipProvider>
      </TemaProvider>
    </BrowserRouter>
  </StrictMode>,
);
