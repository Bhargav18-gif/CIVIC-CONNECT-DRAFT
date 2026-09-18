import { Link } from "react-router-dom";
import { Twitter, Linkedin, Github, Mail, Phone, MapPin } from "lucide-react";
import Logo from "../ui/Logo.jsx";

const QUICK_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Departments", href: "#departments" },
];

const RESOURCES = [
  { label: "Report an Issue", to: "/report" },
  { label: "Track a Complaint", to: "/track" },
  { label: "Login", to: "/login" },
  { label: "Create Account", to: "/register" },
];

export default function Footer() {
  return (
    <footer id="contact" className="relative px-6 pt-20 pb-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 pb-14">
          <div>
            <Logo size={32} />
            <p className="mt-5 text-sm text-slate-400 leading-relaxed max-w-xs">
              Smart public issues reporting for cities that listen. Report,
              track, and resolve civic issues in one place.
            </p>
            <div className="flex gap-3 mt-6">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-full glass flex items-center justify-center text-slate-400 hover:text-cyan-300 transition-colors"
                  aria-label="Social link"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm mb-5 text-slate-200">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm mb-5 text-slate-200">
              Resources
            </h4>
            <ul className="space-y-3">
              {RESOURCES.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div id="about">
            <h4 className="font-display font-semibold text-sm mb-5 text-slate-200">
              Contact
            </h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="text-cyan-400" /> support@civicconnect.app
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="text-cyan-400" /> +91 22 4000 1234
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin size={15} className="text-cyan-400" /> Municipal Plaza, Mumbai
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} CivicConnect. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
