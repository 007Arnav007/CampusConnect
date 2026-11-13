import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  BookOpen, ExternalLink, Megaphone, RefreshCw, MessageSquare,
  FileText, Clock, Video, BookMarked, ChevronDown, ChevronUp,
  Send, Bell, CheckCircle, Users, Award,
} from "lucide-react";
import {
  addAcademicDiscussion, createAcademicAssignment, createAcademicCourse,
  createAcademicMaterial, enrollAcademicSection, getAcademicCourse,
  getAcademicCourses, getAcademicDiscussions, getAcademicEnrollments,
  getAcademicNotices, submitAcademicAssignment,
  type AcademicAssignment, type AcademicCourse, type AcademicMaterial,
  type AcademicNotice,
} from "../../api";

// ─── Helpers ───────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-2xl border border-slate-800 bg-slate-900/70 p-5 ${className}`}>
      {children}
    </article>
  );
}

function SectionTitle({ icon: Icon, label, color = "text-indigo-300" }: { icon: React.ElementType; label: string; color?: string }) {
  return (
    <h3 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${color}`}>
      <Icon className="h-4 w-4" />
      {label}
    </h3>
  );
}

function Tag({ children, color = "bg-indigo-900/60 text-indigo-200" }: { children: ReactNode; color?: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{children}</span>;
}

// ─── Material type badge ────────────────────────────────────────────────────

function materialIcon(type: string) {
  if (type === "VIDEO") return "🎬";
  if (type === "BOOK") return "📚";
  if (type === "LINK") return "🔗";
  return "📄";
}

// ─── Main Page ─────────────────────────────────────────────────────────────

type CourseDetail = AcademicCourse & {
  materials: AcademicMaterial[];
  assignments: AcademicAssignment[];
};

type DiscussionPost = { id: string; authorName: string; body: string; createdAt: string };

type TabId = "overview" | "materials" | "timetable" | "syllabus" | "assignments" | "chat" | "announcements";

export default function AcademicsPage() {
  const { user, isStaff } = useAuth();
  const [courses, setCourses] = useState<AcademicCourse[]>([]);
  const [enrollments, setEnrollments] = useState<AcademicCourse[]>([]);
  const [notices, setNotices] = useState<AcademicNotice[]>([]);
  const [selected, setSelected] = useState<CourseDetail | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionPost[]>([]);
  const [postText, setPostText] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [submissions, setSubmissions] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [newCourse, setNewCourse] = useState({ code: "", title: "", term: "" });
  const [material, setMaterial] = useState({ title: "", resourceUrl: "", materialType: "LINK" });
  const [assignment, setAssignment] = useState({ title: "", instructions: "", dueAt: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enrollBusy, setEnrollBusy] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    setBusy(true);
    try {
      const [nextCourses, nextEnrollments, nextNotices] = await Promise.all([
        getAcademicCourses(), getAcademicEnrollments(), getAcademicNotices(),
      ]);
      setCourses(nextCourses);
      setEnrollments(nextEnrollments);
      setNotices(nextNotices);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Academic data is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function openCourse(course: AcademicCourse) {
    if (!course.id) return;
    try {
      const [details, posts] = await Promise.all([
        getAcademicCourse(course.id),
        getAcademicDiscussions(course.id),
      ]);
      setSelected(details);
      setDiscussion(posts);
      setActiveTab("overview");
    } catch {
      setError("Course details are unavailable.");
    }
  }

  async function handleEnroll(course: AcademicCourse, event: React.MouseEvent) {
    event.stopPropagation();
    if (!course.sectionId) return;
    setEnrollBusy(course.sectionId);
    try {
      await enrollAcademicSection(course.sectionId);
      await refresh();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enrollment failed.");
    } finally {
      setEnrollBusy(null);
    }
  }

  async function postMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !postText.trim()) return;
    try {
      await addAcademicDiscussion(selected.id, postText.trim());
      const posts = await getAcademicDiscussions(selected.id);
      setDiscussion(posts);
      setPostText("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Post failed.");
    }
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [activeTab, discussion]);

  // ── Derived ─────────────────────────────────────────────────────────────

  const isEnrolledIn = (sectionId?: string) =>
    enrollments.some((e) => (e as unknown as { sectionId?: string }).sectionId === sectionId);

  const videos = selected?.materials.filter((m) => m.materialType === "VIDEO") ?? [];
  const books = selected?.materials.filter((m) => m.materialType === "BOOK") ?? [];
  const links = selected?.materials.filter((m) => !["VIDEO", "BOOK"].includes(m.materialType)) ?? [];

  // Pull syllabus and timetable from notices filtered by this course (they're stored as discussions/documents)
  const courseNotices = selected
    ? notices.filter((n) => n.courseTitle === selected.title || n.code === selected.code)
    : [];

  // ── Category grouping ────────────────────────────────────────────────────

  const grouped: Record<string, AcademicCourse[]> = {};
  for (const c of courses) {
    const dept = c.department || "Other";
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(c);
  }

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "syllabus", label: "Syllabus", icon: FileText },
    { id: "timetable", label: "Timetable", icon: Clock },
    { id: "materials", label: "Resources", icon: BookMarked },
    { id: "assignments", label: "Assignments", icon: Award },
    { id: "chat", label: `Chat (${discussion.length})`, icon: MessageSquare },
    { id: "announcements", label: "Announcements", icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-indigo-300">Campus Academics</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Courses & Learning Hub</h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse subjects, enroll, access resources, chat with classmates, and submit assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {enrollments.length > 0 && (
            <Tag color="bg-emerald-900/50 text-emerald-300">
              <Users className="mr-1 inline h-3 w-3" />
              Enrolled in {enrollments.length} course{enrollments.length !== 1 ? "s" : ""}
            </Tag>
          )}
          <button
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-950/30 p-3 text-sm text-rose-200">
          ⚠️ {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ── Left: Course list ── */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([dept, deptCourses]) => (
            <Card key={dept}>
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <BookOpen className="h-4 w-4 text-indigo-300" />
                {dept}
                <span className="ml-auto text-xs text-slate-500">{deptCourses.length} course{deptCourses.length !== 1 ? "s" : ""}</span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {deptCourses.map((course) => {
                  const enrolled = isEnrolledIn(course.sectionId);
                  const isBusy = enrollBusy === course.sectionId;
                  return (
                    <article
                      key={`${course.id}-${course.sectionId ?? "course"}`}
                      onClick={() => void openCourse(course)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all hover:bg-slate-800/60 ${selected?.id === course.id ? "border-indigo-500 bg-slate-800/60" : "border-slate-800 hover:border-indigo-500/40"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-xs text-indigo-300">{course.code}</span>
                        {course.term && <span className="text-xs text-slate-500">{course.term}</span>}
                      </div>
                      <p className="mt-2 font-semibold text-white">{course.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{course.description || "No description provided."}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {course.enrolled ?? 0}/{course.capacity ?? "—"} enrolled
                        </span>
                        {course.room && (
                          <span className="text-xs text-slate-600">· {course.room}</span>
                        )}
                      </div>
                      {course.sectionId && !isStaff && (
                        <div className="mt-3">
                          {enrolled ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-900/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                              <CheckCircle className="h-3 w-3" /> Enrolled
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={(e) => void handleEnroll(course, e)}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                            >
                              {isBusy ? "Enrolling…" : "Enroll"}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* My Enrollments */}
          {!isStaff && (
            <Card>
              <h2 className="mb-4 font-semibold text-white">My Enrollments</h2>
              {enrollments.length === 0 ? (
                <p className="text-sm text-slate-500">You haven't enrolled in any courses yet. Click a course above to enroll.</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => void openCourse(course)}
                      className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-800/60 p-3 text-sm hover:bg-slate-700/60"
                    >
                      <div>
                        <span className="font-mono text-xs text-indigo-300">{course.code}</span>
                        <p className="text-slate-200">{course.title}</p>
                      </div>
                      <span className="text-emerald-300 text-xs">{course.term}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ── Right: Notices + Course Detail ── */}
        <div className="space-y-4">
          {/* Announcements/Notices panel */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
              <Megaphone className="h-4 w-4 text-amber-300" />
              Academic Notices
            </h2>
            {notices.length === 0 ? (
              <p className="text-sm text-slate-500">No current notices.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {notices.slice(0, 15).map((notice) => (
                  <div key={notice.id} className="border-b border-slate-800 pb-3 last:border-0">
                    <p className="font-medium text-slate-200 text-sm">{notice.body}</p>
                    <p className="mt-1 text-xs text-slate-500">{notice.title}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Course detail panel */}
          {selected && (
            <Card className="sticky top-4">
              {/* Course header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs text-indigo-300">{selected.code}</span>
                  <h2 className="mt-0.5 font-bold text-white">{selected.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">{selected.facultyName} · {selected.credits} credits</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-xs text-slate-500 hover:text-slate-300">✕ Close</button>
              </div>

              {/* Tab bar */}
              <div className="mt-4 flex flex-wrap gap-1 border-b border-slate-800 pb-3">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${activeTab === tab.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
                  >
                    <tab.icon className="h-3 w-3" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="mt-4">

                {/* ── Overview ── */}
                {activeTab === "overview" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Description</p>
                      <p className="text-sm text-slate-300">{selected.description || "No description available."}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {selected.room && (
                        <div className="rounded-lg bg-slate-800/60 p-2.5">
                          <p className="text-xs text-slate-500">Room</p>
                          <p className="text-sm text-slate-200 font-medium">{selected.room}</p>
                        </div>
                      )}
                      {selected.term && (
                        <div className="rounded-lg bg-slate-800/60 p-2.5">
                          <p className="text-xs text-slate-500">Term</p>
                          <p className="text-sm text-slate-200 font-medium">{selected.term}</p>
                        </div>
                      )}
                      {selected.capacity && (
                        <div className="rounded-lg bg-slate-800/60 p-2.5">
                          <p className="text-xs text-slate-500">Capacity</p>
                          <p className="text-sm text-slate-200 font-medium">{selected.enrolled ?? 0}/{selected.capacity}</p>
                        </div>
                      )}
                      {selected.credits && (
                        <div className="rounded-lg bg-slate-800/60 p-2.5">
                          <p className="text-xs text-slate-500">Credits</p>
                          <p className="text-sm text-slate-200 font-medium">{selected.credits}</p>
                        </div>
                      )}
                    </div>
                    {selected.schedule && (
                      <div className="mt-2 rounded-lg bg-slate-800/60 p-2.5">
                        <p className="text-xs text-slate-500 mb-1">Schedule</p>
                        <p className="text-sm text-slate-200">{selected.schedule}</p>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2 text-xs text-slate-400">
                      <span>📄 {selected.materials.length} materials</span>
                      <span>·</span>
                      <span>📝 {selected.assignments.length} assignments</span>
                      <span>·</span>
                      <span>💬 {discussion.length} messages</span>
                    </div>
                  </div>
                )}

                {/* ── Syllabus ── */}
                {activeTab === "syllabus" && (
                  <div>
                    <SectionTitle icon={FileText} label="Course Syllabus" color="text-cyan-300" />
                    {/* Look for syllabus in materials/documents with SYLLABUS type or title containing "Syllabus" */}
                    {(() => {
                      const syllabusDoc = selected.materials.find((m) =>
                        m.title.toLowerCase().includes("syllabus") || m.materialType === "SYLLABUS"
                      );
                      // Also try courseNotices
                      if (syllabusDoc) {
                        return (
                          <a href={syllabusDoc.resourceUrl} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-3 text-sm text-indigo-200 hover:bg-slate-800">
                            <FileText className="h-4 w-4 shrink-0" />
                            {syllabusDoc.title}
                            <ExternalLink className="ml-auto h-3 w-3" />
                          </a>
                        );
                      }
                      // Show unit breakdown from description as fallback
                      return (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 mb-3">Unit breakdown for {selected.code}</p>
                          {/* Generate a visual unit list based on course code */}
                          <UnitBreakdown code={selected.code} />
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Timetable ── */}
                {activeTab === "timetable" && (
                  <div>
                    <SectionTitle icon={Clock} label="Class Schedule" color="text-yellow-300" />
                    <TimetableView course={selected} />
                  </div>
                )}

                {/* ── Materials / Resources ── */}
                {activeTab === "materials" && (
                  <div className="space-y-5">
                    {videos.length > 0 && (
                      <div>
                        <SectionTitle icon={Video} label="YouTube Channels & Playlists" color="text-red-300" />
                        <div className="space-y-1.5">
                          {videos.map((m) => (
                            <a key={m.id} href={m.resourceUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-2.5 text-sm text-red-200 hover:bg-slate-800 transition-colors">
                              <span className="text-base">🎬</span>
                              <span className="flex-1 text-xs">{m.title.replace("🎬 ", "")}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {books.length > 0 && (
                      <div>
                        <SectionTitle icon={BookMarked} label="Reference Books" color="text-amber-300" />
                        <div className="space-y-1.5">
                          {books.map((m) => (
                            <a key={m.id} href={m.resourceUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-2.5 text-sm text-amber-200 hover:bg-slate-800 transition-colors">
                              <span className="text-base">📚</span>
                              <span className="flex-1 text-xs">{m.title.replace("📚 ", "")}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {links.length > 0 && (
                      <div>
                        <SectionTitle icon={ExternalLink} label="Other Resources" color="text-indigo-300" />
                        <div className="space-y-1.5">
                          {links.map((m) => (
                            <a key={m.id} href={m.resourceUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg bg-slate-800/60 p-2.5 text-sm text-indigo-200 hover:bg-slate-800 transition-colors">
                              <span>{materialIcon(m.materialType)}</span>
                              <span className="flex-1 text-xs">{m.title}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.materials.length === 0 && (
                      <p className="text-sm text-slate-500">No materials uploaded yet.</p>
                    )}

                    {/* Staff: add material */}
                    {isStaff && (
                      <form className="mt-4 space-y-2 border-t border-slate-800 pt-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void createAcademicMaterial(selected.id, material)
                            .then(() => getAcademicCourse(selected.id))
                            .then(setSelected)
                            .then(() => setMaterial({ title: "", resourceUrl: "", materialType: "LINK" }))
                            .catch((cause) => setError(cause instanceof Error ? cause.message : "Failed"));
                        }}>
                        <p className="text-xs text-slate-400 font-medium">Add material</p>
                        <input required placeholder="Title" value={material.title}
                          onChange={(e) => setMaterial({ ...material, title: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                        <input required type="url" placeholder="https://..." value={material.resourceUrl}
                          onChange={(e) => setMaterial({ ...material, resourceUrl: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                        <select value={material.materialType}
                          onChange={(e) => setMaterial({ ...material, materialType: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white">
                          <option value="LINK">🔗 Link</option>
                          <option value="VIDEO">🎬 YouTube</option>
                          <option value="BOOK">📚 Reference Book</option>
                        </select>
                        <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                          Add Resource
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* ── Assignments ── */}
                {activeTab === "assignments" && (
                  <div className="space-y-3">
                    {selected.assignments.length === 0 ? (
                      <p className="text-sm text-slate-500">No assignments posted yet.</p>
                    ) : (
                      selected.assignments.map((asgn) => (
                        <AssignmentCard
                          key={asgn.id}
                          assignment={asgn}
                          isStaff={isStaff}
                          submissionText={submissions[asgn.id] ?? ""}
                          isSubmitted={submitted.includes(asgn.id)}
                          onTextChange={(text) => setSubmissions((s) => ({ ...s, [asgn.id]: text }))}
                          onSubmit={async () => {
                            const content = (submissions[asgn.id] ?? "").trim();
                            if (!content) return;
                            try {
                              await submitAcademicAssignment(asgn.id, content);
                              setSubmitted((s) => [...s, asgn.id]);
                              setSubmissions((s) => ({ ...s, [asgn.id]: "" }));
                            } catch (cause) {
                              setError(cause instanceof Error ? cause.message : "Submission failed.");
                            }
                          }}
                        />
                      ))
                    )}

                    {/* Staff: add assignment */}
                    {isStaff && (
                      <form className="mt-4 space-y-2 border-t border-slate-800 pt-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void createAcademicAssignment(selected.id, {
                            ...assignment,
                            dueAt: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : undefined,
                          })
                            .then(() => getAcademicCourse(selected.id))
                            .then(setSelected)
                            .then(() => setAssignment({ title: "", instructions: "", dueAt: "" }))
                            .catch((cause) => setError(cause instanceof Error ? cause.message : "Failed"));
                        }}>
                        <p className="text-xs text-slate-400 font-medium">Create assignment</p>
                        <input required placeholder="Title" value={assignment.title}
                          onChange={(e) => setAssignment({ ...assignment, title: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                        <textarea required rows={3} placeholder="Instructions"
                          value={assignment.instructions}
                          onChange={(e) => setAssignment({ ...assignment, instructions: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                        <input type="datetime-local" value={assignment.dueAt}
                          onChange={(e) => setAssignment({ ...assignment, dueAt: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                        <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                          Post Assignment
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* ── Chat ── */}
                {activeTab === "chat" && (
                  <div className="flex flex-col gap-3">
                    <SectionTitle icon={MessageSquare} label="Course Discussion" color="text-green-300" />
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {discussion.length === 0 ? (
                        <p className="text-sm text-slate-500">No messages yet. Start the conversation!</p>
                      ) : (
                        discussion.map((post) => {
                          const isMe = post.authorName === user?.name;
                          return (
                            <div key={post.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${isMe ? "bg-indigo-600 text-white rounded-br-sm" : "bg-slate-800 text-slate-200 rounded-bl-sm"}`}>
                                {!isMe && <p className="text-xs text-slate-400 mb-0.5">{post.authorName}</p>}
                                <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                                <p className={`text-xs mt-1 ${isMe ? "text-indigo-200" : "text-slate-500"}`}>
                                  {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={(e) => void postMessage(e)} className="flex gap-2 border-t border-slate-800 pt-3">
                      <input
                        value={postText}
                        onChange={(e) => setPostText(e.target.value)}
                        maxLength={2000}
                        placeholder="Ask a question or share a note…"
                        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!postText.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* ── Announcements ── */}
                {activeTab === "announcements" && (
                  <div>
                    <SectionTitle icon={Bell} label="Course Announcements" color="text-amber-300" />
                    {courseNotices.length === 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">No course-specific announcements. Showing general notices:</p>
                        {notices.slice(0, 5).map((n) => (
                          <div key={n.id} className="rounded-lg bg-slate-800/60 p-3">
                            <p className="text-sm text-slate-200">{n.body}</p>
                            <p className="mt-1 text-xs text-slate-500">{n.title}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      courseNotices.map((n) => (
                        <div key={n.id} className="mb-2 rounded-lg bg-amber-900/20 border border-amber-900/30 p-3">
                          <p className="text-sm text-amber-100">{n.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            </Card>
          )}

          {/* Staff: create course */}
          {isStaff && (
            <Card>
              <h2 className="mb-3 font-semibold text-white">Create New Course</h2>
              <form className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!user) return;
                  void createAcademicCourse({ ...newCourse, facultyId: user.userId })
                    .then(() => { setNewCourse({ code: "", title: "", term: "" }); return refresh(); })
                    .catch((cause) => setError(cause instanceof Error ? cause.message : "Course creation failed."));
                }}>
                <input required placeholder="Course code (e.g. CSE701)" value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                <input required placeholder="Course title" value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                <input required placeholder="Term (e.g. 2026-27 Semester 2)" value={newCourse.term}
                  onChange={(e) => setNewCourse({ ...newCourse, term: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white" />
                <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                  Create Course
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function AssignmentCard({
  assignment, isStaff, submissionText, isSubmitted, onTextChange, onSubmit,
}: {
  assignment: AcademicAssignment;
  isStaff: boolean;
  submissionText: string;
  isSubmitted: boolean;
  onTextChange: (t: string) => void;
  onSubmit: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const dueDate = assignment.dueAt ? new Date(assignment.dueAt) : null;
  const isOverdue = dueDate && dueDate < new Date();

  return (
    <div className="rounded-xl border border-slate-800 p-3 bg-slate-800/40">
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-200">{assignment.title}</p>
          {dueDate && (
            <p className={`mt-0.5 text-xs ${isOverdue ? "text-rose-400" : "text-slate-500"}`}>
              {isOverdue ? "⚠️ Overdue · " : "📅 Due "}
              {dueDate.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              {" · "}{assignment.maxScore} pts
            </p>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
          <p className="text-xs text-slate-400 whitespace-pre-wrap">{assignment.instructions}</p>
          {!isStaff && (
            <>
              {isSubmitted && (
                <p className="text-xs text-emerald-400">✅ Submitted! You can update your submission below.</p>
              )}
              <textarea
                value={submissionText}
                onChange={(e) => onTextChange(e.target.value)}
                maxLength={30000}
                rows={3}
                placeholder="Write your submission here…"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white"
              />
              <button
                onClick={() => void onSubmit()}
                disabled={!submissionText.trim()}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                {isSubmitted ? "Update Submission" : "Submit Assignment"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const UNIT_DATA: Record<string, string[]> = {
  CSE601: ["Introduction to ML & Types of Learning", "Regression — Linear, Polynomial, Ridge, Lasso", "Classification — Logistic, Naive Bayes, KNN, Decision Trees", "Support Vector Machines & Kernel Trick", "Neural Networks & Backpropagation", "Unsupervised Learning — K-Means, PCA, Autoencoders", "Ensemble Methods — Random Forest, XGBoost, Boosting", "Model Evaluation & Bias-Variance Tradeoff"],
  CNT501: ["Introduction & OSI vs TCP/IP Model", "Physical & Data Link Layer — Ethernet, Wi-Fi", "Network Layer — IPv4/IPv6, Subnetting, Routing", "Routing Protocols — RIP, OSPF, BGP", "Transport Layer — TCP, UDP, Congestion Control", "Application Layer — DNS, HTTP, SMTP, REST", "Network Security — TLS, VPN, Firewalls", "Campus Networks — SDN, VLANs, Monitoring"],
  CSE602: ["Asymptotic Notation & Master Theorem", "Divide & Conquer — Merge Sort, Quick Sort", "Greedy Algorithms — Huffman, Dijkstra, Prim", "Dynamic Programming — LCS, Knapsack, Matrix Chain", "Graph Algorithms — BFS, DFS, Topological Sort", "Backtracking & Branch and Bound", "NP-Completeness — P vs NP, Reductions", "Advanced — Amortized Analysis, Approximation"],
  CSE603: ["Cloud Fundamentals — IaaS, PaaS, SaaS", "Virtualization — VMs, Docker, Containers", "Container Orchestration — Kubernetes, Helm", "AWS Core — EC2, S3, RDS, Lambda, IAM", "GCP & Azure Core Services", "Serverless Computing & Event-Driven Architecture", "Cloud Storage & NoSQL Databases", "Cloud Security & CI/CD Pipelines"],
  CSE604: ["Arrays & Strings — Two Pointers, Sliding Window", "Linked Lists — Reversal, Cycle Detection, Merge", "Stacks & Queues — Monotonic Stack, LRU Cache", "Trees — BST, AVL, Segment Trees, Tries", "Heaps — Heap Sort, Top-K, Median of Stream", "Hashing — Hash Tables, Bloom Filters", "Graphs — BFS/DFS, Shortest Paths, Union-Find", "Advanced — Bit Manipulation, Interview Patterns"],
  CSE605: ["OOP Fundamentals — Encapsulation, Abstraction", "Inheritance & Polymorphism — Method Overriding", "Interfaces & Abstract Classes", "Creational Design Patterns — Singleton, Factory, Builder", "Behavioral Patterns — Observer, Strategy, Command", "SOLID Principles — SRP, OCP, LSP, ISP, DIP", "Exception Handling & Generics", "UML Diagrams & Clean Code Practices"],
  CSE606: ["Database Fundamentals & DBMS Architecture", "ER Modeling & ER to Relational Mapping", "Relational Algebra & Relational Calculus", "SQL — DDL, DML, Joins, Subqueries, Window Functions", "Normalization — 1NF through BCNF", "Transactions — ACID, Concurrency Control, 2PL", "Indexing — B+ Trees, Query Optimization", "NoSQL — MongoDB, Redis, CAP Theorem"],
  CSE607: ["Amortized Analysis & Complexity Review", "Advanced Trees — Red-Black, B-Trees, Splay", "Segment Trees & BIT with Lazy Propagation", "Suffix Arrays & String Algorithms", "Persistent Data Structures", "Skip Lists & Treaps", "Spatial Data Structures — KD-Trees, R-Trees", "Practical Applications & System Design"],
};

function UnitBreakdown({ code }: { code: string }) {
  const units = UNIT_DATA[code] ?? [];
  if (units.length === 0) return <p className="text-sm text-slate-500">Syllabus not available yet.</p>;
  return (
    <div className="space-y-1.5">
      {units.map((unit, i) => (
        <div key={i} className="flex gap-2 rounded-lg bg-slate-800/60 p-2.5">
          <span className="shrink-0 font-mono text-xs text-indigo-400">U{i + 1}</span>
          <span className="text-xs text-slate-300">{unit}</span>
        </div>
      ))}
    </div>
  );
}

function TimetableView({ course }: { course: CourseDetail }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SCHEDULE_DATA: Record<string, Record<string, string>> = {
    CSE601: { Mon: "09:00–10:00 (AB-301)", Wed: "09:00–10:00 (AB-301)", Fri: "09:00–10:00 (AB-301)", Thu: "14:00–17:00 Lab (ML-Lab-01)" },
    CNT501: { Mon: "10:00–11:30 (AB-204)", Wed: "10:00–11:30 (AB-204)", Tue: "13:00–16:00 Lab (AB-B01)" },
    CSE602: { Tue: "11:00–12:30 (SJT-401)", Thu: "11:00–12:30 (SJT-401)", Sat: "09:00–10:00 Tutorial (SJT-305)" },
    CSE603: { Mon: "11:00–12:00 (SJT-519)", Wed: "11:00–12:00 (SJT-519)", Fri: "11:00–12:00 (SJT-519)", Thu: "09:00–12:00 Lab (TT-B02)" },
    CSE604: { Tue: "09:00–10:30 (MB-101)", Thu: "09:00–10:30 (MB-101)", Wed: "14:00–17:00 Lab (MB-204)" },
    CSE605: { Mon: "13:00–14:00 (AB-105)", Wed: "13:00–14:00 (AB-105)", Fri: "13:00–14:00 (AB-105)", Tue: "10:00–13:00 Lab (AB-204)" },
    CSE606: { Tue: "14:00–15:30 (TT-101)", Thu: "14:00–15:30 (TT-101)", Mon: "14:00–17:00 Lab (TT-B01)" },
    CSE607: { Fri: "09:00–12:00 (Lab-02)", Sat: "10:00–11:00 Theory (MB-101)" },
  };
  const schedule = SCHEDULE_DATA[course.code] ?? {};
  const hasData = Object.keys(schedule).length > 0;

  if (!hasData) {
    return (
      <div className="rounded-lg bg-slate-800/60 p-3">
        <p className="text-sm text-slate-300">{course.schedule || "Schedule not set."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {days.map((day) => schedule[day] ? (
        <div key={day} className="flex gap-3 rounded-lg bg-slate-800/60 p-2.5 items-center">
          <span className="w-8 shrink-0 font-semibold text-xs text-indigo-300">{day}</span>
          <span className="text-xs text-slate-300">{schedule[day]}</span>
        </div>
      ) : null)}
    </div>
  );
}
