import { motion } from "framer-motion";
import Button from "../components/ui/Button.jsx";
import { Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="font-display font-bold text-7xl text-gradient mb-4">404</h1>
        <p className="text-slate-400 mb-8">This page doesn't exist — or it's been resolved already.</p>
        <Button to="/" icon={Home}>
          Back home
        </Button>
      </motion.div>
    </div>
  );
}
