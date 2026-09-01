import assert from "node:assert";

export function close(actual, expected, delta) {
  assert(Math.abs(actual - expected) <= delta, `${actual} is not close to ${expected}`);
}
