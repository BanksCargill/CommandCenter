"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Pin, Plus, Search, X } from "lucide-react";
import type { Doc } from "@/db/schema";

type DocWithProject = Doc & { projectName: string | null };
type ProjectRef = { id: number; name: string };

interface Props {
  docs: DocWithProject[];
  projects: ProjectRef[];
}

export default function DocsLanding({ docs: initial, projects }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState(initial);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProjectId, setNewProjectId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const filtered = docs.filter((doc) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || doc.title.toLowerCase().includes(q) || doc.tags.toLowerCase().includes(q);
    const matchesProject = projectFilter === "" || doc.projectId === projectFilter;
    return matchesSearch && matchesProject;
  });

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), projectId: newProjectId || null }),
    });
    const created: DocWithProject = await res.json();
    setDocs((prev) => [created, ...prev]);
    setNewTitle("");
    setNewProjectId("");
    setCreating(false);
    setSaving(false);
    router.push(`/docs/${created.id}`);
  }

  async function handlePin(doc: DocWithProject) {
    const updated: DocWithProject = await fetch(`/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !doc.pinned }),
    }).then((r) => r.json());
    setDocs((prev) => {
      const next = prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d));
      return [...next].sort((a, b) => {
        if (a.pinned === b.pinned) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return a.pinned ? -1 : 1;
      });
    });
  }

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-100">Docs</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition-colors"
        >
          <Plus size={12} />
          New doc
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-4 border border-emerald-800/60 rounded-lg p-4 bg-gray-900/60 space-y-3">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Document title"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-700"
          />
          {projects.length > 0 && (
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value ? Number(e.target.value) : "")}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-700"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newTitle.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs transition-colors disabled:opacity-50"
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              Create &amp; open
            </button>
            <button
              onClick={() => { setCreating(false); setNewTitle(""); setNewProjectId(""); }}
              className="px-4 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search + project filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or tags..."
            className="w-full bg-gray-900 border border-gray-800 rounded pl-8 pr-8 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {projects.length > 0 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value ? Number(e.target.value) : "")}
            className="bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-gray-600"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Doc list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          {docs.length === 0 ? "No docs yet — create one above." : "No docs match your search."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex items-start gap-3 border border-gray-800 rounded-lg p-4 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/60 transition-colors cursor-pointer"
              onClick={() => router.push(`/docs/${doc.id}`)}
            >
              <FileText size={14} className="text-gray-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-100 truncate">{doc.title}</span>
                  {doc.pinned && <Pin size={11} className="text-amber-400 shrink-0" />}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  {doc.projectName && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-sky-900/40 text-sky-400 border border-sky-800/50">
                      {doc.projectName}
                    </span>
                  )}
                  {doc.tags.split(",").filter(Boolean).map((tag) => (
                    <span key={tag.trim()} className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {tag.trim()}
                    </span>
                  ))}
                  <span className="ml-auto text-xs text-gray-600">{formatDate(doc.createdAt)}</span>
                </div>
              </div>
              {/* Pin toggle — visible on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePin(doc); }}
                title={doc.pinned ? "Unpin" : "Pin"}
                className={`shrink-0 p-1.5 rounded transition-all ${
                  doc.pinned
                    ? "text-amber-400 hover:text-amber-300"
                    : "text-gray-600 hover:text-amber-400 hover:bg-amber-900/20 opacity-0 group-hover:opacity-100"
                }`}
              >
                <Pin size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
