"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
import { Lightbulb, CircleDot, CheckCircle2, Plus, ArchiveX, ChevronLeft } from "lucide-react";
import ProjectCard from "./ProjectCard";
import type { Project, ProjectItem } from "@/db/schema";

type Status = "idea" | "todo" | "done";

const COLUMNS: { status: Status; label: string; icon: React.ElementType; color: string }[] = [
  { status: "idea",  label: "Ideas",   icon: Lightbulb,    color: "text-sky-400" },
  { status: "todo",  label: "To Do",   icon: CircleDot,    color: "text-amber-400" },
  { status: "done",  label: "Done",    icon: CheckCircle2, color: "text-emerald-400" },
];

function Column({
  status, label, icon: Icon, color, items, projectId, onUpdate, onDelete, onAdd,
}: {
  status: Status; label: string; icon: React.ElementType; color: string;
  items: ProjectItem[]; projectId: number;
  onUpdate: (item: ProjectItem) => void;
  onDelete: (id: number) => void;
  onAdd: (status: Status, title: string, notes: string, tags: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newTags, setNewTags] = useState("");

  function handleAdd() {
    if (!newTitle.trim()) return;
    onAdd(status, newTitle.trim(), newNotes.trim(), newTags.trim());
    setNewTitle("");
    setNewNotes("");
    setNewTags("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <Icon size={14} className={color} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</span>
        <span className="text-gray-600 text-xs ml-auto">{items.length}</span>
      </div>

      {/* Drop zone — scrollable */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 rounded-lg p-2 transition-colors min-h-0 overflow-y-auto ${
          isOver ? "bg-gray-800/60 ring-1 ring-gray-600" : "bg-gray-900/20"
        }`}
      >
        {items.map((item) => (
          <ProjectCard
            key={item.id}
            item={item}
            projectId={projectId}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}

        {/* Add form */}
        {adding ? (
          <div className="flex flex-col gap-2 bg-gray-900 border border-gray-700 rounded-lg p-3 shrink-0">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Title"
              className="bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-700"
            />
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-emerald-700 resize-none"
            />
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:border-emerald-700"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs rounded py-1.5 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setNewTitle(""); setNewNotes(""); setNewTags(""); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors rounded shrink-0"
          >
            <Plus size={12} />
            Add item
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  project: Project;
  initialItems: ProjectItem[];
}

export default function ProjectBoard({ project, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [showArchived, setShowArchived] = useState(false);

  function handleUpdate(updated: ProjectItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleDelete(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleAdd(status: Status, title: string, notes: string, tags: string) {
    const res = await fetch(`/api/projects/${project.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes: notes || null, status, tags: tags || null }),
    });
    const created = await res.json();
    setItems((prev) => [...prev, created]);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as number;
    const newStatus = over.id as Status;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.status === newStatus) return;

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
    );

    const res = await fetch(`/api/projects/${project.id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const updated = await res.json();
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  const byStatus = (status: Status) =>
    items.filter((i) => i.status === status && (showArchived || !i.archived));

  const archivedCount = items.filter((i) => i.archived).length;

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/projects")}
            className="text-gray-600 hover:text-gray-300 transition-colors"
            title="All projects"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-gray-500 mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors ${
              showArchived
                ? "bg-amber-900/40 text-amber-400 border border-amber-800"
                : "text-gray-600 hover:text-gray-400 border border-transparent"
            }`}
          >
            <ArchiveX size={12} />
            {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>

      {/* Board */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 flex-1 min-h-0">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              {...col}
              items={byStatus(col.status)}
              projectId={project.id}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
