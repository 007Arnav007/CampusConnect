# Offline network simulator

Deterministic TypeScript scenarios for local ML experiments. The simulator
generates telemetry, tickets, and explicit ground-truth labels for normal,
congestion, latency, packet-loss, utilization, connectivity, topology failure,
recovery, and gateway-overload scenarios. It has no socket, HTTP, UDP, or
emergency-dispatch code and is offline/local-only.

```powershell
npm install
npm test
npm run build
npm run simulate -- --scenario ap-failure --seed 7 --steps 3
npm run simulate -- --scenario shared-upstream-failure --seed 7 --steps 10 --out ../datasets/research/upstream-7.json
```

The `--out` option writes JSON plus a CSV telemetry dataset. The seed, complete
scenario, ground-truth incident ID, root cause, affected nodes, and anomaly
labels are retained so experiments can split by scenario rather than leaking
adjacent time windows across train and test.
