import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Viewer from "./Viewer";
import "./index.css";

const isViewer = window.location.pathname.startsWith("/viewer");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isViewer ? <Viewer /> : <App />}
  </React.StrictMode>
);