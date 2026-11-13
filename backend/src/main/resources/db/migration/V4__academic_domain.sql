CREATE TABLE academic_courses (
    id UUID PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    department VARCHAR(120),
    credits INTEGER NOT NULL DEFAULT 1 CHECK (credits BETWEEN 1 AND 10),
    faculty_id UUID NOT NULL REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE academic_sections (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES academic_courses(id) ON DELETE CASCADE,
    term VARCHAR(40) NOT NULL,
    room VARCHAR(120),
    schedule VARCHAR(240),
    capacity INTEGER NOT NULL DEFAULT 60 CHECK (capacity > 0),
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE(course_id, term)
);

CREATE TABLE academic_enrollments (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES academic_sections(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    enrolled_at TIMESTAMPTZ NOT NULL,
    UNIQUE(section_id, student_id)
);

CREATE TABLE academic_materials (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES academic_courses(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(180) NOT NULL,
    description TEXT,
    resource_url VARCHAR(1000) NOT NULL,
    material_type VARCHAR(40) NOT NULL DEFAULT 'LINK',
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE academic_assignments (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES academic_courses(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    instructions TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    max_score NUMERIC(8,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE academic_submissions (
    id UUID PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES academic_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url VARCHAR(1000),
    score NUMERIC(8,2),
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL,
    graded_at TIMESTAMPTZ,
    UNIQUE(assignment_id, student_id)
);

CREATE TABLE academic_discussions (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES academic_courses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES academic_discussions(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE academic_notices (
    id UUID PRIMARY KEY,
    course_id UUID REFERENCES academic_courses(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ
);

CREATE TABLE academic_rag_documents (
    id UUID PRIMARY KEY,
    course_id UUID REFERENCES academic_courses(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    content TEXT NOT NULL,
    source_url VARCHAR(1000),
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_academic_enrollments_student ON academic_enrollments(student_id);
CREATE INDEX idx_academic_materials_course ON academic_materials(course_id);
CREATE INDEX idx_academic_assignments_course ON academic_assignments(course_id);
CREATE INDEX idx_academic_discussions_course ON academic_discussions(course_id, created_at);
CREATE INDEX idx_academic_notices_published ON academic_notices(published_at);
CREATE INDEX idx_academic_rag_approved ON academic_rag_documents(approved, course_id);
