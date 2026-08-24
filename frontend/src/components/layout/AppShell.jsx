/**
 * AppShell — wraps Sidebar + Topbar + content area.
 * All authenticated pages render inside this shell.
 */
import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppShell({ title, description, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      <Topbar 
        title={title} 
        description={description} 
        onMenuClick={() => setIsMobileMenuOpen(true)}
      />
      <main className="content-area">
        <div className="page-enter">
          {children}
        </div>
      </main>
      
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
