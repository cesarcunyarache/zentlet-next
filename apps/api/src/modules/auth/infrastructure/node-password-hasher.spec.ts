import { describe, expect, it } from 'vitest';
import { NodePasswordHasher } from './node-password-hasher.js';

describe('NodePasswordHasher', () => {
  it('hashes a password and verifies it successfully', async () => {
    const hasher = new NodePasswordHasher();

    const hash = await hasher.hash('correct-password');

    expect(await hasher.verify(hash, 'correct-password')).toBe(true);
  });

  it('fails verification for a wrong password', async () => {
    const hasher = new NodePasswordHasher();
    const hash = await hasher.hash('correct-password');

    expect(await hasher.verify(hash, 'wrong-password')).toBe(false);
  });

  it('fails verification for a malformed hash instead of throwing', async () => {
    const hasher = new NodePasswordHasher();

    await expect(hasher.verify('not-a-valid-hash', 'any-password')).resolves.toBe(false);
  });

  it('produces different salts for the same password', async () => {
    const hasher = new NodePasswordHasher();

    const firstHash = await hasher.hash('same-password');
    const secondHash = await hasher.hash('same-password');

    expect(firstHash).not.toBe(secondHash);
  });
});
