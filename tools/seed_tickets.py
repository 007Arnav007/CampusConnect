"""
CampusConnect v2 - Realistic Ticket Seeder
Seeds 5 realistic student support tickets with messages and status updates.
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
        "Set BOOTSTRAP_ADMIN_PASSWORD in your environment (or source .env) before running this seeder."
    )

_student_pw = os.environ.get("STUDENT_SEED_PASSWORD", "")
if not _student_pw:
    raise RuntimeError(
        "Set STUDENT_SEED_PASSWORD in your environment before running this seeder."
    )

STUDENTS = [
    {"name": "Priya Patel",    "email": "priya.patel@example.edu",  "password": _student_pw},
    {"name": "Arjun Kumar",    "email": "arjun.kumar@example.edu",   "password": _student_pw},
    {"name": "Rohit Sharma",   "email": "rohit.sharma@example.edu",  "password": _student_pw},
    {"name": "Neha Gupta",     "email": "neha.gupta@example.edu",    "password": _student_pw},
    {"name": "Suresh V",       "email": "suresh.v@example.edu",      "password": _student_pw},
]

TICKETS = [
    {
        "student_idx": 0,  # Priya
        "ticket": {
            "title": "Wi-Fi not working in AB2 block since yesterday",
            "description": "The Wi-Fi connection in Academic Block 2 (AB2) has been down since yesterday evening around 6 PM. I'm unable to connect to the campus network on any of my devices — tried my laptop and phone. The issue is on all floors of AB2, not just my classroom. I have an assignment submission due tomorrow and need internet access urgently.",
            "category": "IT_NETWORK",
            "priority": "HIGH",
            "location": "Academic Block 2 (AB2), 3rd Floor"
        },
        "messages": [
            {"role": "student", "body": "Still no Wi-Fi in AB2. Can someone please look into this ASAP? Assignment deadline is tomorrow morning."},
            {"role": "admin",   "body": "Hello Priya, we've received your ticket. Our network team has been notified and will inspect the access points in AB2. We expect to resolve this within 4–6 hours. As a temporary workaround, you can use the Wi-Fi in the library (AB1 ground floor). We apologize for the inconvenience."},
            {"role": "student", "body": "Thank you! I'll head to the library. Please do fix it soon, it's happening repeatedly in AB2."},
            {"role": "admin",   "body": "Understood. We've identified a faulty router on the 2nd floor AP cluster. Replacement is being done now. Wi-Fi should be restored in AB2 within the hour."},
        ],
        "final_status": "IN_PROGRESS",
    },
    {
        "student_idx": 1,  # Arjun
        "ticket": {
            "title": "Grade entry error in MAT2001 — wrong internal marks",
            "description": "My internal marks for MAT2001 (Probability and Statistics) show 18/50 on the portal, but I scored 34/50 in CAT-1. I have the corrected answer sheet and the invigilator's signature as proof. This is affecting my CGPA calculation for scholarship eligibility. Please correct this at the earliest.",
            "category": "ACADEMIC",
            "priority": "HIGH",
            "location": "TTH 101 — Examination Cell, Admin Block"
        },
        "messages": [
            {"role": "student", "body": "Attaching proof of my corrected marks. I scored 34/50 not 18/50. Please verify with the faculty-in-charge."},
            {"role": "admin",   "body": "Hi Arjun, we have escalated this to the MAT2001 course coordinator Prof. Ramakrishnan. We will verify the marks entry and get back to you within 2 working days."},
            {"role": "student", "body": "Thank you. Please note my scholarship application deadline is Nov 20th, so it needs to be corrected before that."},
            {"role": "admin",   "body": "Noted. We've confirmed the error with Prof. Ramakrishnan. The marks have been corrected to 34/50 in the system. The updated marks will reflect on the portal within 24 hours. Apologies for the error."},
        ],
        "final_status": "RESOLVED",
    },
    {
        "student_idx": 2,  # Rohit
        "ticket": {
            "title": "Hostel room AC unit leaking water — Room 412, Visvesvaraya Block",
            "description": "The air conditioner in my hostel room (Room 412, Visvesvaraya Block) has been leaking water since last week. Water drips onto my study table and has damaged some of my textbooks. I reported this to the hostel warden verbally but nothing has happened. The room smells musty now. Requesting urgent maintenance.",
            "category": "HOSTEL",
            "priority": "MEDIUM",
            "location": "Visvesvaraya Hostel Block, Room 412"
        },
        "messages": [
            {"role": "student", "body": "The leak has gotten worse. Now water is dripping every few minutes. Please send maintenance today."},
            {"role": "admin",   "body": "Hello Rohit, we sincerely apologize. The hostel maintenance team has been assigned to your room. They will visit between 2–4 PM today. Please ensure someone is present to let them in."},
            {"role": "student", "body": "They came and fixed it. The drain pipe was clogged. Thank you for the quick response!"},
            {"role": "admin",   "body": "Great to hear! The AC unit has been serviced and the condensate drain cleared. We've noted your room for a follow-up inspection next week. Please let us know if the issue recurs. Closing this ticket."},
        ],
        "final_status": "RESOLVED",
    },
    {
        "student_idx": 3,  # Neha
        "ticket": {
            "title": "Scholarship fee reimbursement not credited — still pending after 3 months",
            "description": "I am a Merit-cum-Means scholarship awardee for the academic year 2025–26. The scholarship amount of ₹45,000 was supposed to be credited to my account by August 2025 as per the finance office communication. It is now November and I haven't received anything. My student ID is 22BCE1234. I've submitted all required documents (income certificate, bonafide, bank details) in June. This is causing me financial hardship.",
            "category": "FINANCE",
            "priority": "HIGH",
            "location": "Finance & Accounts Office, Admin Block Ground Floor"
        },
        "messages": [
            {"role": "student", "body": "I've visited the finance office twice and they say it's pending approval from the central accounts team. Can you check the status?"},
            {"role": "admin",   "body": "Hi Neha, we've looked into your case. Your file is with the university accounts department. We'll escalate this directly to the accounts officer and update you by EOD tomorrow."},
        ],
        "final_status": "OPEN",
    },
    {
        "student_idx": 4,  # Suresh
        "ticket": {
            "title": "Projector in SJT 519 not working — affecting lab sessions",
            "description": "The projector in classroom SJT 519 (5th floor, Spencer & Johnson Tower) has not been working for the past 10 days. It powers on but displays 'No Signal'. Faculty teaching our Data Structures lab (CSE2001) have been struggling without it. We have 30 students in the batch and the board is not sufficient for coding demonstrations. Please repair or replace the projector urgently.",
            "category": "FACILITIES",
            "priority": "MEDIUM",
            "location": "SJT Block, Room 519, 5th Floor"
        },
        "messages": [
            {"role": "student", "body": "Still not fixed. We had another lab session today and the faculty had to use a personal laptop connected to a small TV. This is really affecting the quality of learning."},
            {"role": "admin",   "body": "Hello Suresh, thank you for flagging this. We've raised a maintenance request with the AV equipment team. A technician will visit SJT 519 tomorrow morning before 9 AM to diagnose the issue. We'll keep you posted."},
        ],
        "final_status": "OPEN",
    },
]


def api(method, path, data=None, token=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  HTTP {e.code} on {method} {path}: {err_body[:300]}")
        return None


def login(email, password):
    result = api("POST", "/auth/login", {"email": email, "password": password})
    if result and "token" in result:
        return result["token"]
    return None


def register_or_login(student):
    token = None
    result = api("POST", "/auth/register", {
        "name": student["name"],
        "email": student["email"],
        "password": student["password"],
        "role": "STUDENT"
    })
    if result and "token" in result:
        print(f"  Registered: {student['email']}")
        token = result["token"]
    else:
        token = login(student["email"], student["password"])
        if token:
            print(f"  Logged in (already exists): {student['email']}")
        else:
            print(f"  FAILED to register/login: {student['email']}")
    return token


def main():
    print("=== CampusConnect Ticket Seeder ===\n")

    # Admin login
    print("[1/3] Logging in as admin...")
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print("FATAL: Admin login failed. Check credentials and gateway.")
        return
    print(f"  Admin token: {admin_token[:20]}...\n")

    # Student logins
    print("[2/3] Registering/logging in students...")
    student_tokens = []
    for s in STUDENTS:
        tok = register_or_login(s)
        student_tokens.append(tok)
        time.sleep(0.3)
    print()

    # Create tickets
    print("[3/3] Creating tickets, messages, and updating statuses...")
    for i, td in enumerate(TICKETS, 1):
        sidx = td["student_idx"]
        s_token = student_tokens[sidx]
        s_name = STUDENTS[sidx]["name"]

        if not s_token:
            print(f"  Ticket {i}: SKIPPED (no token for {s_name})")
            continue

        # Create ticket
        print(f"\n  Ticket {i}: '{td['ticket']['title'][:55]}...' [{s_name}]")
        ticket_resp = api("POST", "/tickets", td["ticket"], token=s_token)
        if not ticket_resp:
            print(f"    FAILED to create ticket {i}")
            continue

        ticket_id = ticket_resp.get("id") or ticket_resp.get("ticketId")
        if not ticket_id:
            print(f"    No ID in response: {str(ticket_resp)[:200]}")
            continue
        print(f"    Created ticket ID: {ticket_id}")

        # Add messages
        for msg in td["messages"]:
            if msg["role"] == "student":
                tok = s_token
                sender = s_name
            else:
                tok = admin_token
                sender = "Admin"
            result = api("POST", f"/tickets/{ticket_id}/messages", {"body": msg["body"]}, token=tok)
            if result:
                print(f"    Message [{sender}]: OK")
            else:
                print(f"    Message [{sender}]: FAILED")
            time.sleep(0.2)

        # Update status
        final = td["final_status"]
        if final != "OPEN":
            result = api("PATCH", f"/tickets/{ticket_id}", {"status": final}, token=admin_token)
            if result:
                print(f"    Status → {final}: OK")
            else:
                print(f"    Status → {final}: FAILED")
        else:
            print(f"    Status: OPEN (no update needed)")

        time.sleep(0.3)

    print("\n=== Seeding complete! ===")
    print("Visit http://localhost:5173 to see the tickets.")


if __name__ == "__main__":
    main()
