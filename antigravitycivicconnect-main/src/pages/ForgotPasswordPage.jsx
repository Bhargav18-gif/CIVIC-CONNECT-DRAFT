import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "We couldn't find that email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send a reset link."
    >
      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center py-6"
        >
          <div className="w-14 h-14 rounded-full bg-cyan-400/10 flex items-center justify-center mb-5">
            <CheckCircle2 size={26} className="text-cyan-400" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-2">Check your inbox</h3>
          <p className="text-sm text-slate-400 max-w-xs">
            If an account exists for <span className="text-slate-200">{email}</span>, a
            reset link is on its way.
          </p>
          <Link to="/login" className="mt-7 text-sm text-cyan-400 hover:text-cyan-300 font-medium">
            Back to login
          </Link>
        </motion.div>
      ) : (
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

          <Input
            label="Email address"
            icon={Mail}
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" icon={Send} className="w-full py-3.5" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>

          <p className="mt-7 text-center text-sm text-slate-400">
            Remembered it?{" "}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
