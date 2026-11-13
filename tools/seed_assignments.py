"""Seed assignments for all 8 subjects — targeted fix after main seed."""
import urllib.request, json, os, time

BASE = "http://127.0.0.1:3001/api/v1"

_admin_email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@example.edu")
_admin_pw = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
if not _admin_pw:
    raise RuntimeError(
        "Set BOOTSTRAP_ADMIN_PASSWORD in your environment (or source .env) before running this seeder."
    )

def api(method, path, data=None, token=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:150]}")
        return None

def login(email, pw):
    r = api("POST", "/auth/login", {"email": email, "password": pw})
    return r["token"] if r and "token" in r else None

ASSIGNMENTS = {
    "CSE601": [
        {"title": "Assignment 1: Linear Regression from Scratch", "instructions": "Implement linear regression using only NumPy (no sklearn). Train on the Boston Housing dataset. Report MSE, RMSE, R² score. Plot predicted vs actual values. Submit as a Jupyter notebook (.ipynb).", "dueAt": "2026-11-20T23:59:00"},
        {"title": "Assignment 2: Classification Comparison", "instructions": "Compare KNN, Naive Bayes, and Decision Tree classifiers on the Iris dataset. Tune hyperparameters using GridSearchCV. Report accuracy, confusion matrix, and F1-score for each. Which model performs best and why?", "dueAt": "2026-12-05T23:59:00"},
    ],
    "CNT501": [
        {"title": "Assignment 1: Subnetting & IP Addressing", "instructions": "Given the network 192.168.10.0/24, divide it into 6 equal subnets. For each subnet: provide network address, broadcast address, valid host range, and subnet mask. Show all working.", "dueAt": "2026-11-22T23:59:00"},
        {"title": "Assignment 2: Wireshark Analysis", "instructions": "Capture network traffic on your machine for 5 minutes while browsing normally. Identify and explain: 1) A complete TCP 3-way handshake, 2) A DNS query and response, 3) An HTTP GET request. Submit pcap file + analysis report.", "dueAt": "2026-12-08T23:59:00"},
    ],
    "CSE602": [
        {"title": "Assignment 1: Recurrence Analysis", "instructions": "Solve the following recurrences using the Master theorem: T(n)=2T(n/2)+n, T(n)=4T(n/2)+n², T(n)=T(n-1)+n, T(n)=2T(n/2)+n·log(n). Show all steps clearly.", "dueAt": "2026-11-23T23:59:00"},
        {"title": "Assignment 2: Dynamic Programming Problems", "instructions": "Implement solutions for: 1) 0/1 Knapsack (bottom-up DP), 2) Longest Common Subsequence with traceback, 3) Matrix Chain Multiplication. For each: write pseudocode, implement in Python/Java, and analyze time and space complexity.", "dueAt": "2026-12-10T23:59:00"},
    ],
    "CSE603": [
        {"title": "Assignment 1: Docker Containerization", "instructions": "Containerize a simple Python Flask web app: 1) Write a Dockerfile, 2) Build the image, 3) Run with docker-compose (app + redis cache), 4) Push to Docker Hub. Submit: Dockerfile, docker-compose.yml, app code, screenshots, and DockerHub link.", "dueAt": "2026-11-25T23:59:00"},
        {"title": "Assignment 2: AWS Deployment", "instructions": "Deploy a full-stack app on AWS: host frontend on S3 (static website), backend on Lambda (via API Gateway), database on RDS free tier. Document architecture with a diagram. Include cost estimate using AWS Pricing Calculator.", "dueAt": "2026-12-12T23:59:00"},
    ],
    "CSE604": [
        {"title": "Assignment 1: Linked List Operations", "instructions": "Implement a doubly linked list from scratch with: insert_front, insert_rear, delete_node, reverse, detect_cycle (Floyd's algorithm), find_middle. Test with at least 5 test cases each. Language: Python or Java.", "dueAt": "2026-11-21T23:59:00"},
        {"title": "Assignment 2: Tree Problems", "instructions": "Solve: 1) Validate a BST, 2) Find LCA in a BST, 3) Level-order traversal (return as list of lists), 4) Serialize and deserialize a binary tree. Submit code + time/space complexity for each.", "dueAt": "2026-12-07T23:59:00"},
    ],
    "CSE605": [
        {"title": "Assignment 1: Library Management System (OOP)", "instructions": "Design and implement a Library Management System using OOP. Classes: Book, Member, Librarian, Library, Transaction. Apply: encapsulation, inheritance (Member → Student, Faculty), polymorphism (different late-fee logic). Include: UML class diagram + full implementation in Java/Python + test cases.", "dueAt": "2026-11-28T23:59:00"},
        {"title": "Assignment 2: Design Patterns Implementation", "instructions": "Implement 3 design patterns in a cohesive application: 1) Singleton (config manager), 2) Observer (event notification system), 3) Strategy (payment processing with UPI/card/net-banking strategies). Write unit tests for each pattern.", "dueAt": "2026-12-15T23:59:00"},
    ],
    "CSE606": [
        {"title": "Assignment 1: ER Design & SQL", "instructions": "Design an ER diagram for a Hospital Management System (patients, doctors, departments, appointments, prescriptions, rooms). Convert to relational schema. Write SQL DDL for all tables. Insert 10 sample records per table. Write 10 SQL queries of varying complexity.", "dueAt": "2026-11-26T23:59:00"},
        {"title": "Assignment 2: Normalization & Transactions", "instructions": "Given unnormalized relation: ENROLLMENT(StudentID, StudentName, CourseID, CourseName, FacultyID, FacultyName, Grade, EnrollDate). Normalize to BCNF, showing each step. Then write a transaction with COMMIT/ROLLBACK for a fund transfer scenario. Explain how 2PL prevents the lost update problem.", "dueAt": "2026-12-14T23:59:00"},
    ],
    "CSE607": [
        {"title": "Assignment 1: Segment Tree Implementation", "instructions": "Implement a Segment Tree supporting: 1) Range sum query, 2) Range minimum query, 3) Range update with lazy propagation (range add + range query). Test with large inputs (n=10^6). Report time complexity for each operation.", "dueAt": "2026-11-29T23:59:00"},
        {"title": "Assignment 2: CSES Competitive Problems", "instructions": "Solve these CSES problems and submit solutions with explanations: 1) Range Sum Queries II (BIT), 2) Hotel Queries (segment tree), 3) Distinct Values Queries (offline + BIT). Submit code + approach explanation for each.", "dueAt": "2026-12-16T23:59:00"},
    ],
}

tok = login(_admin_email, _admin_pw)
print(f"Admin token: {tok[:20]}...")

courses = api("GET", "/academics/courses", token=tok) or []
code_to_id = {c["code"]: c["id"] for c in courses}
print(f"Found courses: {list(code_to_id.keys())}")

for code, assignments in ASSIGNMENTS.items():
    course_id = code_to_id.get(code)
    if not course_id:
        print(f"  [{code}] Course not found, skipping"); continue
    print(f"\n  [{code}] Adding {len(assignments)} assignments...")
    for asgn in assignments:
        r = api("POST", f"/academics/courses/{course_id}/assignments", {
            "title": asgn["title"],
            "instructions": asgn["instructions"],
            "dueAt": asgn["dueAt"],
            "maxScore": 100
        }, token=tok)
        if r:
            print(f"    ✅ {asgn['title'][:50]}...")
        time.sleep(0.2)

# Also delete the test assignments we created
print("\nDone! Cleaning up test assignments...")
