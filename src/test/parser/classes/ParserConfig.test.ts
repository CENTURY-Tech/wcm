import test, { Assertions } from 'ava';
import { ParserConfig } from '../../../main/parser/classes/parserConfig';

let mocks: any;

test.beforeEach(() => {
  mocks = {
    first: {
      fred: 'smith'
    },
    second: {
      freddie: 'froom'
    }
  };
});

test.afterEach(() => {
  mocks = null;
});

test('**********  ParserConfig tests  **********', (assert: Assertions) => {
  assert.pass('Start ParserConfig');
});

test('parserconfig merges arg with default keys', (assert: Assertions) => {
  const parser = new ParserConfig(mocks.first);
  const testVal = (ParserConfig.assignableKeys.map((key) => key) as string[])
    .concat(Object.keys(mocks.first));
  assert.deepEqual(Object.keys(parser), testVal);
});

test('parserconfig stores default deps.root', (assert: Assertions) => {
  const parser = new ParserConfig(mocks.first);
  assert.is((parser as any)['deps.root'], 'node_modules');
});

test('parserconfig stores passed values', (assert: Assertions) => {
  const parser = new ParserConfig(mocks.first);
  assert.is((parser as any).fred, mocks.first.fred);
});

test('getOrCreate returns an instance', (assert: Assertions) => {
  const parser = ParserConfig.getOrCreate(mocks.first);
  assert.deepEqual(Object.keys(parser), ['deps.root', 'fred']);
  assert.is((parser as any)['deps.root'], 'node_modules');
  assert.is((parser as any).fred, mocks.first.fred);
});

test('getOrCreate returns singleton instance', (assert: Assertions) => {
  const parser = ParserConfig.getOrCreate(mocks.first);
  const second = ParserConfig.getOrCreate(mocks.second);
  assert.is(parser, second);
});

test('**********  End ParserConfig tests  **********', (assert: Assertions) => {
  assert.pass('End ParserConfig');
});
