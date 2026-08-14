/**
 * AppShell — wraps Sidebar + Topbar + content area.
 * All authenticated pages render inside this shell.
 */
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ title, description, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Topbar title={title} description={description} />
      <main className="content-area">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
