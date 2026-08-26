import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Mama Ba React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "sans-serif", textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", backgroundColor: "#fdf9f3", color: "#84250f" }}>
          <h2 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 12 }}>Mama Ba Companion</h2>
          <p style={{ fontSize: 14, color: "#57423d", marginBottom: 20 }}>
            An unexpected error occurred. Tap below to reload the app.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/app";
            }}
            style={{ padding: "12px 24px", backgroundColor: "#84250f", color: "#fff", border: "none", borderRadius: 24, fontWeight: "bold", fontSize: 14, cursor: "pointer" }}
          >
            Reload Mama Ba App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);