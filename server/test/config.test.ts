import assert from "node:assert/strict";
import test from "node:test";
import { resolvePort } from "../src/config.js";

test("resolvePort", () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(resolvePort(undefined), 5000);
    assert.equal(resolvePort("8080"), 8080);
    for (const bad of ["abc", "0", "70000", ""]) assert.equal(resolvePort(bad), 5000);
  } finally {
    console.warn = warn;
  }
});
