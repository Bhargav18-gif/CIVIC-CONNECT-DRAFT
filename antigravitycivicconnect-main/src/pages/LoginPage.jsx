import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import AuthLayout from "../components/auth/AuthLayout.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import { useAuth, isDepartmentRole } from "../context/AuthContext.jsx";
import { loginWithGoogle } from "../utils/googleAuth";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [role, setRole] = useState("citizen");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const user = await login(form.email, form.password);

      const effectiveRole = user.role || role;

      if (effectiveRole === "admin") {
        const adminUser = {
          id: user.id || "admin-01",
          name: user.name || (form.email === "admin@civicconnect.com" ? "Super Admin" : form.email.split('@')[0]),
          email: form.email,
          role: "admin",
        };
        localStorage.setItem("cc_admin_token", "mock-jwt-admin-token-123456");
        localStorage.setItem("cc_admin_user", JSON.stringify(adminUser));
        navigate("/admin/dashboard");
      } else if (effectiveRole === "engineer") {
        navigate("/engineer/dashboard");
      } else if (isDepartmentRole(effectiveRole)) {
        const userAllowed = Array.isArray(user.allowedDepartmentIds) && user.allowedDepartmentIds.length > 0
          ? user.allowedDepartmentIds
          : (user.departmentId ? [user.departmentId] : []);

        if (user.departmentId && user.departmentStatus !== "inactive") {
          localStorage.setItem("cc_active_dept", user.departmentId);
          navigate("/department/dashboard");
        } else if (userAllowed.length === 1) {
          localStorage.setItem("cc_active_dept", userAllowed[0]);
          navigate("/department/dashboard");
        } else {
          navigate("/department/select");
        }
      } else {
        navigate(location.state?.from || "/dashboard");
      }
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    const user = await loginWithGoogle();

    if (!user) return;

    if (role === "admin") {
      const adminUser = {
        id: user.uid || "admin-01",
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        role: "admin",
      };
      localStorage.setItem("cc_admin_token", "mock-jwt-admin-token-123456");
      localStorage.setItem("cc_admin_user", JSON.stringify(adminUser));
      navigate("/admin/dashboard");
    } else if (isDepartmentRole(role)) {
      navigate("/department/select");
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track and manage your reports."
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

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Select role
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["citizen", "department", "engineer", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-2xl border px-3 py-2.5 text-xs sm:text-sm font-medium transition-all capitalize ${
                  role === r
                    ? "border-cyan-400 bg-cyan-500/10 text-white shadow-[0_0_15px_-3px_rgba(34,211,238,0.3)]"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {role !== "citizen" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs rounded-xl px-4 py-3 mb-5"
          >
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>
              Demo {role} credentials:{" "}
              <strong className="font-mono">
                {role === "admin"
                  ? "admin@civicconnect.com"
                  : role === "department"
                  ? "roads@civicconnect.com"
                  : "engineer@civicconnect.com"}
              </strong>{" "}
              / <strong className="font-mono">{role === "admin" ? "admin123" : role === "department" ? "roads123" : "engineer123"}</strong>
            </span>
          </motion.div>
        )}

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
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
          rightElement={
            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              className="text-slate-500 hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          }
        />

        <div className="flex justify-end mb-5">
          <Link
            to="/forgot-password"
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          icon={LogIn}
          className="w-full py-3.5"
          disabled={loading}
        >
          {loading ? "Signing in..." : `Sign in as ${role}`}
        </Button>

        {/* Divider */}

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-slate-700"></div>

          <span className="mx-4 text-slate-400 text-sm">
            OR
          </span>

          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        {/* Google Button */}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-all py-3 text-white font-medium"
        >
          <FcGoogle size={25} />
          Continue with Google
        </button>

        <p className="mt-7 text-center text-sm text-slate-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}