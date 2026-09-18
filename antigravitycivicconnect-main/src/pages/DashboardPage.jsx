import { useState } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar.jsx";
import StatCards from "../components/dashboard/StatCards.jsx";
import ActivityChart from "../components/dashboard/ActivityChart.jsx";
import CategoryDonut from "../components/dashboard/CategoryDonut.jsx";
import RecentComplaints from "../components/dashboard/RecentComplaints.jsx";
import UserReports from "../components/dashboard/UserReports.jsx";
import UserNotifications from "../components/dashboard/UserNotifications.jsx";
import Button from "../components/ui/Button.jsx";
import DepartmentDashboard from "./department/Dashboard.jsx";
import EngineerDashboard from "./engineer/Dashboard.jsx";

export default function DashboardPage() {
  const { user } = useAuth();
  const [active, setActive] = useState("Overview");

  // Redirect admins to their specific dashboard route
  if (user?.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Route to department dashboard
  if (user?.role === "department") {
    return <DepartmentDashboard />;
  }

  // Route to engineer dashboard
  if (user?.role === "engineer") {
    return <EngineerDashboard />;
  }

  // Default to Citizen Dashboard
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex"
    >
      <Sidebar active={active} setActive={setActive} />

      <main className="flex-1 px-6 sm:px-10 py-10 max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl tracking-tight">
              Welcome back, {user?.name?.split(" ")[0] || "there"}
            </h1>
            <p className="text-slate-400 mt-1.5">
              Here's what's happening with your reports.
            </p>
          </div>

          <Button to="/report" icon={FileText}>
            Report Issue
          </Button>
        </div>

        {/* OVERVIEW */}
        {active === "Overview" && (
          <div className="space-y-6">
            <StatCards />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityChart />
              </div>
              <CategoryDonut />
            </div>
            <RecentComplaints />
          </div>
        )}

        {/* MY REPORTS */}
        {active === "My Reports" && (
          <UserReports userEmail={user?.email} />
        )}

        {/* NOTIFICATIONS */}
        {active === "Notifications" && (
          <UserNotifications userEmail={user?.email} />
        )}

        {/* SETTINGS */}
        {active === "Settings" && (
          <div className="glass rounded-3xl p-8">
            <h2 className="text-3xl font-bold mb-6">Settings</h2>
            <div className="space-y-4">
              <p>
                <strong>Name:</strong> {user?.name}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                More account settings coming soon...
              </p>
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
}