import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../firebase.js";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);

    try {
      if (!token) {
        throw new Error("Missing reset token.");
      }

      await confirmPasswordReset(auth, token, password);
      alert("Password reset successfully. You can now log in.");
      navigate("/login");
    } catch (err) {
      alert(err.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "430px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "35px",
          boxShadow: "0 10px 30px rgba(0,0,0,.25)",
        }}
      >
        <h2
          style={{
            color: "#111827",
            marginBottom: "25px",
            textAlign: "center",
          }}
        >
          Reset Password
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{
              width: "100%",
              padding: "14px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              marginBottom: "20px",
              color: "#111827",
              fontSize: "16px",
              background: "#fff",
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}