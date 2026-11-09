import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider, DisplayPreferences } from "./ThemePreferences.jsx";
import "./styles.css";
import "./ui.css";
import "./catalog.css";
import "./darkPalette.css";
import "./theme.css";
import { LanguageProvider } from "./i18n.jsx";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider><App /><DisplayPreferences /></ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
