export async function generateAesKey() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  return { key, raw };
}

// ---- Import raw key ----
export async function importAesKeyFromRaw(raw) {
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, [
    "encrypt",
    "decrypt",
  ]);
}

// ---- ArrayBuffer <-> Base64 helpers ----
export function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  // Normalize
  let normalized = base64.replace(/[\r\n\s]/g, "");
  if (normalized.length % 4 !== 0) {
    normalized = normalized + "=".repeat(4 - (normalized.length % 4));
  }

  try {
    const binary = atob(normalized);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  } catch (err) {
    console.error("❌ Base64 decode failed for:", base64);
    throw err;
  }
}

// ---- Encryption ----
export async function encryptBuffer(rawKey, arrayBuffer) {
  const key = await importAesKeyFromRaw(rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // console.log("🔐 Encrypting buffer");
  // console.log("  RawKey length:", rawKey.byteLength);
  // console.log("  IV length:", iv.byteLength);

  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    arrayBuffer
  );

  return { cipher, iv: arrayBufferToBase64(iv) };
}

// ---- Decryption ----
export async function decryptBuffer(rawKey, cipherBuffer, ivBase64) {
  const key = await importAesKeyFromRaw(rawKey);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));

  // console.log("🔑 Decrypting buffer");
  // console.log("  RawKey length:", rawKey.byteLength);
  // console.log("  IV length:", iv.byteLength);
  // console.log("  Cipher length:", cipherBuffer.byteLength);

  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBuffer
    );
    console.log("✅ Decryption succeeded");
    return plain; // ArrayBuffer
  } catch (err) {
    console.error("❌ Decryption failed (OperationError):", err);
    throw err;
  }
}

// ---- Export/import raw AES key as base64 ----
export function rawToBase64(raw) {
  return arrayBufferToBase64(raw);
}

export function base64ToRaw(b64) {
  return base64ToArrayBuffer(b64);
}
