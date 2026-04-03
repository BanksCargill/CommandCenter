"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb, CircleDot, CheckCircle2,
  Plus, Archive, Trash2, ArchiveRestore, FolderOpen, Loader2,
} from "lucide-react";
import type { Project } from "@/db/schema";

type StatusCount = { projectId: number | null; status: string; total: number };

interface Props {
  projects: Project[];
  itemCounts: StatusCount[];
}

function countsFor(projectId: number, counts: StatusCount[]) {
  const rows = counts.filter((c) => c.projectId === projectId);
  const get = (s: string) => rows.find((r) => r.status === s)?.total ?? 0;
  return { idea: get("idea"), todo: get("todo"), done: get("done") };
}

export default function ProjectsLanding({ projects: initial, itemCounts }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const visible = projects.filter((p) => showArchived ? p.archived : !p.archived);
  const archivedCount = projects.filter((p) => p.archived).length;

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    });
    const created: Project = await res.json();
    setProjects((prev) => [...prev, created]);
    setNewName("");
    setNewDesc("");
    setCreating(false);
    setSaving(false);
    router.push(`/projects/${created.id}`);
  }

  async function handleArchive(project: Project) {
    const updated: Project = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !project.archived }),
    }).then((r) => r.json());
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.name}" and all its items? This cannot be undone.`)) return;
    setDeletingId(project.id);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setDeletingId(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-100">Projects</h1>
        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors ${
                showArchived
                  ? "border-amber-800 text-amber-400 bg-amber-900/20"
                  : "border-gray-700 text-gray-500 hover:text-gray-300"
              }`}
            >
              <Archive size={12} />
              {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
            </button>
          )}
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors"
          >
            <Plus size={12} />
            New project
          </button>
        </div>
      </div>

      {/* New project form */}
      {creating && (
        <div className="mb-4 border border-emerald-800/60 rounded-lg p-4 bg-gray-900/60 space-y-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Project name"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-700"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-700"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              Create & open
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}
              className="px-4 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project grid */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          {showArchived ? "No archived projects." : "No projects yet — create one above."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((project) => {
            const c = countsFor(project.id, itemCounts);
            const total = c.idea + c.todo + c.done;
            const isDeleting = deletingId === project.id;
            return (
              <div
                key={project.id}
                className={`group relative flex flex-col gap-3 border rounded-lg p-4 transition-colors cursor-pointer ${
                  project.archived
                    ? "border-gray-800 bg-gray-900/20 opacity-60 hover:opacity-80"
                    : "border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/60"
                }`}
                onClick={() => !isDeleting && router.push(`/projects/${project.id}`)}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <FolderOpen size={13} className="text-gray-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-100 truncate">{project.name}</span>
                    </div>
                    {project.description && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{project.description}</p>
                    )}
                  </div>

                  {/* Actions — visible on hover */}
                  <div
                    className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleArchive(project)}
                      title={project.archived ? "Restore" : "Archive"}
                      className="p-1.5 rounded text-gray-600 hover:text-amber-400 hover:bg-amber-900/20 transition-colors"
                    >
                      {project.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                    </button>
                    <button
                      onClick={() => handleDelete(project)}
                      disabled={isDeleting}
                      title="Delete project"
                      className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>

                {/* Status counts */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-sky-500">
                    <Lightbulb size={11} />
                    {c.idea}
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <CircleDot size={11} />
                    {c.todo}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 size={11} />
                    {c.done}
                  </span>
                  <span className="ml-auto text-gray-600 font-mono">{total} item{total !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
