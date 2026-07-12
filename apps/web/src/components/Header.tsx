import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Sun, Moon, MessageCircle, CheckSquare, Timer, Inbox,
  LayoutDashboard, Users, ShieldAlert, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const studentNav = [
  { to: '/app/dashboard', label: 'Home',     icon: LayoutDashboard },
  { to: '/app/chat',      label: 'Talk',     icon: MessageCircle },
  { to: '/app/tasks',     label: 'To-Do',    icon: CheckSquare },
  { to: '/app/focus',     label: 'Focus',    icon: Timer },
  { to: '/app/messages',  label: 'Messages', icon: Inbox },
];

const counselorNav = [
  { to: '/counselor',          label: 'Overview',   icon: LayoutDashboard },
  { to: '/counselor/students', label: 'Students',   icon: Users },
  { to: '/counselor/flags',    label: 'Risk Flags', icon: ShieldAlert },
];

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = (user?.role === 'counselor' || user?.role === 'admin')
    ? counselorNav
    : studentNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-xl shadow-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5 text-lg font-bold tracking-tight text-text">
          <img
            src={`${import.meta.env.BASE_URL}TIO.png`}
            alt="TIO logo"
            className="h-8 w-8 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="hidden text-sm font-bold text-text sm:inline">Talk.ItOut</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to ||
              (item.to !== '/app/dashboard' && item.to !== '/counselor' && location.pathname.startsWith(item.to));
            return (
              <motion.div key={item.to} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-wellness-sage-100 text-wellness-sage-700 border border-wellness-sage-200'
                      : 'text-muted hover:bg-wellness-sage-50 hover:text-wellness-sage-600'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-alt hover:text-text"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="hidden sm:flex sm:flex-col sm:items-end sm:leading-tight">
            <span className="text-xs font-semibold text-text">{user?.name}</span>
            <span className="text-[0.65rem] capitalize text-muted">{user?.role}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-muted transition hover:bg-surface-alt hover:text-text"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </motion.button>

          {/* Mobile menu button */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border bg-surface md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-wellness-sage-100 text-wellness-sage-700 border border-wellness-sage-200'
                        : 'text-muted hover:bg-wellness-sage-50 hover:text-wellness-sage-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
