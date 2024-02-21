export function toXOnly(pubkey: Buffer): Buffer {
  return pubkey.subarray(1, 33);
}

export function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// export function getRandomNumbers(
//   count: number,
// ): Buffer[] {
//   let result: Buffer[] = [];
//   for (let i = 0; i < count; i++) {
//     result.push(Buffer.from([Math.random()]));
//   }
//   return result;
// }

export function getRandomNumbers(count: number): Buffer[] {
  let result: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    result.push(
      Buffer.from([
        getRandomNumber(0, 255),
        getRandomNumber(0, 255),
        getRandomNumber(0, 255),
        getRandomNumber(0, 255),
      ]),
    );
  }
  return result;
}
