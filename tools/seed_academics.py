"""
CampusConnect v2 - Enhanced Academics Seeder
Seeds 8 subjects with full details: syllabus, timetable, YouTube channels,
reference books, materials, assignments, announcements, and discussions.
"""

import urllib.request
import urllib.error
import json
import os
import time

BASE = "http://127.0.0.1:3001/api/v1"
ADMIN_EMAIL = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "admin@example.edu")
ADMIN_PASSWORD = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
if not ADMIN_PASSWORD:
    raise RuntimeError(
        "Set BOOTSTRAP_ADMIN_PASSWORD in your environment (or source .env) before running this seeder. "
        "Never hardcode credentials in source files."
    )

def api(method, path, data=None, token=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  HTTP {e.code} on {method} {path}: {err[:200]}")
        return None

def login(email, password):
    r = api("POST", "/auth/login", {"email": email, "password": password})
    return r["token"] if r and "token" in r else None

SUBJECTS = [
    {
        "code": "CSE601", "title": "Machine Learning", "department": "Computer Science",
        "description": "Supervised and unsupervised learning, neural networks, SVMs, decision trees, model evaluation, and real-world ML pipelines.",
        "credits": 4, "term": "2026-27 Semester 2",
        "room": "AB-301", "schedule": "Monday, Wednesday, Friday — 09:00–10:00", "capacity": 60,
        "syllabus": """Unit 1: Introduction to ML — Types of learning, hypothesis space, PAC learning
Unit 2: Regression — Linear, polynomial, ridge, lasso regression; gradient descent
Unit 3: Classification — Logistic regression, Naive Bayes, KNN, decision trees
Unit 4: SVMs — Kernel trick, soft margin, SVM for multi-class classification
Unit 5: Neural Networks — Perceptron, MLP, backpropagation, activation functions
Unit 6: Unsupervised Learning — K-Means, hierarchical clustering, PCA, autoencoders
Unit 7: Ensemble Methods — Bagging, boosting, random forests, XGBoost
Unit 8: Model Evaluation — Cross-validation, ROC-AUC, precision-recall, bias-variance tradeoff""",
        "timetable": "MON 09:00–10:00 (AB-301) | WED 09:00–10:00 (AB-301) | FRI 09:00–10:00 (AB-301)\nLab: THU 14:00–17:00 (ML-Lab-01)",
        "youtube_channels": [
            {"title": "StatQuest with Josh Starmer — ML Fundamentals Playlist", "resourceUrl": "https://www.youtube.com/playlist?list=PLblh5JKOoLUICTaGLRoHQDuF_7q2GfuJF"},
            {"title": "3Blue1Brown — Neural Networks Series", "resourceUrl": "https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi"},
            {"title": "Sentdex — Practical Machine Learning with Python", "resourceUrl": "https://www.youtube.com/playlist?list=PLQVvvaa0QuDfKTOs3Keq_kaG2P55YRn5v"},
            {"title": "Andrew Ng — ML Specialization (Coursera YouTube)", "resourceUrl": "https://www.youtube.com/@AndrewNg"},
        ],
        "ref_books": [
            {"title": "Pattern Recognition and Machine Learning — Christopher Bishop (Free PDF)", "resourceUrl": "https://www.microsoft.com/en-us/research/uploads/prod/2006/01/Bishop-Pattern-Recognition-and-Machine-Learning-2006.pdf"},
            {"title": "Hands-On Machine Learning — Aurélien Géron (O'Reilly)", "resourceUrl": "https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/"},
            {"title": "The Elements of Statistical Learning — Hastie, Tibshirani, Friedman (Free PDF)", "resourceUrl": "https://hastie.su.domains/ElemStatLearn/printings/ESLII_print12_toc.pdf"},
            {"title": "Deep Learning — Goodfellow, Bengio, Courville (Free Online)", "resourceUrl": "https://www.deeplearningbook.org/"},
        ],
        "announcements": [
            "📢 CAT-1 syllabus: Units 1–3. Date: Nov 25. Exam is closed-book.",
            "🧪 ML Lab Assignment 1 uploaded — implement linear regression from scratch using NumPy. Due: Nov 20.",
            "📌 Guest lecture by Dr. Priya Ramesh (Google Brain) on 'Transformers in Production' — Nov 18, 3 PM, Seminar Hall.",
        ],
        "discussions": [
            "Can someone explain the difference between L1 and L2 regularization intuitively?",
            "What's the best way to handle class imbalance in classification problems?",
            "Is XGBoost always better than Random Forest? When would you prefer one over the other?",
        ],
        "assignments": [
            {"title": "Assignment 1: Linear Regression from Scratch", "instructions": "Implement linear regression using only NumPy (no sklearn). Train on the Boston Housing dataset. Report MSE, RMSE, R² score. Plot predicted vs actual values. Submit as a Jupyter notebook (.ipynb).", "dueAt": "2026-11-20T23:59:00"},
            {"title": "Assignment 2: Classification Comparison", "instructions": "Compare KNN, Naive Bayes, and Decision Tree classifiers on the Iris dataset. Tune hyperparameters using GridSearchCV. Report accuracy, confusion matrix, and F1-score for each. Which model performs best and why?", "dueAt": "2026-12-05T23:59:00"},
        ],
    },
    {
        "code": "CNT501", "title": "Computer Networks & Telecommunications", "department": "Computer Science",
        "description": "Foundations of network architecture, OSI and TCP/IP models, routing protocols, transport layer, network security, and campus network operations.",
        "credits": 4, "term": "2026-27 Semester 2",
        "room": "AB-204", "schedule": "Monday, Wednesday — 10:00–11:30", "capacity": 60,
        "syllabus": """Unit 1: Introduction — Network types, topologies, OSI vs TCP/IP model, protocol layers
Unit 2: Physical & Data Link Layer — Encoding, framing, error detection, MAC protocols, Ethernet, Wi-Fi
Unit 3: Network Layer — IPv4/IPv6 addressing, subnetting, CIDR, ARP, ICMP
Unit 4: Routing — Static vs dynamic routing, RIP, OSPF, BGP, routing tables
Unit 5: Transport Layer — TCP vs UDP, flow control, congestion control, 3-way handshake
Unit 6: Application Layer — DNS, HTTP/HTTPS, SMTP, FTP, DHCP, REST APIs
Unit 7: Network Security — Firewalls, VPNs, TLS/SSL, public key cryptography, common attacks
Unit 8: Campus Networks — SDN, VLANs, Wi-Fi 6, network monitoring, Wireshark""",
        "timetable": "MON 10:00–11:30 (AB-204) | WED 10:00–11:30 (AB-204)\nLab: TUE 13:00–16:00 (Networks Lab, AB-B01)",
        "youtube_channels": [
            {"title": "NetworkChuck — Networking & CCNA Fundamentals", "resourceUrl": "https://www.youtube.com/@NetworkChuck"},
            {"title": "PowerCert Animated Videos — Networking Concepts", "resourceUrl": "https://www.youtube.com/@PowerCertAnimatedVideos"},
            {"title": "Sunny Classroom — Computer Networks Lectures", "resourceUrl": "https://www.youtube.com/@sunnyclassroom24"},
            {"title": "David Bombal — Packet Tracer & Wireshark", "resourceUrl": "https://www.youtube.com/@davidbombal"},
        ],
        "ref_books": [
            {"title": "Computer Networks — Andrew S. Tanenbaum & David Wetherall (5th Ed)", "resourceUrl": "https://www.pearson.com/en-us/subject-catalog/p/computer-networks/P200000003364"},
            {"title": "Computer Networking: A Top-Down Approach — Kurose & Ross (8th Ed)", "resourceUrl": "https://gaia.cs.umass.edu/kurose_ross/index.php"},
            {"title": "TCP/IP Illustrated Vol. 1 — W. Richard Stevens", "resourceUrl": "https://www.informit.com/store/tcp-ip-illustrated-volume-1-the-protocols-9780321336316"},
            {"title": "Data Communications and Networking — Forouzan (5th Ed)", "resourceUrl": "https://www.mheducation.com/highered/product/data-communications-networking-forouzan/M9780073376226.html"},
        ],
        "announcements": [
            "📢 CAT-1 covers Units 1–3. Focus on subnetting — expect numerical problems.",
            "🔬 Lab Experiment 3: Wireshark packet capture — capture and analyze HTTP vs HTTPS traffic. Lab report due next week.",
            "📌 Wireshark cheat sheet uploaded to materials. Use it for lab reference.",
        ],
        "discussions": [
            "In 3-way handshake, why does the client send an ACK at the end? What happens without it?",
            "Can someone explain CIDR notation with a practical subnetting example?",
            "What's the difference between a router and a Layer 3 switch?",
        ],
        "assignments": [
            {"title": "Assignment 1: Subnetting & IP Addressing", "instructions": "Given the network 192.168.10.0/24, divide it into 6 equal subnets. For each subnet: provide network address, broadcast address, valid host range, and subnet mask. Show all working.", "dueAt": "2026-11-22T23:59:00"},
            {"title": "Assignment 2: Wireshark Analysis", "instructions": "Capture network traffic on your machine for 5 minutes while browsing normally. Identify and explain: 1) A complete TCP 3-way handshake, 2) A DNS query and response, 3) An HTTP GET request. Submit pcap file + analysis report.", "dueAt": "2026-12-08T23:59:00"},
        ],
    },
    {
        "code": "CSE602", "title": "Design and Analysis of Algorithms", "department": "Computer Science",
        "description": "Algorithm design paradigms, complexity analysis, graph algorithms, dynamic programming, NP-completeness, and approximation algorithms.",
        "credits": 4, "term": "2026-27 Semester 2",
        "room": "SJT-401", "schedule": "Tuesday, Thursday — 11:00–12:30", "capacity": 65,
        "syllabus": """Unit 1: Foundations — Asymptotic notation (O, Ω, Θ), recurrence relations, Master theorem
Unit 2: Divide & Conquer — Merge sort, quick sort, binary search, Strassen's matrix multiplication
Unit 3: Greedy Algorithms — Activity selection, Huffman coding, Kruskal, Prim, Dijkstra
Unit 4: Dynamic Programming — Memoization vs tabulation, LCS, LIS, knapsack, matrix chain multiplication
Unit 5: Graph Algorithms — BFS, DFS, topological sort, SCC, Bellman-Ford, Floyd-Warshall
Unit 6: Backtracking & Branch & Bound — N-Queens, subset sum, TSP branch & bound
Unit 7: NP-Completeness — P vs NP, NP-hard, NP-complete, polynomial reductions, SAT, Clique, Vertex Cover
Unit 8: Advanced Topics — Amortized analysis, approximation algorithms, randomized algorithms""",
        "timetable": "TUE 11:00–12:30 (SJT-401) | THU 11:00–12:30 (SJT-401)\nTutorial: SAT 09:00–10:00 (SJT-305)",
        "youtube_channels": [
            {"title": "Abdul Bari — Algorithms (Best for DAA)", "resourceUrl": "https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O"},
            {"title": "MIT OpenCourseWare — Introduction to Algorithms 6.006", "resourceUrl": "https://www.youtube.com/playlist?list=PLUl4u3cNGP63EdVPNLG3ToM6LaEUuStEY"},
            {"title": "Errichto — Competitive Programming & Algorithms", "resourceUrl": "https://www.youtube.com/@Errichto"},
            {"title": "William Fiset — Graph Theory Algorithms", "resourceUrl": "https://www.youtube.com/playlist?list=PLDV1Zeh2NRsDGO4--qE8yH72HFL1Km93h"},
        ],
        "ref_books": [
            {"title": "Introduction to Algorithms (CLRS) — Cormen, Leiserson, Rivest, Stein (4th Ed)", "resourceUrl": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"},
            {"title": "Algorithm Design — Jon Kleinberg & Éva Tardos", "resourceUrl": "https://www.pearson.com/en-us/subject-catalog/p/algorithm-design/P200000003351"},
            {"title": "The Algorithm Design Manual — Steven Skiena (Free chapters online)", "resourceUrl": "https://www.algorist.com/"},
            {"title": "Algorithms — Robert Sedgewick & Kevin Wayne (Free online)", "resourceUrl": "https://algs4.cs.princeton.edu/home/"},
        ],
        "announcements": [
            "📢 CAT-1 syllabus: Units 1 & 2. Expect recurrence analysis (Master theorem) and sorting algorithm complexity proofs.",
            "⚠️ Assignment 1 deadline extended to Nov 23 due to lab exam clash.",
            "📌 DP problem set added to materials — solve at least 10 problems before Unit 4 class.",
        ],
        "discussions": [
            "When should I use dynamic programming vs greedy? Is there a systematic way to decide?",
            "Can you explain why the Master theorem doesn't apply to T(n) = 2T(n/2) + n log n?",
            "What's the most intuitive explanation for why the TSP is NP-hard?",
        ],
        "assignments": [
            {"title": "Assignment 1: Recurrence Analysis", "instructions": "Solve the following recurrences using the Master theorem (or substitution if Master theorem doesn't apply): T(n)=2T(n/2)+n, T(n)=4T(n/2)+n², T(n)=T(n-1)+n, T(n)=2T(n/2)+n·log(n). Show all steps clearly.", "dueAt": "2026-11-23T23:59:00"},
            {"title": "Assignment 2: Dynamic Programming Problems", "instructions": "Implement solutions for: 1) 0/1 Knapsack (bottom-up DP), 2) Longest Common Subsequence with traceback, 3) Matrix Chain Multiplication with parenthesization. For each: write pseudocode, implement in Python/Java, and analyze time and space complexity.", "dueAt": "2026-12-10T23:59:00"},
        ],
    },
    {
        "code": "CSE603", "title": "Cloud Computing", "department": "Computer Science",
        "description": "Cloud service models, virtualization, containerization, AWS/GCP/Azure services, serverless computing, cloud security, and deployment pipelines.",
        "credits": 3, "term": "2026-27 Semester 2",
        "room": "SJT-519", "schedule": "Monday, Wednesday, Friday — 11:00–12:00", "capacity": 55,
        "syllabus": """Unit 1: Cloud Fundamentals — IaaS, PaaS, SaaS, public/private/hybrid cloud, economics
Unit 2: Virtualization — Hypervisors (Type 1 & 2), VMs vs containers, Docker, namespaces, cgroups
Unit 3: Container Orchestration — Kubernetes: pods, deployments, services, ingress, Helm charts
Unit 4: AWS Core Services — EC2, S3, RDS, VPC, IAM, Lambda, CloudFormation
Unit 5: GCP & Azure — Google Cloud Run, BigQuery, Azure App Service, AKS
Unit 6: Serverless Computing — FaaS, AWS Lambda patterns, event-driven architecture, cold starts
Unit 7: Cloud Storage & Databases — Object storage, block storage, NoSQL (DynamoDB, Firestore), CDN
Unit 8: Cloud Security & DevOps — IAM best practices, secrets management, CI/CD pipelines, monitoring""",
        "timetable": "MON 11:00–12:00 (SJT-519) | WED 11:00–12:00 (SJT-519) | FRI 11:00–12:00 (SJT-519)\nLab: THU 09:00–12:00 (Cloud Lab, TT-B02)",
        "youtube_channels": [
            {"title": "TechWorld with Nana — Docker, Kubernetes, DevOps", "resourceUrl": "https://www.youtube.com/@TechWorldwithNana"},
            {"title": "FreeCodeCamp — AWS Certified Cloud Practitioner Full Course", "resourceUrl": "https://www.youtube.com/watch?v=SOTamWNgDKc"},
            {"title": "Fireship — Cloud concepts in 100 seconds (shorts playlist)", "resourceUrl": "https://www.youtube.com/@Fireship"},
            {"title": "Google Cloud Tech — Official GCP Channel", "resourceUrl": "https://www.youtube.com/@googlecloudtech"},
        ],
        "ref_books": [
            {"title": "Cloud Computing: Concepts, Technology & Architecture — Thomas Erl", "resourceUrl": "https://www.informit.com/store/cloud-computing-concepts-technology-and-architecture-9780133387520"},
            {"title": "Docker Deep Dive — Nigel Poulton (Free sample chapters)", "resourceUrl": "https://nigelpoulton.com/books/"},
            {"title": "Kubernetes in Action — Marko Luksa (Manning)", "resourceUrl": "https://www.manning.com/books/kubernetes-in-action-second-edition"},
            {"title": "AWS Documentation — Free official reference", "resourceUrl": "https://docs.aws.amazon.com/"},
        ],
        "announcements": [
            "📢 CAT-1 covers Units 1–2. Know the difference between VMs and containers thoroughly.",
            "🧪 Lab 2: Deploy a containerized Node.js app to AWS EC2 using Docker. Use free tier account. Lab report due in 2 weeks.",
            "🎁 Free AWS Educate accounts available — register at https://aws.amazon.com/education/awseducate/ using your college email.",
        ],
        "discussions": [
            "What's the actual difference between Docker Swarm and Kubernetes? When would you use Swarm?",
            "Is serverless always cheaper than keeping a VM running 24/7?",
            "Can someone explain VPC subnets and security groups with a simple example?",
        ],
        "assignments": [
            {"title": "Assignment 1: Docker Containerization", "instructions": "Containerize a simple Python Flask web app: 1) Write a Dockerfile, 2) Build the image, 3) Run with docker-compose (app + redis cache), 4) Push to Docker Hub. Submit: Dockerfile, docker-compose.yml, app code, screenshots, and DockerHub link.", "dueAt": "2026-11-25T23:59:00"},
            {"title": "Assignment 2: AWS Deployment", "instructions": "Deploy a full-stack app on AWS: host frontend on S3 (static website), backend on Lambda (via API Gateway), database on RDS free tier. Document architecture with a diagram. Include cost estimate using AWS Pricing Calculator.", "dueAt": "2026-12-12T23:59:00"},
        ],
    },
    {
        "code": "CSE604", "title": "Data Structures and Algorithms", "department": "Computer Science",
        "description": "Core data structures, algorithm efficiency, trees, heaps, graphs, hashing, and practical problem solving for competitive programming and interviews.",
        "credits": 4, "term": "2026-27 Semester 2",
        "room": "MB-101", "schedule": "Tuesday, Thursday — 09:00–10:30", "capacity": 70,
        "syllabus": """Unit 1: Arrays & Strings — Two pointers, sliding window, prefix sums, sorting tricks
Unit 2: Linked Lists — Singly, doubly, circular; reversal, cycle detection, merge operations
Unit 3: Stacks & Queues — Monotonic stack, deque, LRU cache using doubly linked list + hashmap
Unit 4: Trees — BST operations, AVL rotations, segment trees, Fenwick trees, tries
Unit 5: Heaps & Priority Queues — Min/max heap, heap sort, top-K problems, median of stream
Unit 6: Hashing — Hash tables, collision handling, consistent hashing, Bloom filters
Unit 7: Graphs — Representation, BFS/DFS applications, shortest paths, MST, union-find (DSU)
Unit 8: Advanced — Bit manipulation, number theory for CP, sliding window variants, interview patterns""",
        "timetable": "TUE 09:00–10:30 (MB-101) | THU 09:00–10:30 (MB-101)\nLab: WED 14:00–17:00 (Programming Lab, MB-204)",
        "youtube_channels": [
            {"title": "NeetCode — LeetCode problems explained (must-watch for interviews)", "resourceUrl": "https://www.youtube.com/@NeetCode"},
            {"title": "take U forward (Striver) — DSA Sheet full course", "resourceUrl": "https://www.youtube.com/@takeUforward"},
            {"title": "Back To Back SWE — Data Structures & Algorithms", "resourceUrl": "https://www.youtube.com/@BackToBackSWE"},
            {"title": "CS Dojo — Python Data Structures", "resourceUrl": "https://www.youtube.com/@CSDojo"},
        ],
        "ref_books": [
            {"title": "Data Structures and Algorithms in Python — Goodrich, Tamassia, Goldwasser", "resourceUrl": "https://www.wiley.com/en-us/Data+Structures+and+Algorithms+in+Python-p-9781118290279"},
            {"title": "Cracking the Coding Interview — Gayle Laakmann McDowell (6th Ed)", "resourceUrl": "http://www.crackingthecodinginterview.com/"},
            {"title": "LeetCode Patterns — Free community notes", "resourceUrl": "https://seanprashad.com/leetcode-patterns/"},
            {"title": "CP Algorithms — Free competitive programming reference", "resourceUrl": "https://cp-algorithms.com/"},
        ],
        "announcements": [
            "📢 CAT-1: Arrays, Strings, Linked Lists (Units 1–2). Practice at least 20 LeetCode problems in these topics.",
            "🏆 Intra-college DSA Contest on Nov 30 — register by Nov 25. Top 3 get bonus marks!",
            "📌 Striver's DSA Sheet link added to materials — follow this for complete preparation.",
        ],
        "discussions": [
            "Should I use recursion or iteration for tree traversals in interviews?",
            "What's the most efficient way to find the kth largest element in an unsorted array?",
            "Can someone explain DSU (Union-Find) with path compression intuitively?",
        ],
        "assignments": [
            {"title": "Assignment 1: Linked List Operations", "instructions": "Implement a doubly linked list from scratch with: insert_front, insert_rear, delete_node, reverse, detect_cycle (Floyd's algorithm), find_middle. Test with at least 5 test cases each. Language: Python or Java.", "dueAt": "2026-11-21T23:59:00"},
            {"title": "Assignment 2: Tree Problems", "instructions": "Solve: 1) Validate a BST, 2) Find LCA in a BST, 3) Level-order traversal (return as list of lists), 4) Serialize and deserialize a binary tree. Submit code + time/space complexity for each.", "dueAt": "2026-12-07T23:59:00"},
        ],
    },
    {
        "code": "CSE605", "title": "Object-Oriented Programming", "department": "Computer Science",
        "description": "OOP principles, design patterns, SOLID principles, Java/Python OOP, UML design, exception handling, generics, and clean code practices.",
        "credits": 3, "term": "2026-27 Semester 2",
        "room": "AB-105", "schedule": "Monday, Wednesday, Friday — 13:00–14:00", "capacity": 65,
        "syllabus": """Unit 1: OOP Fundamentals — Classes, objects, encapsulation, abstraction, access modifiers
Unit 2: Inheritance & Polymorphism — Single/multiple inheritance, method overriding, virtual dispatch
Unit 3: Interfaces & Abstract Classes — Interface vs abstract class, default methods, duck typing
Unit 4: Design Patterns — Creational (Singleton, Factory, Builder), Structural (Adapter, Decorator, Facade)
Unit 5: Behavioral Patterns — Observer, Strategy, Command, Iterator, Template Method
Unit 6: SOLID Principles — SRP, OCP, LSP, ISP, DIP with real-world examples
Unit 7: Exception Handling & Generics — Custom exceptions, checked vs unchecked, generic classes, wildcards
Unit 8: UML & Clean Code — Class diagrams, sequence diagrams, refactoring, code smells, TDD basics""",
        "timetable": "MON 13:00–14:00 (AB-105) | WED 13:00–14:00 (AB-105) | FRI 13:00–14:00 (AB-105)\nLab: TUE 10:00–13:00 (Java Lab, AB-204)",
        "youtube_channels": [
            {"title": "Coding with John — Java OOP Concepts", "resourceUrl": "https://www.youtube.com/@CodingWithJohn"},
            {"title": "Christopher Okhravi — Design Patterns in Object Oriented Programming", "resourceUrl": "https://www.youtube.com/playlist?list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc"},
            {"title": "Derek Banas — Design Patterns Tutorial", "resourceUrl": "https://www.youtube.com/@derekbanas"},
            {"title": "Mosh Hamedani — Java / Python OOP tutorials", "resourceUrl": "https://www.youtube.com/@programmingwithmosh"},
        ],
        "ref_books": [
            {"title": "Head First Design Patterns — Freeman & Robson (O'Reilly)", "resourceUrl": "https://www.oreilly.com/library/view/head-first-design/9781492077992/"},
            {"title": "Clean Code — Robert C. Martin (Uncle Bob)", "resourceUrl": "https://www.oreilly.com/library/view/clean-code-a/9780136083238/"},
            {"title": "Effective Java — Joshua Bloch (3rd Ed)", "resourceUrl": "https://www.oreilly.com/library/view/effective-java/9780134686097/"},
            {"title": "Design Patterns — Gang of Four (GoF)", "resourceUrl": "https://refactoring.guru/design-patterns/book"},
        ],
        "announcements": [
            "📢 CAT-1 syllabus: Units 1–3. Focus on the difference between interface and abstract class.",
            "💻 Lab 3: Implement the Observer pattern for a stock price notification system. Due next lab session.",
            "📌 Refactoring Guru website added to materials — excellent free resource for all design patterns with code examples.",
        ],
        "discussions": [
            "When should you use composition over inheritance? Can you give a real-world example?",
            "What's the difference between Factory Method and Abstract Factory pattern?",
            "Does SOLID apply to Python as much as Java? Python doesn't enforce interfaces the same way.",
        ],
        "assignments": [
            {"title": "Assignment 1: Library Management System", "instructions": "Design and implement a Library Management System using OOP: Classes: Book, Member, Librarian, Library, Transaction. Apply: encapsulation, inheritance (Member → Student, Faculty), polymorphism (different late-fee logic). Include: UML class diagram, full implementation in Java/Python, and test cases.", "dueAt": "2026-11-28T23:59:00"},
            {"title": "Assignment 2: Design Patterns Implementation", "instructions": "Implement 3 design patterns in a single cohesive application: 1) Singleton (config manager), 2) Observer (event notification system), 3) Strategy (payment processing with multiple strategies: UPI, card, net banking). Write unit tests for each pattern.", "dueAt": "2026-12-15T23:59:00"},
        ],
    },
    {
        "code": "CSE606", "title": "Database Management Systems", "department": "Computer Science",
        "description": "Relational databases, ER modeling, SQL, normalization, transactions, concurrency control, indexing, NoSQL databases, and query optimization.",
        "credits": 4, "term": "2026-27 Semester 2",
        "room": "TT-101", "schedule": "Tuesday, Thursday — 14:00–15:30", "capacity": 60,
        "syllabus": """Unit 1: Database Fundamentals — DBMS vs file system, data models, DB architecture, 3-tier schema
Unit 2: ER Modeling — Entities, relationships, attributes, cardinality, weak entities, ER to relational mapping
Unit 3: Relational Model — Relations, keys, relational algebra, tuple relational calculus
Unit 4: SQL — DDL, DML, DCL, joins (inner/outer/cross), subqueries, aggregate functions, window functions
Unit 5: Normalization — 1NF, 2NF, 3NF, BCNF, 4NF; functional dependencies, decomposition
Unit 6: Transactions & Concurrency — ACID properties, serializability, 2PL, timestamp ordering, deadlock handling
Unit 7: Indexing & Query Optimization — B+ trees, hash indexes, query execution plans, EXPLAIN, statistics
Unit 8: NoSQL & Advanced — MongoDB, Redis, Cassandra, CAP theorem, BASE properties, graph databases""",
        "timetable": "TUE 14:00–15:30 (TT-101) | THU 14:00–15:30 (TT-101)\nLab: MON 14:00–17:00 (DB Lab, TT-B01)",
        "youtube_channels": [
            {"title": "CMU Database Group — 15-445 Intro to Database Systems (CMU)", "resourceUrl": "https://www.youtube.com/playlist?list=PLSE8ODhjZXjbj8BMuIrRcacnQh20hmY9g"},
            {"title": "TechTFQ — Advanced SQL Queries & Concepts", "resourceUrl": "https://www.youtube.com/@techTFQ"},
            {"title": "Kudvenkat — SQL Server Tutorial", "resourceUrl": "https://www.youtube.com/@Csharp-video-tutorialsBlogspot"},
            {"title": "Caleb Curry — Database Design Tutorial", "resourceUrl": "https://www.youtube.com/@CalebCurry"},
        ],
        "ref_books": [
            {"title": "Database System Concepts — Silberschatz, Korth, Sudarshan (7th Ed)", "resourceUrl": "https://www.db-book.com/"},
            {"title": "Fundamentals of Database Systems — Elmasri & Navathe (7th Ed)", "resourceUrl": "https://www.pearson.com/en-us/subject-catalog/p/fundamentals-of-database-systems/P200000003393"},
            {"title": "Learning SQL — Alan Beaulieu (O'Reilly, free preview)", "resourceUrl": "https://www.oreilly.com/library/view/learning-sql-3rd/9781492057604/"},
            {"title": "PostgreSQL Documentation — Official free reference", "resourceUrl": "https://www.postgresql.org/docs/current/"},
        ],
        "announcements": [
            "📢 CAT-1 covers Units 1–3. Know how to draw ER diagrams and convert them to relational schemas.",
            "🔬 Lab 4: Write complex SQL queries on the hospital database — joins, subqueries, window functions. Lab report due next week.",
            "📌 SQLZoo and Mode Analytics SQL tutorial links added to materials for extra practice.",
        ],
        "discussions": [
            "What's the difference between WHERE and HAVING clause? Can you give a tricky example?",
            "When would you use a NoSQL database over a relational database?",
            "Can someone explain 3NF vs BCNF with a concrete example where they differ?",
        ],
        "assignments": [
            {"title": "Assignment 1: ER Design & SQL", "instructions": "Design an ER diagram for a Hospital Management System (patients, doctors, departments, appointments, prescriptions, rooms). Convert to relational schema with proper primary and foreign keys. Write SQL DDL for all tables. Insert at least 10 sample records per table. Write 10 SQL queries of varying complexity.", "dueAt": "2026-11-26T23:59:00"},
            {"title": "Assignment 2: Normalization & Transactions", "instructions": "Given the unnormalized relation: ENROLLMENT(StudentID, StudentName, CourseID, CourseName, FacultyID, FacultyName, Grade, EnrollDate). Normalize to BCNF, showing each step (1NF→2NF→3NF→BCNF). Then write a transaction with proper COMMIT/ROLLBACK for a fund transfer scenario. Explain how 2PL prevents the lost update problem.", "dueAt": "2026-12-14T23:59:00"},
        ],
    },
    {
        "code": "CSE607", "title": "Data Structures (Advanced)", "department": "Computer Science",
        "description": "Advanced data structures: segment trees, suffix arrays, persistent structures, skip lists, spatial indexing — for competitive programming and systems work.",
        "credits": 3, "term": "2026-27 Semester 2",
        "room": "Lab-02", "schedule": "Friday — 09:00–12:00", "capacity": 45,
        "syllabus": """Unit 1: Review & Complexity — Amortized analysis, potential method, aggregate analysis
Unit 2: Advanced Trees — Red-Black trees, B-Trees, Splay trees, 2-3 trees
Unit 3: Segment Trees & BIT — Point update/range query, lazy propagation, 2D segment trees
Unit 4: Suffix Structures — Suffix arrays, suffix trees, LCP arrays, string algorithms
Unit 5: Persistent & Functional DS — Persistent segment trees, functional queues, retroactive structures
Unit 6: Skip Lists & Probabilistic DS — Skip list implementation and analysis, treaps
Unit 7: Spatial DS — KD-trees, R-trees, quad trees, range trees for 2D queries
Unit 8: Practical Applications — System design interviews, cache-oblivious algorithms, real-world usage""",
        "timetable": "FRI 09:00–12:00 (Lab-02)\nExtra session: SAT 10:00–11:00 (MB-101) for theory",
        "youtube_channels": [
            {"title": "Errichto — Advanced competitive programming & DS", "resourceUrl": "https://www.youtube.com/@Errichto"},
            {"title": "Algorithms Live! — Advanced algorithm walkthroughs", "resourceUrl": "https://www.youtube.com/@AlgorithmsLive"},
            {"title": "USACO Guide — Codeforces EDU segment tree series", "resourceUrl": "https://codeforces.com/edu/course/2"},
            {"title": "William Fiset — Advanced Data Structures playlist", "resourceUrl": "https://www.youtube.com/playlist?list=PLDV1Zeh2NRsB6SWUrDFW2RmDotAfPbeHu"},
        ],
        "ref_books": [
            {"title": "Advanced Data Structures — Peter Brass (Cambridge)", "resourceUrl": "https://www.cambridge.org/core/books/advanced-data-structures/D56E2269D7CEE969A3B8105AD5B9254C"},
            {"title": "Competitive Programmer's Handbook — Antti Laaksonen (Free PDF)", "resourceUrl": "https://cses.fi/book/book.pdf"},
            {"title": "CLRS Chapter 13–19 (Advanced DS chapters) — Free MIT Press preview", "resourceUrl": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"},
            {"title": "CP Algorithms — Segment Trees reference", "resourceUrl": "https://cp-algorithms.com/data_structures/segment_tree.html"},
        ],
        "announcements": [
            "📢 First class: Review of basic trees and complexity. Bring your laptop — we code everything live.",
            "🏅 This course is preparation for ICPC and Google Code Jam. Regular participation is essential.",
            "📌 CSES Problem Set link added — solve all 'Data Structures' category problems as practice.",
        ],
        "discussions": [
            "What's the actual difference between a Segment Tree and a Fenwick Tree? When do you need lazy propagation?",
            "Has anyone implemented a persistent segment tree? I'm struggling with the versioning concept.",
            "Any tips for the CSES segment tree problems? I keep getting TLE.",
        ],
        "assignments": [
            {"title": "Assignment 1: Segment Tree Implementation", "instructions": "Implement a Segment Tree supporting: 1) Range sum query, 2) Range minimum query, 3) Range update with lazy propagation (range add + range query). Test with large inputs (n=10^6). Report time complexity for each operation.", "dueAt": "2026-11-29T23:59:00"},
            {"title": "Assignment 2: Competitive Problems", "instructions": "Solve these CSES problems and submit your solutions with explanations: 1) Range Sum Queries II (BIT), 2) Hotel Queries (segment tree), 3) Distinct Values Queries (offline + BIT). Submit code + approach explanation for each.", "dueAt": "2026-12-16T23:59:00"},
        ],
    },
]

def main():
    print("=== Enhanced Academics Seeder ===\n")

    print("[1] Admin login...")
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        print("FATAL: Admin login failed"); return
    print(f"  OK — token: {token[:20]}...\n")

    # Get admin user ID
    me = api("GET", "/auth/me", token=token)
    if not me:
        # Try alternative
        import base64, json as j
        parts = token.split('.')
        pad = parts[1] + '=='*4
        payload = j.loads(base64.urlsafe_b64decode(pad[:len(pad)-len(pad)%4]))
        faculty_id = payload.get("sub") or payload.get("userId")
    else:
        faculty_id = me.get("userId") or me.get("id")

    if not faculty_id:
        print("Could not determine admin user ID, trying fallback...")
        # Try tickets endpoint to get admin's userId
        tickets = api("GET", "/tickets?limit=1", token=token)
        print(f"  Trying to get faculty ID another way: {tickets}")
        return

    print(f"  Faculty ID: {faculty_id}\n")

    print("[2] Getting existing courses to avoid duplicates...")
    existing = api("GET", "/academics/courses", token=token) or []
    existing_codes = {c["code"] for c in existing}
    print(f"  Existing: {existing_codes}\n")

    print("[3] Creating subjects with full content...\n")
    for subj in SUBJECTS:
        code = subj["code"]
        if code in existing_codes:
            print(f"  [{code}] Already exists — skipping creation")
            # Find the existing course ID
            existing_course = next((c for c in existing if c["code"] == code), None)
            course_id = existing_course["id"] if existing_course else None
            section_id = existing_course.get("sectionId") if existing_course else None
        else:
            print(f"  [{code}] Creating: {subj['title']}")
            resp = api("POST", "/academics/courses", {
                "code": code, "title": subj["title"],
                "description": subj["description"],
                "department": subj["department"],
                "credits": subj["credits"],
                "facultyId": faculty_id,
                "term": subj["term"],
                "room": subj["room"],
                "schedule": subj["schedule"],
                "capacity": subj["capacity"],
            }, token=token)
            if not resp:
                print(f"    FAILED to create {code}"); continue
            course_id = str(resp["id"])
            section_id = str(resp["sectionId"])
            print(f"    Created — courseId: {course_id[:8]}... sectionId: {section_id[:8]}...")

        if not course_id:
            print(f"    No course_id for {code}, skipping materials"); continue

        # Add syllabus as a material (text note stored as a document link)
        print(f"    Adding syllabus & timetable...")
        # Store syllabus as an academic document (RAG)
        api("POST", f"/academics/courses/{course_id}/documents", {
            "title": f"Syllabus — {subj['title']}",
            "content": subj["syllabus"],
            "sourceUrl": "https://campusconnect.example.edu/syllabus"
        }, token=token)
        api("POST", f"/academics/courses/{course_id}/documents", {
            "title": f"Timetable — {subj['title']}",
            "content": subj["timetable"],
            "sourceUrl": "https://campusconnect.example.edu/timetable"
        }, token=token)
        time.sleep(0.2)

        # YouTube channels
        print(f"    Adding {len(subj['youtube_channels'])} YouTube channels...")
        for yt in subj["youtube_channels"]:
            api("POST", f"/academics/courses/{course_id}/materials", {
                "title": "🎬 " + yt["title"],
                "resourceUrl": yt["resourceUrl"],
                "materialType": "VIDEO",
                "description": "YouTube channel / playlist for this subject"
            }, token=token)
            time.sleep(0.1)

        # Reference books
        print(f"    Adding {len(subj['ref_books'])} reference books...")
        for book in subj["ref_books"]:
            api("POST", f"/academics/courses/{course_id}/materials", {
                "title": "📚 " + book["title"],
                "resourceUrl": book["resourceUrl"],
                "materialType": "BOOK",
                "description": "Reference book for this subject"
            }, token=token)
            time.sleep(0.1)

        # Assignments
        print(f"    Adding {len(subj['assignments'])} assignments...")
        for asgn in subj["assignments"]:
            api("POST", f"/academics/courses/{course_id}/assignments", {
                "title": asgn["title"],
                "instructions": asgn["instructions"],
                "dueAt": asgn["dueAt"],
                "maxScore": 100
            }, token=token)
            time.sleep(0.15)

        # Announcements as notices
        print(f"    Adding {len(subj['announcements'])} announcements...")
        for ann in subj["announcements"]:
            api("POST", "/academics/notices", {
                "title": f"[{code}] {subj['title']}",
                "body": ann,
            }, token=token)
            time.sleep(0.1)

        # Discussions
        print(f"    Adding {len(subj['discussions'])} discussion posts...")
        for disc in subj["discussions"]:
            api("POST", f"/academics/courses/{course_id}/discussions", {
                "body": disc,
            }, token=token)
            time.sleep(0.1)

        print(f"    ✅ {code} complete!\n")
        time.sleep(0.3)

    print("=== Seeding complete! ===")
    print("Visit http://localhost:5173/academics")

if __name__ == "__main__":
    main()
