"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Pin,
  Archive,
  MessageSquare,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Check,
  HelpCircle,
  Send,
  Filter,
  RefreshCw,
  Eye,
  AlertCircle,
  Bell,
  Users,
  Link2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface Note {
  id: string;
  title: string | null;
  content: string;
  type: "GENERAL" | "ANNOUNCEMENT" | "PRIVATE" | "ENTITY_LINKED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  category: "OPERATIONS" | "FLEET" | "CLIENTS" | "HR" | "FINANCE" | "GENERAL" | "OTHER";
  isPinned: boolean;
  isArchived: boolean;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  commentsCount: number;
  attachmentsCount: number;
  reactionsCount: Record<string, number>;
  userReactions: string[];
}

interface NoteComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface NoteDetail extends Note {
  comments: NoteComment[];
  recipients: Array<{
    user: { id: string; name: string | null; email: string };
  }>;
}

const priorityConfig = {
  LOW: { label: "Informacyjna", color: "bg-slate-100 text-slate-700" },
  NORMAL: { label: "Normalna", color: "bg-blue-100 text-blue-700" },
  HIGH: { label: "Wazna", color: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Pilna", color: "bg-red-100 text-red-700" },
};

const typeConfig = {
  GENERAL: { label: "Ogolna", icon: MessageSquare },
  ANNOUNCEMENT: { label: "Ogloszenie", icon: Bell },
  PRIVATE: { label: "Prywatna", icon: Users },
  ENTITY_LINKED: { label: "Powiazana", icon: Link2 },
};

const categoryConfig = {
  OPERATIONS: "Operacje",
  FLEET: "Flota",
  CLIENTS: "Klienci",
  HR: "Kadry",
  FINANCE: "Finanse",
  GENERAL: "Ogolne",
  OTHER: "Inne",
};

const reactionIcons: Record<string, React.ReactNode> = {
  LIKE: <ThumbsUp className="h-4 w-4" />,
  HEART: <Heart className="h-4 w-4" />,
  THUMBS_UP: <ThumbsUp className="h-4 w-4" />,
  THUMBS_DOWN: <ThumbsDown className="h-4 w-4" />,
  CHECK: <Check className="h-4 w-4" />,
  QUESTION: <HelpCircle className="h-4 w-4" />,
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create note dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newNote, setNewNote] = useState<{
    title: string;
    content: string;
    type: "GENERAL" | "ANNOUNCEMENT" | "PRIVATE";
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    category: "OPERATIONS" | "FLEET" | "CLIENTS" | "HR" | "FINANCE" | "GENERAL" | "OTHER";
  }>({
    title: "",
    content: "",
    type: "GENERAL",
    priority: "NORMAL",
    category: "GENERAL",
  });
  const [creating, setCreating] = useState(false);

  // View note dialog
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (showArchived) params.set("archived", "true");
      if (showUnreadOnly) params.set("unread", "true");
      if (search) params.set("search", search);

      const response = await fetch(`/api/notes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, priorityFilter, categoryFilter, showArchived, showUnreadOnly, search]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreateNote = async () => {
    if (!newNote.content.trim()) return;

    try {
      setCreating(true);
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewNote({
          title: "",
          content: "",
          type: "GENERAL",
          priority: "NORMAL",
          category: "GENERAL",
        });
        fetchNotes();
      }
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleViewNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`);
      if (response.ok) {
        const note = await response.json();
        setSelectedNote(note);
        setShowViewDialog(true);
        // Update note in list as read
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error("Error fetching note:", error);
    }
  };

  const handleAddComment = async () => {
    if (!selectedNote || !newComment.trim()) return;

    try {
      setSendingComment(true);
      const response = await fetch(`/api/notes/${selectedNote.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const comment = await response.json();
        setSelectedNote((prev) =>
          prev ? { ...prev, comments: [...prev.comments, comment] } : null
        );
        setNewComment("");
        // Update comment count in list
        setNotes((prev) =>
          prev.map((n) =>
            n.id === selectedNote.id
              ? { ...n, commentsCount: n.commentsCount + 1 }
              : n
          )
        );
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSendingComment(false);
    }
  };

  const handleToggleReaction = async (noteId: string, type: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const { action } = await response.json();
        // Update note in list
        setNotes((prev) =>
          prev.map((n) => {
            if (n.id !== noteId) return n;
            const newReactionsCount = { ...n.reactionsCount };
            let newUserReactions = [...n.userReactions];

            if (action === "added") {
              newReactionsCount[type] = (newReactionsCount[type] || 0) + 1;
              newUserReactions.push(type);
            } else {
              newReactionsCount[type] = Math.max(0, (newReactionsCount[type] || 1) - 1);
              newUserReactions = newUserReactions.filter((r) => r !== type);
            }

            return { ...n, reactionsCount: newReactionsCount, userReactions: newUserReactions };
          })
        );
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const handleArchiveNote = async (noteId: string, archive: boolean) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: archive }),
      });

      if (response.ok) {
        if (showArchived === archive) {
          fetchNotes();
        } else {
          setNotes((prev) => prev.filter((n) => n.id !== noteId));
        }
      }
    } catch (error) {
      console.error("Error archiving note:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notatki</h1>
          <p className="text-muted-foreground">
            Wewnetrzna komunikacja i notatki zespolu
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nowa notatka
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Szukaj notatek..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                <SelectItem value="GENERAL">Ogolne</SelectItem>
                <SelectItem value="ANNOUNCEMENT">Ogloszenia</SelectItem>
                <SelectItem value="PRIVATE">Prywatne</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priorytet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="LOW">Informacyjne</SelectItem>
                <SelectItem value="NORMAL">Normalne</SelectItem>
                <SelectItem value="HIGH">Wazne</SelectItem>
                <SelectItem value="URGENT">Pilne</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="OPERATIONS">Operacje</SelectItem>
                <SelectItem value="FLEET">Flota</SelectItem>
                <SelectItem value="CLIENTS">Klienci</SelectItem>
                <SelectItem value="HR">Kadry</SelectItem>
                <SelectItem value="FINANCE">Finanse</SelectItem>
                <SelectItem value="GENERAL">Ogolne</SelectItem>
                <SelectItem value="OTHER">Inne</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Nieprzeczytane
            </Button>

            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archiwum
            </Button>

            <Button variant="ghost" size="sm" onClick={fetchNotes}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Ladowanie notatek...
          </div>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Brak notatek do wyswietlenia
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Utworz pierwsza notatke
              </Button>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => {
            const TypeIcon = typeConfig[note.type].icon;
            return (
              <Card
                key={note.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !note.isRead ? "border-l-4 border-l-primary" : ""
                } ${note.isPinned ? "bg-yellow-50/50" : ""}`}
                onClick={() => handleViewNote(note.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {note.isPinned && (
                          <Pin className="h-4 w-4 text-yellow-600" />
                        )}
                        {!note.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <span className="font-medium">
                          {note.title || "Bez tytulu"}
                        </span>
                        <Badge
                          variant="outline"
                          className={priorityConfig[note.priority].color}
                        >
                          {priorityConfig[note.priority].label}
                        </Badge>
                        <Badge variant="secondary">
                          <TypeIcon className="mr-1 h-3 w-3" />
                          {typeConfig[note.type].label}
                        </Badge>
                        <Badge variant="outline">
                          {categoryConfig[note.category]}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {note.content}
                      </p>

                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {note.author.name || note.author.email} &bull;{" "}
                          {formatDistanceToNow(new Date(note.createdAt), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </span>

                        {note.commentsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {note.commentsCount}
                          </span>
                        )}

                        {/* Reactions summary */}
                        <div className="flex items-center gap-2">
                          {Object.entries(note.reactionsCount).map(
                            ([type, count]) =>
                              count > 0 && (
                                <button
                                  key={type}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleReaction(note.id, type);
                                  }}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                    note.userReactions.includes(type)
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-muted"
                                  }`}
                                >
                                  {reactionIcons[type]}
                                  <span>{count}</span>
                                </button>
                              )
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveNote(note.id, !note.isArchived);
                      }}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Poprzednia
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Strona {page} z {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Nastepna
          </Button>
        </div>
      )}

      {/* Create Note Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nowa notatka</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tytul (opcjonalnie)</Label>
              <Input
                value={newNote.title}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Tytul notatki"
              />
            </div>

            <div>
              <Label>Tresc *</Label>
              <textarea
                value={newNote.content}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Napisz tresc notatki..."
                className="w-full min-h-[150px] p-3 border rounded-md resize-y"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Typ</Label>
                <Select
                  value={newNote.type}
                  onValueChange={(value: "GENERAL" | "ANNOUNCEMENT" | "PRIVATE") =>
                    setNewNote((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Ogolna</SelectItem>
                    <SelectItem value="ANNOUNCEMENT">Ogloszenie</SelectItem>
                    <SelectItem value="PRIVATE">Prywatna</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priorytet</Label>
                <Select
                  value={newNote.priority}
                  onValueChange={(value: "LOW" | "NORMAL" | "HIGH" | "URGENT") =>
                    setNewNote((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Informacyjna</SelectItem>
                    <SelectItem value="NORMAL">Normalna</SelectItem>
                    <SelectItem value="HIGH">Wazna</SelectItem>
                    <SelectItem value="URGENT">Pilna</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Kategoria</Label>
                <Select
                  value={newNote.category}
                  onValueChange={(value: "OPERATIONS" | "FLEET" | "CLIENTS" | "HR" | "FINANCE" | "GENERAL" | "OTHER") =>
                    setNewNote((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONS">Operacje</SelectItem>
                    <SelectItem value="FLEET">Flota</SelectItem>
                    <SelectItem value="CLIENTS">Klienci</SelectItem>
                    <SelectItem value="HR">Kadry</SelectItem>
                    <SelectItem value="FINANCE">Finanse</SelectItem>
                    <SelectItem value="GENERAL">Ogolne</SelectItem>
                    <SelectItem value="OTHER">Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleCreateNote}
              disabled={!newNote.content.trim() || creating}
            >
              {creating ? "Tworzenie..." : "Utworz notatke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Note Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedNote.isPinned && (
                    <Pin className="h-4 w-4 text-yellow-600" />
                  )}
                  <DialogTitle>
                    {selectedNote.title || "Bez tytulu"}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={priorityConfig[selectedNote.priority].color}
                  >
                    {priorityConfig[selectedNote.priority].label}
                  </Badge>
                  <Badge variant="secondary">
                    {typeConfig[selectedNote.type].label}
                  </Badge>
                  <Badge variant="outline">
                    {categoryConfig[selectedNote.category]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedNote.author.name || selectedNote.author.email} &bull;{" "}
                  {formatDistanceToNow(new Date(selectedNote.createdAt), {
                    addSuffix: true,
                    locale: pl,
                  })}
                </p>
              </DialogHeader>

              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4 pr-4">
                  {/* Content */}
                  <div className="whitespace-pre-wrap">{selectedNote.content}</div>

                  {/* Reactions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    {(["LIKE", "HEART", "THUMBS_UP", "CHECK"] as const).map(
                      (type) => (
                        <Button
                          key={type}
                          variant={
                            selectedNote.userReactions.includes(type)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            handleToggleReaction(selectedNote.id, type)
                          }
                        >
                          {reactionIcons[type]}
                          {selectedNote.reactionsCount[type] > 0 && (
                            <span className="ml-1">
                              {selectedNote.reactionsCount[type]}
                            </span>
                          )}
                        </Button>
                      )
                    )}
                  </div>

                  {/* Comments */}
                  {selectedNote.comments.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium">
                        Komentarze ({selectedNote.comments.length})
                      </h4>
                      {selectedNote.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-muted/50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">
                              {comment.author.name || comment.author.email}
                            </span>
                            <span className="text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                                locale: pl,
                              })}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add comment */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Input
                      placeholder="Napisz komentarz..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || sendingComment}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
