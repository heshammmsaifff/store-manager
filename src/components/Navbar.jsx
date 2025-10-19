"use client";
import React, { useState } from "react";
import { Menu, X, Lock, Unlock } from "lucide-react";

/**
 * Navbar component
 * Props:
 * - pages: array of { key, label, protected? }
 * - activePage: string key of current page
 * - onPageSelect: function(page) => void   <-- called when user clicks a page
 * - onHomeClick: function() => void       <-- called when clicking the title/logo
 * - isUnlocked: boolean                   <-- just to show lock/unlock icon (no logic)
 */
export default function Navbar({
  pages = [],
  activePage = "",
  onPageSelect = () => {},
  onHomeClick = () => {},
  isUnlocked = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-green-700 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Home */}
        <h1
          className="text-lg font-bold cursor-pointer select-none"
          onClick={() => {
            onHomeClick();
            setMenuOpen(false);
          }}
        >
          إدارة المخزن و المحمصة
        </h1>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-3">
          {pages.map((p) => (
            <button
              key={p.key}
              onClick={() => onPageSelect(p)}
              className={`px-3 py-2 rounded-md transition flex items-center gap-2 ${
                activePage === p.key
                  ? "bg-white text-green-700 font-semibold"
                  : "hover:bg-green-800"
              }`}
            >
              <span>{p.label}</span>
              {p.protected &&
                (isUnlocked ? (
                  <Unlock size={16} />
                ) : (
                  <Lock size={16} className="opacity-80" />
                ))}
            </button>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded hover:bg-green-800"
          onClick={() => setMenuOpen((s) => !s)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-green-800 px-4 py-2 space-y-2">
          {pages.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                onPageSelect(p);
                setMenuOpen(false);
              }}
              className={`block w-full text-right px-3 py-2 rounded-md transition ${
                activePage === p.key
                  ? "bg-white text-green-700 font-semibold"
                  : "hover:bg-green-700"
              }`}
            >
              <span className="inline-block ml-2">{p.label}</span>
              {p.protected &&
                (isUnlocked ? (
                  <Unlock size={14} className="inline" />
                ) : (
                  <Lock size={14} className="inline opacity-80" />
                ))}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
