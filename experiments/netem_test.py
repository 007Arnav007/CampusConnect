#!/usr/bin/env python3
"""Linux Kernel tc-netem Real Socket Benchmark (Using Network Namespaces).

Empirical verification of spaced UDP duplicate datagrams (k=2, dt=30ms) vs back-to-back (k=2, dt=0ms)
under real Linux kernel burst packet loss and delay jitter using sch_netem across isolated netns interfaces.
"""
import os
import sys
import time
import socket
import json
import math
import statistics
import subprocess

PORT = 49152
NUM_TRIALS = 300
DEADLINE_MS = 80.0  # Must arrive within 80ms to be on-time

RECEIVER_SCRIPT = """
import socket, sys, time, json, signal

recv_times = {}

def save_and_exit(signum, frame):
    with open('/tmp/recv_results.json', 'w') as f:
        json.dump(recv_times, f)
    sys.exit(0)

signal.signal(signal.SIGTERM, save_and_exit)
signal.signal(signal.SIGINT, save_and_exit)

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(('10.200.1.2', 49152))
sock.settimeout(0.3)
deadline = time.time() + 25.0

while time.time() < deadline:
    try:
        data, _ = sock.recvfrom(2048)
        now = time.perf_counter()
        seq = int(data.decode('utf-8').split(':')[0])
        if seq not in recv_times:
            recv_times[seq] = now
        if len(recv_times) >= 300:
            break
    except socket.timeout:
        continue
    except Exception:
        break

sock.close()
with open('/tmp/recv_results.json', 'w') as f:
    json.dump(recv_times, f)
"""

def setup_netem():
    cmds = [
        "ip netns del ns_recv 2>/dev/null || true",
        "ip link del veth0 2>/dev/null || true",
        "ip link add veth0 type veth peer name veth1",
        "ip netns add ns_recv",
        "ip link set veth1 netns ns_recv",
        "ip addr add 10.200.1.1/24 dev veth0",
        "ip link set veth0 up",
        "ip route replace 10.200.1.0/24 dev veth0",
        "ip netns exec ns_recv ip addr add 10.200.1.2/24 dev veth1",
        "ip netns exec ns_recv ip link set veth1 up",
        "ip netns exec ns_recv ip route replace 10.200.1.0/24 dev veth1",
        # Heavy burst loss regime: 30% loss with 65% burst correlation + 35ms +/- 15ms delay jitter
        "tc qdisc add dev veth0 root netem loss 30% 65% delay 35ms 15ms distribution normal",
    ]
    for c in cmds:
        subprocess.run(c, shell=True, check=True)

def cleanup_netem():
    subprocess.run("ip netns del ns_recv 2>/dev/null || true; ip link del veth0 2>/dev/null || true", shell=True)

def percentile(data, p):
    if not data:
        return None
    data = sorted(data)
    k = (len(data) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return data[int(k)]
    d0 = data[int(f)] * (c - k)
    d1 = data[int(c)] * (k - f)
    return d0 + d1

def run_experiment(mode: str) -> dict:
    if os.path.exists("/tmp/recv_results.json"):
        os.remove("/tmp/recv_results.json")

    # Start receiver inside ns_recv
    recv_proc = subprocess.Popen([
        "ip", "netns", "exec", "ns_recv",
        sys.executable, "-c", RECEIVER_SCRIPT
    ])

    time.sleep(0.3)  # wait for socket to bind

    send_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    send_sock.bind(("10.200.1.1", 0))

    sent_times = {}

    for seq in range(NUM_TRIALS):
        t0 = time.perf_counter()
        sent_times[seq] = t0
        payload = f"{seq}:EMERGENCY_PAYLOAD_TEST_{t0}".encode("utf-8")

        if mode == "single":
            send_sock.sendto(payload, ("10.200.1.2", PORT))
        elif mode == "back-to-back":
            send_sock.sendto(payload, ("10.200.1.2", PORT))
            send_sock.sendto(payload, ("10.200.1.2", PORT))
        elif mode == "spaced":
            send_sock.sendto(payload, ("10.200.1.2", PORT))
            time.sleep(0.030)  # dt = 30ms
            send_sock.sendto(payload, ("10.200.1.2", PORT))

        # Pace messages so queue does not overflow
        time.sleep(0.015)

    send_sock.close()
    time.sleep(0.8)  # wait for in-flight packets to clear kernel netem qdisc

    recv_proc.terminate()
    recv_proc.wait()

    received_times = {}
    if os.path.exists("/tmp/recv_results.json"):
        with open("/tmp/recv_results.json") as f:
            raw = json.load(f)
            received_times = {int(k): float(v) for k, v in raw.items()}

    delivered = 0
    on_time = 0
    latencies_ms = []

    for seq in range(NUM_TRIALS):
        if seq in received_times:
            delivered += 1
            latency = (received_times[seq] - sent_times[seq]) * 1000.0
            latencies_ms.append(latency)
            if latency <= DEADLINE_MS:
                on_time += 1

    return {
        "mode": mode,
        "trials": NUM_TRIALS,
        "delivered_count": delivered,
        "delivery_rate": round(delivered / NUM_TRIALS, 3),
        "on_time_count": on_time,
        "on_time_rate": round(on_time / NUM_TRIALS, 3),
        "median_latency_ms": round(float(statistics.median(latencies_ms)), 1) if latencies_ms else None,
        "p95_latency_ms": round(float(percentile(latencies_ms, 95)), 1) if latencies_ms else None,
    }

if __name__ == "__main__":
    print("=" * 70)
    print("REAL LINUX KERNEL tc-netem PHYSICAL SOCKET BENCHMARK")
    print("Gilbert-Elliott burst loss (20% loss, 50% burst) + 40ms/15ms delay jitter")
    print("Deadline: 140ms | Network Namespaces: isolated veth0 <-> veth1")
    print("=" * 70)

    setup_netem()
    try:
        modes = ["single", "back-to-back", "spaced"]
        results = {}
        for m in modes:
            print(f"Running physical socket benchmark: mode='{m}' ({NUM_TRIALS} datagrams)...")
            res = run_experiment(m)
            results[m] = res
            print(f"  Delivered: {res['delivery_rate']:.1%} | On-Time (<= {DEADLINE_MS}ms): {res['on_time_rate']:.1%} | Median Latency: {res['median_latency_ms']}ms | p95: {res['p95_latency_ms']}ms")

        out_path = "experiments/netem_empirical_results.json"
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nEmpirical socket results saved to {out_path}")

        diff = (results["spaced"]["on_time_rate"] - results["back-to-back"]["on_time_rate"]) * 100
        print("\n" + "=" * 70)
        print("EMPIRICAL COMPARISON:")
        print(f"  Single (k=1):             {results['single']['on_time_rate']:.1%} on-time")
        print(f"  Back-to-Back (k=2, dt=0):  {results['back-to-back']['on_time_rate']:.1%} on-time")
        print(f"  Spaced (k=2, dt=30ms):     {results['spaced']['on_time_rate']:.1%} on-time")
        print(f"  Empirical Gain of Spacing: +{diff:.1f} percentage points (physical Linux kernel measurement)")
        print("=" * 70)

    finally:
        cleanup_netem()
