import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { db } from './data/data.ts';

if(localStorage.getItem('ra-data-local-storage') == null){
    localStorage.setItem('ra-data-local-storage', JSON.stringify(db));
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);