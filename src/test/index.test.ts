import test, { Assertions } from 'ava';

test("true is true", (assert: Assertions) => {
  assert.is(true, true, "Turns out, true is true");
});

test("true really is true", (assert: Assertions) => {
  assert.is(true, true, "True really is true");
});