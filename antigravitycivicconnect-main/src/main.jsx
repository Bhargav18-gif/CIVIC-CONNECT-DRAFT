import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { DepartmentProvider } from "./context/DepartmentContext.jsx";
import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DepartmentProvider>
          <App />
        </DepartmentProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
