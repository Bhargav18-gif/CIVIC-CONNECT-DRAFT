import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { loginWithGoogle } from "../utils/googleAuth";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", phone: "", address: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  async function handleGoogleLogin() {
    const user = await loginWithGoogle();

    if (!user) return;

    navigate("/dashboard");
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, phone: form.phone, address: form.address });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Could not create account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start reporting issues in your neighborhood.">
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
          label="Full name"
          icon={User}
          name="name"
          placeholder="Jordan Patel"
          value={form.name}
          onChange={handleChange}
          required
        />
        <Input
          label="Email address"
          icon={Mail}
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
        <Input
          label="Password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={handleChange}
          minLength={8}
          required
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-slate-500 hover:text-slate-300"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />

        <div className="mb-5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${
              form.password.length > 8 ? "bg-emerald-500 w-full"
              : form.password.length > 5 ? "bg-amber-400 w-2/3"
              : form.password.length > 0 ? "bg-red-500 w-1/3"
              : "w-0"
            }`}
            layout
          />
        </div>

        <Input
          label="Confirm Password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          name="confirmPassword"
          placeholder="Repeat password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />

        <Input
          label="Phone Number (Optional)"
          name="phone"
          placeholder="+1 234 567 890"
          value={form.phone}
          onChange={handleChange}
        />

        <Input
          label="Address (Optional)"
          name="address"
          placeholder="123 Main St, City"
          value={form.address}
          onChange={handleChange}
        />
        <div className="flex items-center my-6">
  <div className="flex-1 h-px bg-slate-700"></div>

  <span className="mx-4 text-slate-400 text-sm">
    OR
  </span>

  <div className="flex-1 h-px bg-slate-700"></div>
</div>

<button
  type="button"
  onClick={handleGoogleLogin}
  className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-all py-3 text-white font-medium mb-4"
>
  <FcGoogle size={24} />
  Continue with Google
</button>
        <Button type="submit" icon={UserPlus} className="w-full py-3.5 mt-2" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="mt-7 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
