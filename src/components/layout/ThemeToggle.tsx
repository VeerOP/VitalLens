import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { triggerHaptic } from '../../lib/utils/haptics';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('vitallens_theme');
    if (saved) return saved === 'dark';
    return false; // Clinical light appearance default
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('vitallens_theme', 'dark');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#0F1419');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('vitallens_theme', 'light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#F7F9FA');
    }
  }, [isDark]);

  const toggleTheme = () => {
    triggerHaptic('light');
    setIsDark(!isDark);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-[var(--bg-surface-subtle)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer active:scale-95"
      title={isDark ? 'Switch to Clinical Light' : 'Switch to Charcoal Dark'}
      aria-label="Toggle Appearance"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 stroke-[2] text-amber-400" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 stroke-[2] text-[var(--text-secondary)]" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
};
