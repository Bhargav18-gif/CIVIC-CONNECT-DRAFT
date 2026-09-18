import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, FileText } from "lucide-react";
import Logo from "../ui/Logo.jsx";
import Button from "../ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Departments", href: "#departments" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div
          className={`glass rounded-full px-5 py-3 flex items-center justify-between transition-shadow duration-300 ${
            scrolled ? "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]" : ""
          }`}
        >
          <Link to="/">
            <Logo size={32} />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-slate-300 hover:text-white transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 w-0 h-px bg-gradient-to-r from-cyan-400 to-violet-400 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (user.role === "admin") navigate("/admin/dashboard");
                    else if (user.role === "department" || user.role === "department_supervisor") navigate("/department/dashboard");
                    else if (user.role === "engineer") navigate("/engineer/dashboard");
                    else navigate("/dashboard");
                  }}
                >
                  {user.role === "engineer"
                    ? "Engineer Portal"
                    : user.role === "department" || user.role === "department_supervisor"
                    ? "Department Hub"
                    : user.role === "admin"
                    ? "Admin Portal"
                    : "Dashboard"}
                </Button>
                <Button variant="secondary" onClick={logout}>
                  Log out
                </Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => navigate("/login")}>
                Login
              </Button>
            )}
            <Button to="/report" icon={FileText}>
              Report Issue
            </Button>
          </div>

          <button
            className="lg:hidden text-white p-1"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden glass rounded-3xl mt-3 p-6 flex flex-col gap-4 overflow-hidden"
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-slate-200 text-sm font-medium"
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
                {user ? (
                  <>
                    <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                      Dashboard
                    </Button>
                    <Button variant="secondary" onClick={logout}>
                      Log out
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => navigate("/login")}>
                    Login
                  </Button>
                )}
                <Button to="/report" icon={FileText}>
                  Report Issue
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
