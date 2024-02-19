export function toXOnly(pubkey: Buffer): Buffer {
    return pubkey.subarray(1, 33);
  }
  