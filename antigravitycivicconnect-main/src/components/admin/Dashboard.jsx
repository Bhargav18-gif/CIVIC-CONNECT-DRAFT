import Sidebar from "../../components/admin/Sidebar";
import DashboardCards from "../../components/admin/DashboardCards";
import DepartmentProgress from "./DepartmentProgress";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950">

      <Sidebar />

      <main className="ml-64 p-10">

        <h1 className="text-4xl font-bold text-white mb-10">
          Admin Dashboard
        </h1>

        <DashboardCards />

        <DepartmentProgress />

      </main>

    </div>
  );
}