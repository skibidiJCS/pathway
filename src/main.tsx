import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PathwayApp } from "./app/PathwayApp";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PathwayApp />
  </StrictMode>,
);
