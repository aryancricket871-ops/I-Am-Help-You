import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";

// the Android app uses HashRouter so pages open correctly from inside the app
const Router: any = (import.meta as any).env?.VITE_APP ? HashRouter : BrowserRouter;
import App from "./App";
import { AuthProvider } from "./auth";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>
);
