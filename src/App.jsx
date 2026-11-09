import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { ToastProvider } from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Students, { StudentProfileModal } from "./pages/Students";
import Teachers from "./pages/Teachers";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import Exams from "./pages/Exams";
import Settings from "./pages/Settings";
import { STUDENTS } from "./data/mock";
import { fetchStudentsFromAPI } from "./services/api";

function App() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [students, setStudents] = useState(STUDENTS);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [collectFeeOpen, setCollectFeeOpen] = useState(false);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const liveStudents = await fetchStudentsFromAPI();
        if (Array.isArray(liveStudents) && liveStudents.length > 0) {
          setStudents(liveStudents);
          setIsBackendConnected(true);
          console.log("Connected to MongoDB via Express API:", liveStudents.length, "students loaded");
        }
      } catch (err) {
        console.info("Using mock data (Start the Express server on port 5000 to connect MongoDB):", err.message);
      }
    }
    loadInitialData();
  }, []);

  const navigate = (id) => {
    setActive(id);
    setMobileOpen(false);
    setQuery("");
  };

  const newAdmission = () => {
    setActive("students");
    setAddStudentOpen(true);
  };

  const collectFee = () => {
    setActive("fees");
    setCollectFeeOpen(true);
  };

  const markAttendance = () => setActive("attendance");

  const render = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard students={students} onNavigate={navigate} onNewAdmission={newAdmission} onMarkAttendance={markAttendance} onCollectFee={collectFee} />;
      case "students":
        return <Students students={students} setStudents={setStudents} globalQuery={query} openAdd={addStudentOpen} onCloseAdd={() => setAddStudentOpen(false)} onView={setViewStudent} />;
      case "teachers":
        return <Teachers globalQuery={query} />;
      case "attendance":
        return <Attendance students={students} />;
      case "fees":
        return <Fees students={students} setStudents={setStudents} openCollect={collectFeeOpen} onCloseCollect={() => setCollectFeeOpen(false)} />;
      case "exams":
        return <Exams students={students} />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard students={students} onNavigate={navigate} onNewAdmission={newAdmission} onMarkAttendance={markAttendance} onCollectFee={collectFee} />;
    }
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar
          active={active}
          onNavigate={navigate}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar
            onOpenMobile={() => setMobileOpen(true)}
            onNewAdmission={newAdmission}
            query={query}
            onQueryChange={setQuery}
            onNavigate={navigate}
          />
          <main className="flex-1 px-4 py-6 lg:px-8">{render()}</main>
        </div>

        <StudentProfileModal student={viewStudent} onClose={() => setViewStudent(null)} />
      </div>
    </ToastProvider>
  );
}

export default App;
