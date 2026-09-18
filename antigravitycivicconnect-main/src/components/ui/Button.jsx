import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const VARIANTS = {
  primary:
    "bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-[0_0_24px_-4px_rgba(34,211,238,0.6)]",
  secondary: "glass text-white hover:bg-white/10",
  ghost: "text-slate-300 hover:text-white",
};

/**
 * Shared button used across the app. Renders as a <Link> when `to` is
 * provided, otherwise a native <button>.
 */
export default function Button({
  children,
  to,
  variant = "primary",
  icon: Icon,
  iconPosition = "right",
  className = "",
  type = "button",
  onClick,
  disabled = false,
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const classes = `${base} ${VARIANTS[variant]} ${className}`;

  const content = (
    <>
      {Icon && iconPosition === "left" && <Icon size={17} />}
      {children}
      {Icon && iconPosition === "right" && <Icon size={17} />}
    </>
  );

  const motionProps = {
    whileHover: disabled ? {} : { scale: 1.035, y: -1 },
    whileTap: disabled ? {} : { scale: 0.97 },
    transition: { type: "spring", stiffness: 400, damping: 18 },
  };

  if (to) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link to={to} className={classes}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      {...motionProps}
    >
      {content}
    </motion.button>
  );
}
