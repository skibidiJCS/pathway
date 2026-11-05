import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource-variable/source-serif-4";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PathwayApp } from "./app/PathwayApp";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PathwayApp />
  </StrictMode>,
);
