"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";
import type { NoteDTO } from "@/types/crm";

export function NotesTimeline({
  leadId,
  notes,
  onChange,
}: {
  leadId: string;
  notes: NoteDTO[];
  onChange: (notes: NoteDTO[]) => void;
}) {
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function addNote() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const note = await api<NoteDTO>(`/api/leads/${leadId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      onChange([note, ...notes]);
      setContent("");
      toast.success("Note added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add note");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: string) {
    const note = await api<NoteDTO>(`/api/leads/${leadId}/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify({ content: draft }),
    });
    onChange(notes.map((item) => (item.id === id ? note : item)));
    setEditing(null);
    toast.success("Note updated");
  }

  async function remove(id: string) {
    await api(`/api/leads/${leadId}/notes/${id}`, { method: "DELETE" });
    onChange(notes.filter((item) => item.id !== id));
    toast.success("Note deleted");
  }

  return (
    <div>
      <Textarea
        placeholder="Add a note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={addNote} disabled={saving || !content.trim()}>
          {saving ? "Adding..." : "Add note"}
        </Button>
      </div>
      <ol className="mt-6 space-y-4 border-l border-border pl-4">
        {notes.length === 0 ? (
          <p className="text-sm text-muted">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <li key={note.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
              <p className="text-xs text-muted">
                {note.author} · {formatDateTime(note.createdAt)}
              </p>
              {editing === note.id ? (
                <div className="mt-2 space-y-2">
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(note.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm">{note.content}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button
                      className="text-muted hover:text-foreground"
                      onClick={() => {
                        setEditing(note.id);
                        setDraft(note.content);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-danger" onClick={() => remove(note.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ol>
    </div>
  );
}
