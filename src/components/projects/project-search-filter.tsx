/**
 * Client-side search and filter bar for the projects grid.
 *
 * Provides a search input (filters by project name) and a status
 * dropdown filter. Emits filtered results via callback.
 */

"use client";

import { useState, useMemo } from "react";
import { type ProjectSummary } from "./project-card";

interface ProjectSearchFilterProps {
  projects: ProjectSummary[];
  children: (filtered: ProjectSummary[]) => React.ReactNode;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "discovered", label: "Discovered" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
] as const;

export function ProjectSearchFilter({
  projects,
  children,
}: ProjectSearchFilterProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = projects;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.techStack?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    return result;
  }, [projects, query, statusFilter]);

  return (
    <>
      {/* Search + Filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-glass-border bg-glass-input py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground/50 backdrop-blur-sm transition-colors focus:border-[var(--color-brand-500)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-glass-border bg-glass-input px-3 py-2 text-sm text-foreground backdrop-blur-sm transition-colors focus:border-[var(--color-brand-500)] focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {children(filtered)}
    </>
  );
}
