import assert from 'node:assert/strict';
import test from 'node:test';
import { price } from '../lib/price.js';

test('returns the product price', () => {
  assert.equal(price(12000), 12000);
});
