// main.jsx
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { supabase } from "./lib/supabase";

function ProtectedApp() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [storedPassword, setStoredPassword] = useState("");

  useEffect(() => {
    async function fetchPassword() {
      const { data, error } = await supabase
        .from("site_password")
        .select("password")
        .single();

      if (error) console.error(error);
      if (data) setStoredPassword(data.password);
      setLoading(false);
    }

    fetchPassword();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === storedPassword) {
      const expiryTime = Date.now() + 10 * 60 * 1000; // 10 دقايق بالمللي ثانية
      sessionStorage.setItem("authorized", "true");
      sessionStorage.setItem("expiryTime", expiryTime.toString());
      setIsAuthorized(true);
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  };

  useEffect(() => {
    const authorized = sessionStorage.getItem("authorized");
    const expiryTime = sessionStorage.getItem("expiryTime");

    if (
      authorized === "true" &&
      expiryTime &&
      Date.now() < Number(expiryTime)
    ) {
      setIsAuthorized(true);
    } else {
      sessionStorage.removeItem("authorized");
      sessionStorage.removeItem("expiryTime");
    }
  }, []);

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        جار التحميل...
      </div>
    );

  if (!isAuthorized) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f7f7f7",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            background: "white",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            width: "300px",
            textAlign: "center",
          }}
        >
          <h2>🔒 حماية البرنامج</h2>
          <input
            type="password"
            placeholder="أدخل كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
          <button
            type="submit"
            style={{
              marginTop: "15px",
              width: "100%",
              padding: "10px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            دخول
          </button>
          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        </form>
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ProtectedApp />
  </StrictMode>
);
