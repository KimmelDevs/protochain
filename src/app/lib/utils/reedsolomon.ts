// app/lib/utils/reedSolomon.ts
// Pure browser TypeScript — zero dependencies.
// GF(2^8) Reed-Solomon with generator polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
// Used to add error-correction parity to the SHA-256 hash before QR encoding,
// so the QR can still be decoded even if partially damaged or obscured.
//
// Usage:
//   const encoded = rsEncode(data: Uint8Array, numEccBytes: number): Uint8Array
//   const decoded = rsDecode(data: Uint8Array, numEccBytes: number): Uint8Array
//   const payload = rsEncodeHex(hexString: string, numEccBytes?: number): string
//
// Recommended numEccBytes:
//   16 → ~12% correction    (QR level M)
//   32 → ~25% correction    (QR level Q)  ← default for SHA-256 hashes
//   64 → ~37% correction    (QR level H)

// ─── GF(2^8) field ────────────────────────────────────────────────────────────

const PRIM = 0x11d; // x^8 + x^4 + x^3 + x^2 + 1
const FIELD = 256;

const gfExp = new Uint8Array(FIELD * 2);
const gfLog = new Uint8Array(FIELD);

(function initField() {
  let x = 1;
  for (let i = 0; i < FIELD - 1; i++) {
    gfExp[i] = x;
    gfLog[x] = i;
    x <<= 1;
    if (x >= FIELD) x ^= PRIM;
  }
  for (let i = FIELD - 1; i < FIELD * 2; i++) {
    gfExp[i] = gfExp[i - (FIELD - 1)];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return gfExp[(gfLog[x] + gfLog[y]) % (FIELD - 1)];
}

function gfDiv(x: number, y: number): number {
  if (y === 0) throw new Error('GF division by zero');
  if (x === 0) return 0;
  return gfExp[((gfLog[x] - gfLog[y]) % (FIELD - 1) + (FIELD - 1)) % (FIELD - 1)];
}

function gfPow(x: number, power: number): number {
  return gfExp[(gfLog[x] * power) % (FIELD - 1)];
}

function gfInverse(x: number): number {
  return gfExp[(FIELD - 1) - gfLog[x]];
}

// ─── Polynomial helpers ───────────────────────────────────────────────────────

type Poly = Uint8Array<ArrayBuffer>;

/** Safely coerces any Uint8Array to Poly (Uint8Array<ArrayBuffer>).
 *  Safe because new Uint8Array() / .slice() never use SharedArrayBuffer. */
function toPoly(u: Uint8Array): Poly {
  return new Uint8Array(u.buffer as ArrayBuffer, u.byteOffset, u.byteLength);
}

function polyScale(p: Poly, x: number): Poly {
  const out = new Uint8Array(p.length);
  for (let i = 0; i < p.length; i++) out[i] = gfMul(p[i], x);
  return out;
}

function polyAdd(p: Poly, q: Poly): Poly {
  const out = new Uint8Array(Math.max(p.length, q.length));
  for (let i = 0; i < p.length; i++) out[i + out.length - p.length] ^= p[i];
  for (let i = 0; i < q.length; i++) out[i + out.length - q.length] ^= q[i];
  return out;
}

function polyMul(p: Poly, q: Poly): Poly {
  const out = new Uint8Array(p.length + q.length - 1);
  for (let j = 0; j < q.length; j++)
    for (let i = 0; i < p.length; i++)
      out[i + j] ^= gfMul(p[i], q[j]);
  return out;
}

function polyEval(p: Poly, x: number): number {
  let y = p[0];
  for (let i = 1; i < p.length; i++) y = gfMul(y, x) ^ p[i];
  return y;
}

// ─── Generator polynomial ─────────────────────────────────────────────────────

function rsGeneratorPoly(nsym: number): Poly {
  let g: Poly = new Uint8Array([1]);
  for (let i = 0; i < nsym; i++) {
    g = polyMul(g, new Uint8Array([1, gfPow(2, i)]));
  }
  return g;
}

// ─── Encode ───────────────────────────────────────────────────────────────────

/**
 * Appends `numEcc` Reed-Solomon parity bytes to `data`.
 * Returns a new Uint8Array of length data.length + numEcc.
 */
export function rsEncode(data: Uint8Array, numEcc: number): Uint8Array {
  const gen = rsGeneratorPoly(numEcc);
  // Remainder of (data * x^numEcc) / gen
  const remainder = new Uint8Array(numEcc);
  for (let i = 0; i < data.length; i++) {
    const coef = data[i] ^ remainder[0];
    remainder.copyWithin(0, 1); // shift left
    remainder[numEcc - 1] = 0;
    if (coef !== 0) {
      for (let j = 0; j < numEcc; j++) {
        remainder[j] ^= gfMul(gen[j + 1] ?? 0, coef);
      }
    }
  }
  const out = new Uint8Array(data.length + numEcc);
  out.set(data);
  out.set(remainder, data.length);
  return out;
}

// ─── Syndrome ─────────────────────────────────────────────────────────────────

function calcSyndromes(msg: Poly, nsym: number): number[] {
  return Array.from({ length: nsym }, (_, i) => polyEval(msg, gfPow(2, i)));
}

function hasSyndromeErrors(synd: number[]): boolean {
  return synd.some(s => s !== 0);
}

// ─── Berlekamp-Massey error locator ───────────────────────────────────────────

function bmErrorLocator(synd: number[]): Poly {
  let errLoc: Poly = new Uint8Array([1]);
  let oldLoc: Poly = new Uint8Array([1]);

  for (let i = 0; i < synd.length; i++) {
    let delta = synd[i];
    for (let j = 1; j < errLoc.length; j++) {
      delta ^= gfMul(errLoc[errLoc.length - 1 - j], synd[i - j]);
    }
    oldLoc = new Uint8Array([...oldLoc, 0]); // shift
    if (delta !== 0) {
      if (oldLoc.length > errLoc.length) {
        const newLoc = polyScale(oldLoc, delta);
        oldLoc = polyScale(errLoc, gfInverse(delta));
        errLoc = newLoc;
      }
      errLoc = polyAdd(errLoc, polyScale(oldLoc, delta));
    }
  }
  return errLoc;
}

// ─── Chien search — error positions ───────────────────────────────────────────

function findErrors(errLoc: Poly, msgLen: number): number[] {
  const errs = errLoc.length - 1;
  const positions: number[] = [];
  for (let i = 0; i < msgLen; i++) {
    if (polyEval(errLoc, gfPow(2, i)) === 0) {
      positions.push(msgLen - 1 - i);
    }
  }
  if (positions.length !== errs) throw new Error('Too many errors to correct');
  return positions;
}

// ─── Forney algorithm — error magnitudes ──────────────────────────────────────

function correctErrors(msg: Poly, synd: number[], positions: number[]): Poly {
  const out = toPoly(new Uint8Array(msg));
  const coefPos = positions.map(p => msg.length - 1 - p);

  // Error evaluator polynomial
  const syndPoly: Poly = new Uint8Array(synd.slice().reverse());
  const errLocRev: Poly = new Uint8Array([...Array.from(
    bmErrorLocator(synd)
  ).reverse()]);

  let errEval = polyMul(syndPoly, errLocRev);
  errEval = toPoly(errEval.slice(errEval.length - (positions.length + 1)));

  // Formal derivative of error locator
  const errLocPrime: number[] = [];
  const errLocFull = bmErrorLocator(synd);
  for (let i = 1; i < errLocFull.length; i += 2) {
    errLocPrime.push(errLocFull[errLocFull.length - 1 - i]);
  }

  for (let i = 0; i < coefPos.length; i++) {
    const xiInv = gfPow(2, coefPos[i]);
    let errLocPrimeVal = 1;
    for (let j = 0; j < errLocPrime.length; j++) {
      errLocPrimeVal ^= gfMul(errLocPrime[j], gfPow(xiInv, j + 1));
    }
    if (errLocPrimeVal === 0) throw new Error('Could not find error magnitude');
    const y = gfMul(
      gfPow(xiInv, 1),
      gfDiv(polyEval(errEval, gfInverse(xiInv)), errLocPrimeVal)
    );
    out[positions[i]] ^= y;
  }
  return out;
}

// ─── Decode ───────────────────────────────────────────────────────────────────

/**
 * Verifies and corrects a RS-encoded message.
 * Input must be length originalData.length + numEcc.
 * Returns the original data bytes (without ECC suffix).
 * Throws if errors exceed correction capacity.
 */
export function rsDecode(encoded: Uint8Array, numEcc: number): Uint8Array {
  const poly = toPoly(encoded);
  const synd = calcSyndromes(poly, numEcc);
  if (!hasSyndromeErrors(synd)) {
    return encoded.slice(0, encoded.length - numEcc);
  }

  const errLoc = bmErrorLocator(synd);
  const errCount = errLoc.length - 1;
  if (errCount * 2 > numEcc) {
    throw new Error(`Too many errors: found ${errCount}, capacity ${Math.floor(numEcc / 2)}`);
  }

  const positions = findErrors(errLoc, poly.length);
  const corrected = correctErrors(poly, synd, positions);
  return toPoly(corrected.slice(0, corrected.length - numEcc));
}

// ─── High-level hex helpers ───────────────────────────────────────────────────

/**
 * Encodes a hex string (e.g. SHA-256) with Reed-Solomon ECC.
 * Returns a hex string of the RS-encoded payload (data + parity bytes).
 *
 * @param hex       - SHA-256 hex string (64 chars = 32 bytes)
 * @param numEcc    - number of ECC bytes to append (default 32 → ~25% correction)
 */
export function rsEncodeHex(hex: string, numEcc = 32): string {
  const bytes = hexToBytes(hex);
  const encoded = rsEncode(bytes, numEcc);
  return bytesToHex(encoded);
}

/**
 * Decodes and error-corrects an RS-encoded hex string.
 * Returns the original hex string.
 */
export function rsDecodeHex(encodedHex: string, numEcc = 32): string {
  const bytes = hexToBytes(encodedHex);
  const decoded = rsDecode(bytes, numEcc);
  return bytesToHex(decoded);
}

// ─── Byte / hex converters ────────────────────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Hex string must have even length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}