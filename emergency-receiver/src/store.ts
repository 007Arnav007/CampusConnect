import { DatabaseSync } from "node:sqlite";

/** Durable local store (SQLite, WAL journal, synchronous=FULL => fsync before the ACK in LOCAL_DURABLE mode). */
export class NoticeStore {
  private db: DatabaseSync;
  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS notices(
        mid TEXT PRIMARY KEY, first_seq INTEGER NOT NULL, rid TEXT NOT NULL, received_at INTEGER NOT NULL,
        payload_hash TEXT NOT NULL, copies INTEGER NOT NULL DEFAULT 1, synced INTEGER NOT NULL DEFAULT 0, body TEXT NOT NULL,
        nonce TEXT NOT NULL DEFAULT '', inc TEXT);
      CREATE TABLE IF NOT EXISTS windows(channel TEXT PRIMARY KEY, state TEXT NOT NULL);
    `);
  }
  has(mid: string): boolean { return this.db.prepare("SELECT 1 FROM notices WHERE mid=?").get(mid) !== undefined; }
  insert(row: { mid: string; seq: number; rid: string; at: number; hash: string; body: string; nonce: string; inc?: string }) {
    this.db.prepare("INSERT INTO notices(mid,first_seq,rid,received_at,payload_hash,body,nonce,inc) VALUES(?,?,?,?,?,?,?,?)")
      .run(row.mid, row.seq, row.rid, row.at, row.hash, row.body, row.nonce, row.inc ?? null);
  }
  bumpCopies(mid: string) { this.db.prepare("UPDATE notices SET copies=copies+1 WHERE mid=?").run(mid); }
  count(): number { return Number((this.db.prepare("SELECT COUNT(*) c FROM notices").get() as { c: number }).c); }
  unsynced(limit = 50): Array<{ mid: string; payload_hash: string; first_seq: number; received_at: number; nonce: string; inc: string | null; rid: string }> {
    return this.db.prepare("SELECT mid,payload_hash,first_seq,received_at,nonce,inc,rid FROM notices WHERE synced=0 LIMIT ?").all(limit) as any;
  }
  markSynced(mid: string) { this.db.prepare("UPDATE notices SET synced=1 WHERE mid=?").run(mid); }
  unsyncedCount(): number { return Number((this.db.prepare("SELECT COUNT(*) c FROM notices WHERE synced=0").get() as { c: number }).c); }
  saveWindow(channel: string, state: unknown) {
    this.db.prepare("INSERT INTO windows(channel,state) VALUES(?,?) ON CONFLICT(channel) DO UPDATE SET state=excluded.state").run(channel, JSON.stringify(state));
  }
  loadWindow(channel: string): any | undefined {
    const r = this.db.prepare("SELECT state FROM windows WHERE channel=?").get(channel) as { state: string } | undefined;
    return r ? JSON.parse(r.state) : undefined;
  }
  close() { this.db.close(); }
}
