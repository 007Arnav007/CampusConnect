package com.campusconnect.controller;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.campusconnect.dto.AcademicDtos;
import com.campusconnect.entity.Role;
import com.campusconnect.entity.User;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/academics")
public class AcademicController {
    private final JdbcTemplate jdbc;

    public AcademicController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** JdbcTemplate cannot map java.time.Instant for PostgreSQL; always bind Timestamp values. */
    private static Timestamp ts(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    @GetMapping("/courses")
    public List<Map<String, Object>> courses(Authentication auth) {
        User user = currentUser(auth);
        return jdbc.queryForList("""
                SELECT c.id, c.code, c.title, c.description, c.department, c.credits,
                       c.faculty_id AS "facultyId", u.name AS "facultyName", s.id AS "sectionId",
                       s.term, s.room, s.schedule, s.capacity,
                       (SELECT COUNT(*) FROM academic_enrollments e WHERE e.section_id=s.id AND e.status='ACTIVE') AS enrolled
                FROM academic_courses c JOIN users u ON u.id=c.faculty_id
                LEFT JOIN academic_sections s ON s.course_id=c.id
                WHERE c.active=true ORDER BY c.code, s.term DESC
                """);
    }

    @GetMapping("/courses/{courseId}")
    public Map<String, Object> course(@PathVariable UUID courseId) {
        return jdbc.query("""
                SELECT c.id, c.code, c.title, c.description, c.department, c.credits,
                       c.faculty_id AS "facultyId", u.name AS "facultyName"
                FROM academic_courses c JOIN users u ON u.id=c.faculty_id WHERE c.id=?
                """, rs -> {
            if (!rs.next()) throw new IllegalArgumentException("Course not found");
            return Map.of(
                    "id", rs.getObject("id", UUID.class), "code", rs.getString("code"),
                    "title", rs.getString("title"), "description", value(rs.getString("description")),
                    "department", value(rs.getString("department")), "credits", rs.getInt("credits"),
                    "facultyId", rs.getObject("facultyId", UUID.class), "facultyName", rs.getString("facultyName"),
                    "materials", jdbc.queryForList("SELECT id,title,description,resource_url AS \"resourceUrl\",material_type AS \"materialType\",created_at AS \"createdAt\" FROM academic_materials WHERE course_id=? ORDER BY created_at DESC", courseId),
                    "assignments", jdbc.queryForList("SELECT id,title,instructions,due_at AS \"dueAt\",max_score AS \"maxScore\",created_at AS \"createdAt\" FROM academic_assignments WHERE course_id=? ORDER BY due_at NULLS LAST", courseId)
            );
        }, courseId);
    }

    @Transactional
    @PostMapping("/courses")
    public Map<String, Object> createCourse(Authentication auth, @Valid @RequestBody AcademicDtos.CourseRequest request) {
        requireStaff(auth);
        String facultyRoles = jdbc.query("SELECT roles FROM users WHERE id=?", rs -> rs.next() ? rs.getString(1) : null, request.facultyId());
        if (facultyRoles == null || !(facultyRoles.contains("STAFF") || facultyRoles.contains("ADMIN"))) {
            throw new IllegalArgumentException("Faculty must be an existing staff or admin account");
        }
        UUID courseId = UUID.randomUUID(), sectionId = UUID.randomUUID();
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("INSERT INTO academic_courses(id,code,title,description,department,credits,faculty_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
                courseId, request.code().trim().toUpperCase(), request.title().trim(), request.description(), request.department(),
                request.credits() == null ? 3 : request.credits(), request.facultyId(), now, now);
        jdbc.update("INSERT INTO academic_sections(id,course_id,term,room,schedule,capacity,created_at) VALUES(?,?,?,?,?,?,?)",
                sectionId, courseId, request.term().trim(), request.room(), request.schedule(), request.capacity() == null ? 60 : request.capacity(), now);
        return Map.of("id", courseId, "sectionId", sectionId, "code", request.code().trim().toUpperCase(), "createdAt", now.toInstant());
    }

    @Transactional
    @PostMapping("/sections/{sectionId}/enroll")
    public Map<String, Object> enroll(Authentication auth, @PathVariable UUID sectionId) {
        User user = currentUser(auth);
        if (!user.getRoles().contains(Role.STUDENT)) throw new AccessDeniedException("Only students can enroll");
        Integer capacity = jdbc.queryForObject("SELECT capacity FROM academic_sections WHERE id=? FOR UPDATE", Integer.class, sectionId);
        if (capacity == null) throw new IllegalArgumentException("Section not found");
        Integer enrolled = jdbc.queryForObject("SELECT COUNT(*) FROM academic_enrollments WHERE section_id=? AND status='ACTIVE'", Integer.class, sectionId);
        if (enrolled != null && enrolled >= capacity) throw new IllegalStateException("Section is full");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO academic_enrollments(id,section_id,student_id,enrolled_at) VALUES(?,?,?,?) ON CONFLICT(section_id,student_id) DO UPDATE SET status='ACTIVE'", id, sectionId, user.getId(), ts(Instant.now()));
        return Map.of("sectionId", sectionId, "studentId", user.getId(), "status", "ACTIVE");
    }

    @DeleteMapping("/sections/{sectionId}/enroll")
    public Map<String, Object> unenroll(Authentication auth, @PathVariable UUID sectionId) {
        User user = currentUser(auth);
        jdbc.update("UPDATE academic_enrollments SET status='DROPPED' WHERE section_id=? AND student_id=?", sectionId, user.getId());
        return Map.of("sectionId", sectionId, "status", "DROPPED");
    }

    @GetMapping("/my-enrollments")
    public List<Map<String, Object>> myEnrollments(Authentication auth) {
        User user = currentUser(auth);
        return jdbc.queryForList("""
                SELECT e.id,e.status,e.enrolled_at AS "enrolledAt",s.id AS "sectionId",s.term,s.room,s.schedule,
                       c.id AS "courseId",c.code,c.title,u.name AS "facultyName"
                FROM academic_enrollments e JOIN academic_sections s ON s.id=e.section_id
                JOIN academic_courses c ON c.id=s.course_id JOIN users u ON u.id=c.faculty_id
                WHERE e.student_id=? ORDER BY e.enrolled_at DESC
                """, user.getId());
    }

    @PostMapping("/courses/{courseId}/materials")
    public Map<String, Object> addMaterial(Authentication auth, @PathVariable UUID courseId, @Valid @RequestBody AcademicDtos.MaterialRequest request) {
        User user = currentUser(auth);
        requireTeacher(auth, courseId);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO academic_materials(id,course_id,uploaded_by,title,description,resource_url,material_type,created_at) VALUES(?,?,?,?,?,?,?,?)",
                id, courseId, user.getId(), request.title().trim(), request.description(), safeUrl(request.resourceUrl()),
                request.materialType() == null ? "LINK" : request.materialType().trim().toUpperCase(), ts(Instant.now()));
        return Map.of("id", id, "courseId", courseId, "title", request.title());
    }

    @PostMapping("/courses/{courseId}/assignments")
    public Map<String, Object> addAssignment(Authentication auth, @PathVariable UUID courseId, @Valid @RequestBody AcademicDtos.AssignmentRequest request) {
        User user = currentUser(auth);
        requireTeacher(auth, courseId);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO academic_assignments(id,course_id,title,instructions,due_at,max_score,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)",
                id, courseId, request.title().trim(), request.instructions().trim(), ts(request.dueAt()),
                request.maxScore() == null ? BigDecimal.valueOf(100) : request.maxScore(), user.getId(), ts(Instant.now()));
        return Map.of("id", id, "courseId", courseId, "title", request.title(), "dueAt", request.dueAt() == null ? "" : request.dueAt());
    }

    @PostMapping("/assignments/{assignmentId}/submit")
    public Map<String, Object> submit(Authentication auth, @PathVariable UUID assignmentId, @Valid @RequestBody AcademicDtos.SubmissionRequest request) {
        User user = currentUser(auth);
        UUID courseId = jdbc.query("SELECT course_id FROM academic_assignments WHERE id=?", rs -> rs.next() ? rs.getObject(1, UUID.class) : null, assignmentId);
        if (courseId == null || !isEnrolled(user.getId(), courseId)) throw new AccessDeniedException("You must be enrolled to submit");
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO academic_submissions(id,assignment_id,student_id,content,attachment_url,submitted_at)
                VALUES(?,?,?,?,?,?) ON CONFLICT(assignment_id,student_id)
                DO UPDATE SET content=EXCLUDED.content,attachment_url=EXCLUDED.attachment_url,submitted_at=EXCLUDED.submitted_at
                """, id, assignmentId, user.getId(), request.content().trim(), request.attachmentUrl() == null ? null : safeUrl(request.attachmentUrl()), ts(Instant.now()));
        return Map.of("id", id, "assignmentId", assignmentId, "status", "SUBMITTED");
    }

    @GetMapping("/assignments/{assignmentId}/submissions")
    public List<Map<String, Object>> submissions(Authentication auth, @PathVariable UUID assignmentId) {
        UUID courseId = courseForAssignment(assignmentId);
        requireTeacher(auth, courseId);
        return jdbc.queryForList("""
                SELECT s.id,s.student_id AS "studentId",u.name AS "studentName",s.content,s.attachment_url AS "attachmentUrl",
                       s.score,s.feedback,s.submitted_at AS "submittedAt",s.graded_at AS "gradedAt"
                FROM academic_submissions s JOIN users u ON u.id=s.student_id WHERE s.assignment_id=? ORDER BY s.submitted_at DESC
                """, assignmentId);
    }

    @PatchMapping("/submissions/{submissionId}/grade")
    public Map<String, Object> grade(Authentication auth, @PathVariable UUID submissionId, @Valid @RequestBody AcademicDtos.GradeRequest request) {
        Map<String, Object> record = jdbc.query("""
                SELECT a.course_id AS course_id,a.max_score AS max_score
                FROM academic_submissions s JOIN academic_assignments a ON a.id=s.assignment_id WHERE s.id=?
                """, rs -> rs.next() ? Map.of("courseId", rs.getObject("course_id", UUID.class), "maxScore", rs.getBigDecimal("max_score")) : null, submissionId);
        if (record == null) throw new IllegalArgumentException("Submission not found");
        UUID courseId = (UUID) record.get("courseId");
        requireTeacher(auth, courseId);
        if (request.score().signum() < 0 || request.score().compareTo((BigDecimal) record.get("maxScore")) > 0) {
            throw new IllegalArgumentException("Score must be between zero and the assignment maximum");
        }
        jdbc.update("UPDATE academic_submissions SET score=?,feedback=?,graded_at=? WHERE id=?", request.score(), request.feedback(), ts(Instant.now()), submissionId);
        return Map.of("id", submissionId, "score", request.score(), "feedback", request.feedback() == null ? "" : request.feedback());
    }

    @GetMapping("/courses/{courseId}/discussions")
    public List<Map<String, Object>> discussions(@PathVariable UUID courseId) {
        return jdbc.queryForList("""
                SELECT d.id,d.parent_id AS "parentId",d.author_id AS "authorId",u.name AS "authorName",d.body,d.created_at AS "createdAt"
                FROM academic_discussions d JOIN users u ON u.id=d.author_id WHERE d.course_id=? AND d.hidden=false ORDER BY d.created_at
                """, courseId);
    }

    @PostMapping("/courses/{courseId}/discussions")
    public Map<String, Object> addDiscussion(Authentication auth, @PathVariable UUID courseId, @Valid @RequestBody AcademicDtos.DiscussionRequest request) {
        User user = currentUser(auth);
        if (!isEnrolled(user.getId(), courseId) && !isTeacher(user.getId(), courseId)) throw new AccessDeniedException("Course access is required");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO academic_discussions(id,course_id,author_id,parent_id,body,created_at) VALUES(?,?,?,?,?,?)",
                id, courseId, user.getId(), request.parentId(), request.body().trim(), ts(Instant.now()));
        return Map.of("id", id, "courseId", courseId, "authorId", user.getId(), "body", request.body());
    }

    @PatchMapping("/discussions/{discussionId}/moderate")
    public Map<String, Object> moderateDiscussion(Authentication auth, @PathVariable UUID discussionId, @RequestBody Map<String, Boolean> request) {
        requireStaff(auth);
        Boolean hidden = request.get("hidden");
        if (hidden == null) throw new IllegalArgumentException("hidden is required");
        jdbc.update("UPDATE academic_discussions SET hidden=? WHERE id=?", hidden, discussionId);
        return Map.of("id", discussionId, "hidden", hidden);
    }

    @GetMapping("/discussions/moderation")
    public List<Map<String, Object>> discussionsForModeration(Authentication auth) {
        requireStaff(auth);
        return jdbc.queryForList("""
                SELECT d.id,d.course_id AS "courseId",c.code,d.author_id AS "authorId",u.name AS "authorName",
                       d.body,d.hidden,d.created_at AS "createdAt"
                FROM academic_discussions d JOIN academic_courses c ON c.id=d.course_id
                JOIN users u ON u.id=d.author_id ORDER BY d.created_at DESC LIMIT 300
                """);
    }

    @PostMapping({"/notices", "/courses/{courseId}/notices"})
    public Map<String, Object> notice(Authentication auth, @PathVariable(required = false) UUID courseId, @Valid @RequestBody AcademicDtos.NoticeRequest request) {
        User user = currentUser(auth);
        if (courseId != null) requireTeacher(auth, courseId); else requireStaff(auth);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO academic_notices(id,course_id,author_id,title,body,published_at,expires_at) VALUES(?,?,?,?,?,?,?)",
                id, courseId, user.getId(), request.title().trim(), request.body().trim(), ts(Instant.now()), ts(request.expiresAt()));
        return Map.of("id", id, "courseId", courseId == null ? "" : courseId, "title", request.title());
    }

    @GetMapping("/notices")
    public List<Map<String, Object>> notices() {
        return jdbc.queryForList("""
                SELECT n.id,n.course_id AS "courseId",c.code,c.title AS "courseTitle",n.title,n.body,n.published_at AS "publishedAt",n.expires_at AS "expiresAt"
                FROM academic_notices n LEFT JOIN academic_courses c ON c.id=n.course_id
                WHERE n.expires_at IS NULL OR n.expires_at>NOW() ORDER BY n.published_at DESC LIMIT 100
                """);
    }

    @PostMapping({"/documents", "/courses/{courseId}/documents"})
    public Map<String, Object> addDocument(Authentication auth, @PathVariable(required = false) UUID courseId, @Valid @RequestBody AcademicDtos.RagDocumentRequest request) {
        User user = currentUser(auth);
        if (courseId != null) requireTeacher(auth, courseId); else requireStaff(auth);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO academic_rag_documents(id,course_id,title,content,source_url,approved,updated_at) VALUES(?,?,?,?,?,?,?)",
                id, courseId, request.title().trim(), request.content().trim(), request.sourceUrl(), false, ts(Instant.now()));
        return Map.of("id", id, "approved", false);
    }

    @PatchMapping("/documents/{documentId}/approve")
    public Map<String, Object> approveDocument(Authentication auth, @PathVariable UUID documentId) {
        requireStaff(auth);
        jdbc.update("UPDATE academic_rag_documents SET approved=true,updated_at=? WHERE id=?", ts(Instant.now()), documentId);
        return Map.of("id", documentId, "approved", true);
    }

    @GetMapping("/documents/pending")
    public List<Map<String, Object>> pendingDocuments(Authentication auth) {
        requireStaff(auth);
        return jdbc.queryForList("""
                SELECT d.id,d.course_id AS "courseId",c.code,d.title,d.content,d.source_url AS "sourceUrl",d.updated_at AS "updatedAt"
                FROM academic_rag_documents d LEFT JOIN academic_courses c ON c.id=d.course_id
                WHERE d.approved=false ORDER BY d.updated_at DESC LIMIT 200
                """);
    }

    @GetMapping("/search")
    public List<Map<String, Object>> search(Authentication auth, @RequestParam String q) {
        String query = q.trim().toLowerCase();
        User user = currentUser(auth);
        return jdbc.queryForList("""
                SELECT id,course_id AS "courseId",title,content,source_url AS "sourceUrl",updated_at AS "updatedAt"
                FROM academic_rag_documents d WHERE approved=true
                  AND (course_id IS NULL OR EXISTS (
                    SELECT 1 FROM academic_courses c WHERE c.id=d.course_id AND c.faculty_id=?
                    UNION ALL
                    SELECT 1 FROM academic_enrollments e JOIN academic_sections s ON s.id=e.section_id
                    WHERE s.course_id=d.course_id AND e.student_id=? AND e.status='ACTIVE'
                  ))
                  AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
                ORDER BY updated_at DESC LIMIT 20
                """, user.getId(), user.getId(), "%" + query + "%", "%" + query + "%");
    }

    private UUID courseForAssignment(UUID assignmentId) {
        UUID id = jdbc.query("SELECT course_id FROM academic_assignments WHERE id=?", rs -> rs.next() ? rs.getObject(1, UUID.class) : null, assignmentId);
        if (id == null) throw new IllegalArgumentException("Assignment not found");
        return id;
    }

    private boolean isEnrolled(UUID studentId, UUID courseId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM academic_enrollments e JOIN academic_sections s ON s.id=e.section_id
                WHERE e.student_id=? AND s.course_id=? AND e.status='ACTIVE'
                """, Integer.class, studentId, courseId);
        return count != null && count > 0;
    }

    private boolean isTeacher(UUID userId, UUID courseId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM academic_courses WHERE id=? AND faculty_id=?", Integer.class, courseId, userId);
        return count != null && count > 0;
    }

    private void requireTeacher(Authentication auth, UUID courseId) {
        User user = currentUser(auth);
        if (user.getRoles().contains(Role.STAFF) || user.getRoles().contains(Role.ADMIN)) return;
        if (!isTeacher(user.getId(), courseId)) throw new AccessDeniedException("Faculty access is required");
    }

    private void requireStaff(Authentication auth) {
        User user = currentUser(auth);
        if (!user.getRoles().contains(Role.STAFF) && !user.getRoles().contains(Role.ADMIN)) {
            throw new AccessDeniedException("Staff access is required");
        }
    }

    private User currentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User user)) throw new AccessDeniedException("Authentication is required");
        return user;
    }

    private static String value(String input) { return input == null ? "" : input; }

    private static String safeUrl(String input) {
        String value = input.trim();
        if (!(value.startsWith("https://") || value.startsWith("http://"))) {
            throw new IllegalArgumentException("Resource links must use HTTP or HTTPS");
        }
        return value;
    }
}
