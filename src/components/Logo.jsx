import React from "react";

export default function Logo({ className = "" }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`} aria-label="INVEST IN PERM">
      {/* Знак-стрелка */}
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-brand-red text-white">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M5 12h10l-3.5-3.5L13 7l6 5-6 5-1.5-1.5L15 12H5z" />
        </svg>
      </span>
      {/* Словесная часть */}
      <span className="font-din tracking-wider uppercase text-brand-blue leading-none">
        Invest&nbsp;in&nbsp;Perm
      </span>
    </div>
  );
}