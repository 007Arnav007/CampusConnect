package com.campusconnect.config;

import java.sql.Timestamp;
import java.util.UUID;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(100)
public class AcademicDemoBootstrap implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    public AcademicDemoBootstrap(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        UUID facultyId = jdbc.query("""
                SELECT id FROM users
                WHERE roles LIKE '%ADMIN%' OR roles LIKE '%STAFF%'
                ORDER BY created_at LIMIT 1
                """, result -> result.next() ? result.getObject(1, UUID.class) : null);
        if (facultyId == null) return;

        Timestamp now = new Timestamp(System.currentTimeMillis());
        insertCourse("60000000-0000-4000-8000-000000000001", "CNT501", "Computer Networks",
                "Foundations of network architecture, protocols, routing, transport, and campus network operations.", 4, facultyId, now);
        insertCourse("60000000-0000-4000-8000-000000000002", "CSE502", "Database Systems",
                "Relational modeling, SQL, transactions, indexing, and reliable application data access.", 4, facultyId, now);
        insertCourse("60000000-0000-4000-8000-000000000003", "CSE503", "Web Application Engineering",
                "Frontend design, APIs, authentication, testing, and deployment.", 3, facultyId, now);

        insertSection("61000000-0000-4000-8000-000000000001", "60000000-0000-4000-8000-000000000001",
                "2026-27 Semester 1", "AB-204", "Monday and Wednesday, 10:00–11:30", 60, now);
        insertSection("61000000-0000-4000-8000-000000000002", "60000000-0000-4000-8000-000000000002",
                "2026-27 Semester 1", "AB-305", "Tuesday and Thursday, 13:30–15:00", 60, now);
        insertSection("61000000-0000-4000-8000-000000000003", "60000000-0000-4000-8000-000000000003",
                "2026-27 Semester 1", "Lab-02", "Friday, 09:00–12:00", 45, now);

        jdbc.update("""
                INSERT INTO academic_notices(id, course_id, author_id, title, body, published_at)
                VALUES (?, NULL, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, UUID.fromString("62000000-0000-4000-8000-000000000001"), facultyId,
                "Welcome to the academic workspace",
                "Course sections, materials, assignments, and discussions are now available through CampusConnect.", now);
    }

    private void insertCourse(String id, String code, String title, String description, int credits, UUID facultyId, Timestamp now) {
        jdbc.update("""
                INSERT INTO academic_courses(id, code, title, description, department, credits, faculty_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'Computer Science', ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, UUID.fromString(id), code, title, description, credits, facultyId, now, now);
    }

    private void insertSection(String id, String courseId, String term, String room, String schedule, int capacity, Timestamp now) {
        jdbc.update("""
                INSERT INTO academic_sections(id, course_id, term, room, schedule, capacity, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """, UUID.fromString(id), UUID.fromString(courseId), term, room, schedule, capacity, now);
    }
}
