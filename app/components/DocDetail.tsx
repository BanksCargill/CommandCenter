"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ArrowLeft, Edit2, Loader2, Pin, Save, Trash2, Upload, X } from "lucide-react";
import MermaidBlock from "@/app/components/MermaidBlock";
import type { Doc } from "@/db/schema";

type DocWithProject = Doc & { projectName: string | null };
type ProjectRef = { id: number; name: string };

interface Props {
  doc: DocWithProject;
  projects: ProjectRef[];
}

// Handles fenced code blocks (``` ... ```) — called instead of <pre>.
// react-markdown v9 no longer passes `inline` to <code>, so we split
// block rendering (pre) from inline rendering (code) to avoid <div> inside <p>.
function PreBlock({ node }: { node?: { children?: Array<{ tagName?: string; properties?: { className?: string[] }; children?: Array<{ value?: string }> }> } }) {
  const codeChild = node?.children?.[0];
  const className = codeChild?.properties?.className?.join(" ") ?? "";
  const language = /language-(\w+)/.exec(className)?.[1] ?? "";
  const code = codeChild?.children?.[0]?.value ?? "";

  if (language === "mermaid") {
    return <MermaidBlock chart={code} />;
  }

  return (
    <SyntaxHighlighter
      style={vscDarkPlus}
      language={language || "text"}
      PreTag="div"
      customStyle={{ borderRadius: "0.5rem", margin: "1rem 0", fontSize: "0.8rem" }}
    >
      {code}
    </SyntaxHighlighter>
  );
}

// Handles inline code (`backtick`) only — block code is handled by PreBlock above.
function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="bg-gray-800 text-emerald-300 px-1 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  );
}

export default function DocDetail({ doc: initial, projects }: Props) {
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [isEditing, setIsEditing] = useState(!initial.content);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [tags, setTags] = useState(initial.tags);
  const [projectId, setProjectId] = useState<number | "">(initial.projectId ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  async function handleSave() {
    setSaving(true);
    const updated: DocWithProject = await fetch(`/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, tags, projectId: projectId || null }),
    }).then((r) => r.json());
    setDoc(updated);
    setTitle(updated.title);
    setContent(updated.content);
    setTags(updated.tags);
    setProjectId(updated.projectId ?? "");
    setSaving(false);
    setIsEditing(false);
  }

  async function handlePin() {
    const updated: DocWithProject = await fetch(`/api/docs/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !doc.pinned }),
    }).then((r) => r.json());
    setDoc((d) => ({ ...d, pinned: updated.pinned }));
  }

  async function handleDelete() {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/docs/${doc.id}`, { method: "DELETE" });
    router.push("/docs");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target?.result as string ?? "");
      if (!title.trim()) {
        setTitle(file.name.replace(/\.(md|txt)$/i, ""));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleCancelEdit() {
    setTitle(doc.title);
    setContent(doc.content);
    setTags(doc.tags);
    setProjectId(doc.projectId ?? "");
    setIsEditing(false);
  }

  return (
    <div className={`${isEditing ? "max-w-6xl" : "max-w-3xl"} mx-auto px-6 py-8`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/docs")}
          className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="w-full bg-transparent text-lg font-semibold text-gray-100 focus:outline-none border-b border-gray-700 pb-1"
            />
          ) : (
            <h1 className="text-lg font-semibold text-gray-100 truncate">{doc.title}</h1>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handlePin}
            title={doc.pinned ? "Unpin" : "Pin"}
            className={`p-1.5 rounded transition-colors ${
              doc.pinned
                ? "text-amber-400 hover:text-amber-300"
                : "text-gray-600 hover:text-amber-400 hover:bg-amber-900/20"
            }`}
          >
            <Pin size={15} />
          </button>

          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded text-gray-600 hover:text-gray-300 transition-colors"
                title="Cancel"
              >
                <X size={15} />
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              title="Edit"
            >
              <Edit2 size={15} />
            </button>
          )}

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
            title="Delete"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {isEditing ? (
          <>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 w-52"
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-gray-600"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-700 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors"
            >
              <Upload size={11} />
              Upload .md
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </>
        ) : (
          <>
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
            <span className="ml-auto text-xs text-gray-600">Created {formatDate(doc.createdAt)}</span>
            {String(doc.updatedAt) !== String(doc.createdAt) && (
              <span className="text-xs text-gray-600">· Updated {formatDate(doc.updatedAt)}</span>
            )}
          </>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Editor */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your markdown here..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-gray-600 font-mono resize-none min-h-128"
          />
          {/* Live preview */}
          <div className="overflow-auto rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3 min-h-128">
            {content ? (
              <div className="
                max-w-none text-gray-300 text-sm leading-relaxed
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-100 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-gray-800
                [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-100 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-gray-800
                [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-100 [&_h3]:mt-4 [&_h3]:mb-2
                [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-200 [&_h4]:mt-3 [&_h4]:mb-1
                [&_p]:my-3
                [&_a]:text-emerald-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-emerald-300
                [&_strong]:text-gray-100 [&_strong]:font-semibold
                [&_em]:text-gray-300 [&_em]:italic
                [&_ul]:my-3 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1
                [&_ol]:my-3 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1
                [&_li]:text-gray-300
                [&_blockquote]:border-l-4 [&_blockquote]:border-gray-600 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-gray-400 [&_blockquote]:italic
                [&_hr]:my-6 [&_hr]:border-gray-700
                [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                [&_th]:bg-gray-800 [&_th]:text-gray-200 [&_th]:font-semibold [&_th]:px-3 [&_th]:py-2 [&_th]:border [&_th]:border-gray-700 [&_th]:text-left
                [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-gray-800 [&_td]:text-gray-300
                [&_tr:nth-child(even)_td]:bg-gray-900/50
                [&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:accent-emerald-500
                [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-4
              ">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{ pre: PreBlock as never, code: InlineCode as never }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Preview will appear here...</p>
            )}
          </div>
        </div>
      ) : doc.content ? (
        <div className="
          max-w-none text-gray-300 text-sm leading-relaxed
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-100 [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:pb-2 [&_h1]:border-b [&_h1]:border-gray-800
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-100 [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-gray-800
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-100 [&_h3]:mt-4 [&_h3]:mb-2
          [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-200 [&_h4]:mt-3 [&_h4]:mb-1
          [&_p]:my-3
          [&_a]:text-emerald-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-emerald-300
          [&_strong]:text-gray-100 [&_strong]:font-semibold
          [&_em]:text-gray-300 [&_em]:italic
          [&_ul]:my-3 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1
          [&_ol]:my-3 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1
          [&_li]:text-gray-300
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-600 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-gray-400 [&_blockquote]:italic
          [&_hr]:my-6 [&_hr]:border-gray-700
          [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
          [&_th]:bg-gray-800 [&_th]:text-gray-200 [&_th]:font-semibold [&_th]:px-3 [&_th]:py-2 [&_th]:border [&_th]:border-gray-700 [&_th]:text-left
          [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-gray-800 [&_td]:text-gray-300
          [&_tr:nth-child(even)_td]:bg-gray-900/50
          [&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:accent-emerald-500
          [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-4
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ pre: PreBlock as never, code: InlineCode as never }}
          >
            {doc.content}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-600 text-sm">
          No content yet.{" "}
          <button onClick={() => setIsEditing(true)} className="text-emerald-500 hover:text-emerald-400">
            Start editing
          </button>
        </div>
      )}
    </div>
  );
}
