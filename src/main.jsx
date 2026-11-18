import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./theme/ThemePreferences.jsx";
import "./styles/styles.css";
import "./styles/ui.css";
import "./catalog/catalog.css";
import "./theme/darkPalette.css";
import "./theme/theme.css";
import { LanguageProvider } from "./shared/i18n.jsx";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider><App /></ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
