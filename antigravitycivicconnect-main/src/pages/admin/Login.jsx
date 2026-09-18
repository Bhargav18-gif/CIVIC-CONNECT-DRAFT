import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import AuthLayout from "../../components/auth/AuthLayout.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If admin is already logged in, redirect to dashboard
    if (localStorage.getItem("cc_admin_user")) {
      navigate("/admin/dashboard");
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Authenticate with Firebase so Firestore rules allow reads
      const normalizedEmail = email.trim().toLowerCase();
      try {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          if (normalizedEmail === "admin@civicconnect.com") {
             try {
                await createUserWithEmailAndPassword(auth, normalizedEmail, password);
             } catch (createErr) {
                if (createErr.code === 'auth/email-already-in-use') {
                   throw new Error("Incorrect password for the admin demo account.");
                }
                throw createErr;
             }
          } else {
             throw err;
          }
        } else {
          throw err;
        }
      }

      // Also set the mock admin tokens so the rest of the admin UI knows we're logged in
      const adminUser = {
        id: "admin-01",
        name: email === "admin@civicconnect.com" ? "Super Admin" : email.split('@')[0],
        email: email,
        role: "admin",
      };
      
      localStorage.setItem("cc_admin_token", "mock-jwt-admin-token-123456");
      localStorage.setItem("cc_admin_user", JSON.stringify(adminUser));
      navigate("/admin/dashboard");
    } catch (err) {
      console.error(err);
      if (err.message && (err.message.includes("Incorrect password") || err.message.includes("Email/Password"))) {
        setError(err.message);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password authentication is disabled. Please enable it in the Firebase Console under Authentication > Sign-in method.");
      } else {
        setError("Invalid admin credentials or Firebase configuration.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Admin Portal"
      subtitle="Sign in with administrative privileges to manage and resolve citizen issues."
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-400/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-5"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs rounded-xl px-4 py-3 mb-6">
          <ShieldAlert size={16} className="flex-shrink-0" />
          <span>Demo admin credentials: <strong className="font-mono">admin@civicconnect.com</strong> / <strong className="font-mono">admin123</strong></span>
        </div>

        <Input
          label="Administrator Email"
          type="email"
          icon={Mail}
          placeholder="admin@civicconnect.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          icon={Lock}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <Button
          type="submit"
          icon={LogIn}
          className="w-full py-3.5 mt-2"
          disabled={loading}
        >
          {loading ? "Authenticating..." : "Admin Access"}
        </Button>
      </form>
    </AuthLayout>
  );
}