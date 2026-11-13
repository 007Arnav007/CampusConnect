/**
 * Length-prefixed framing for the TCP channel (fixes N-04).
 * 4-byte big-endian length + body. The decoder accumulates raw Buffers and never decodes
 * per chunk, so multi-byte UTF-8 characters split across TCP segments stay intact.
 */
export const MAX_FRAME_BYTES = 64 * 1024;

export class FrameError extends Error {
  constructor(public readonly code: "OVERSIZE" | "ZERO_LENGTH", message: string) { super(message); }
}

export function encodeFrame(body: Buffer | string): Buffer {
  const payload = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  if (payload.length === 0 || payload.length > MAX_FRAME_BYTES) {
    throw new FrameError(payload.length === 0 ? "ZERO_LENGTH" : "OVERSIZE", `bad frame size ${payload.length}`);
  }
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

export class FrameDecoder {
  private chunks: Buffer[] = [];
  private buffered = 0;
  /** Push raw bytes; returns every complete frame body. Throws FrameError on a protocol violation. */
  push(chunk: Buffer): Buffer[] {
    this.chunks.push(chunk); this.buffered += chunk.length;
    const out: Buffer[] = [];
    for (;;) {
      if (this.buffered < 4) break;
      const all = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks);
      this.chunks = [all];
      const len = all.readUInt32BE(0);
      if (len === 0 || len > MAX_FRAME_BYTES) throw new FrameError(len === 0 ? "ZERO_LENGTH" : "OVERSIZE", `bad frame size ${len}`);
      if (all.length < 4 + len) break;
      out.push(Buffer.from(all.subarray(4, 4 + len)));
      const rest = all.subarray(4 + len);
      this.chunks = rest.length ? [Buffer.from(rest)] : [];
      this.buffered = rest.length;
    }
    return out;
  }
}
