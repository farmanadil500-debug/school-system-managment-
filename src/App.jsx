import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { ToastProvider } from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Portal from "./pages/Portal";
import Students, { StudentProfileModal } from "./pages/Students";
import Teachers from "./pages/Teachers";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import Exams from "./pages/Exams";
import Timetable from "./pages/Timetable";
import Notices from "./pages/Notices";
import Reports from "./pages/Reports";
import UsersPage from "./pages/Users";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ForcePasswordChangeModal from "./components/ForcePasswordChangeModal";
import RequireRole from "./components/RequireRole";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { ThemeProvider } from "./lib/theme-context";
import { ROLES } from "./lib/permissions";
import { STUDENTS } from "./data/mock";
import { fetchStudentsFromAPI } from "./services/api";
import { School, Loader2 } from "lucide-react";

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [students, setStudents] = useState(STUDENTS);
  const [_isBackendConnected, setIsBackendConnected] = useState(false);
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
        }
      } catch (_err) {
        // Fallback to initial mock state if server is offline
      }
    }
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md">
          <School className="h-8 w-8" />
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          <span>Verifying secure session…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

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

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return (
          <Dashboard
            students={students}
            onNavigate={navigate}
            onNewAdmission={newAdmission}
            onMarkAttendance={markAttendance}
            onCollectFee={collectFee}
          />
        );
      case "portal":
        return (
          <RequireRole roles={[ROLES.PARENT, ROLES.STUDENT, ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
            <Portal />
          </RequireRole>
        );
      case "students":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER]}>
            <Students
              globalQuery={query}
              openAdd={addStudentOpen}
              onCloseAdd={() => setAddStudentOpen(false)}
              onView={setViewStudent}
            />
          </RequireRole>
        );
      case "teachers":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
            <Teachers globalQuery={query} />
          </RequireRole>
        );
      case "attendance":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT]}>
            <Attendance students={students} />
          </RequireRole>
        );
      case "fees":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.STUDENT, ROLES.PARENT]}>
            <Fees
              students={students}
              setStudents={setStudents}
              openCollect={collectFeeOpen}
              onCloseCollect={() => setCollectFeeOpen(false)}
            />
          </RequireRole>
        );
      case "exams":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT]}>
            <Exams students={students} />
          </RequireRole>
        );
      case "timetable":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT]}>
            <Timetable />
          </RequireRole>
        );
      case "reports":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.ACCOUNTANT]}>
            <Reports />
          </RequireRole>
        );
      case "notices":
        return (
          <RequireRole roles={Object.values(ROLES)}>
            <Notices />
          </RequireRole>
        );
      case "users":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
            <UsersPage />
          </RequireRole>
        );
      case "settings":
        return (
          <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.ACCOUNTANT]}>
            <Settings />
          </RequireRole>
        );
      default:
        return (
          <Dashboard
            students={students}
            onNavigate={navigate}
            onNewAdmission={newAdmission}
            onMarkAttendance={markAttendance}
            onCollectFee={collectFee}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        active={active}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          onOpenMobile={() => setMobileOpen(true)}
          onNewAdmission={newAdmission}
          query={query}
          onQueryChange={setQuery}
          onNavigate={navigate}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">{renderContent()}</main>
      </div>

      <StudentProfileModal student={viewStudent} onClose={() => setViewStudent(null)} />
      <ForcePasswordChangeModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
