"use client";

import { useState, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Archive, Clock } from "lucide-react";
import type { ProjectItem } from "@/db/schema";

interface Props {
  item: ProjectItem;
  projectId: number;
  onUpdate: (item: ProjectItem) => void;
  onDelete: (id: number) => void;
}

export default function ProjectCard({ item, projectId, onUpdate, onDelete }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [tags, setTags] = useState(item.tags ?? "");
  const titleRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  useEffect(() => { if (editingTitle) titleRef.current?.focus(); }, [editingTitle]);
  useEffect(() => { if (editingNotes) notesRef.current?.focus(); }, [editingNotes]);
  useEffect(() => { if (editingTags) tagsRef.current?.focus(); }, [editingTags]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${projectId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onUpdate(await res.json());
  }

  async function saveTitle() {
    setEditingTitle(false);
    if (title === item.title) return;
    await patch({ title });
  }

  async function saveNotes() {
    setEditingNotes(false);
    const val = notes || null;
    if (val === item.notes) return;
    await patch({ notes: val });
  }

  async function saveTags() {
    setEditingTags(false);
    const val = tags.trim() || null;
    if (val === item.tags) return;
    await patch({ tags: val });
  }

  async function handleDelete() {
    await fetch(`/api/projects/${projectId}/items/${item.id}`, { method: "DELETE" });
    onDelete(item.id);
  }

  async function handleArchive() {
    await patch({ archived: true });
  }

  const tagList = (item.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  function fmtDate(d: Date | string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  const timeline: { label: string; date: Date | string | null | undefined }[] = [
    { label: "Created", date: item.createdAt },
    { label: "Started", date: item.startedAt },
    { label: "Done", date: item.completedAt },
  ].filter((e) => e.date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-900 border border-gray-700/60 rounded-lg p-3 group flex flex-col gap-2"
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="text-gray-600 hover:text-gray-400 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={14} />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-emerald-700"
            />
          ) : (
            <p
              onClick={() => setEditingTitle(true)}
              className="text-sm text-white leading-snug cursor-text hover:text-emerald-300 transition-colors"
            >
              {item.title}
            </p>
          )}
        </div>

        {/* Actions (hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
          <button
            onClick={handleArchive}
            title="Archive"
            className="text-gray-700 hover:text-amber-400 transition-colors"
          >
            <Archive size={13} />
          </button>
          <button
            onClick={handleDelete}
            title="Delete"
            className="text-gray-700 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Notes */}
      {editingNotes ? (
        <textarea
          ref={notesRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Add notes…"
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-700 resize-none leading-relaxed ml-5"
        />
      ) : (
        <p
          onClick={() => setEditingNotes(true)}
          className={`text-xs leading-relaxed cursor-text ml-5 ${
            item.notes
              ? "text-gray-500 hover:text-gray-400"
              : "text-gray-700 hover:text-gray-600 italic"
          } transition-colors`}
        >
          {item.notes || "Add notes…"}
        </p>
      )}

      {/* Tags */}
      <div className="ml-5">
        {editingTags ? (
          <input
            ref={tagsRef}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onBlur={saveTags}
            onKeyDown={(e) => e.key === "Enter" && saveTags()}
            placeholder="tag1, tag2, tag3"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-700"
          />
        ) : tagList.length > 0 ? (
          <div
            onClick={() => setEditingTags(true)}
            className="flex flex-wrap gap-1 cursor-text"
          >
            {tagList.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setEditingTags(true)}
            className="text-[10px] text-gray-700 hover:text-gray-600 italic transition-colors"
          >
            Add tags…
          </button>
        )}
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="ml-5 flex items-center gap-2 flex-wrap">
          <Clock size={10} className="text-gray-700 shrink-0" />
          {timeline.map(({ label, date }, i) => (
            <span key={label} className="text-[10px] text-gray-700 font-mono">
              {i > 0 && <span className="mr-2 text-gray-800">·</span>}
              <span className="text-gray-600">{label}</span>{" "}
              {fmtDate(date)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
