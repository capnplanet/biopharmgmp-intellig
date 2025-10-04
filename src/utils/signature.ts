export type SignatureInput = {
  userId: string
  password: string
  reason: string
  timestamp?: Date
}

const bufferToHex = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const createDigitalSignature = async ({ userId, password, reason, timestamp = new Date() }: SignatureInput) => {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Web Crypto API not available for digital signature generation')
  }
  const encoder = new TextEncoder()
  const payload = `${userId}|${password}|${reason}|${timestamp.toISOString()}`
  const data = encoder.encode(payload)
  const hashBuffer = await subtle.digest('SHA-256', data)
  return {
    signature: `SHA256:${bufferToHex(hashBuffer)}`,
    timestamp,
  }
}
