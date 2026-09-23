import { describe, it, expect } from 'vitest';
import { mergeById, withChange } from './merge';

const seed = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];

describe('mergeById (SPEC §6)', () => {
  it('local change wins for the same id', () => {
    expect(mergeById(seed, { a: { name: 'A2' } })).toEqual([{ id: 'a', name: 'A2' }, { id: 'b', name: 'B' }]);
  });
  it('a change with a new id is a newly created record', () => {
    expect(mergeById(seed, { c: { name: 'C' } })).toHaveLength(3);
  });
  it('_deleted hides the record', () => {
    expect(mergeById(seed, { b: { _deleted: true } }).map(r => r.id)).toEqual(['a']);
  });
  it('withChange merges patches without losing earlier fields', () => {
    const c = withChange(withChange({}, 'a', { name: 'X' }), 'a', { _deleted: true });
    expect(c).toEqual({ a: { name: 'X', _deleted: true } });
  });
});
