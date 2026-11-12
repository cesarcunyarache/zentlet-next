import { describe, expect, it } from 'vitest';
import { isUnlinkCommand, parseLinkCommand } from './commands.rules.js';

describe('parseLinkCommand', () => {
  it('extracts the code from a link command in any supported language', () => {
    expect(parseLinkCommand('link ABCD-EFGH')).toBe('ABCD-EFGH');
    expect(parseLinkCommand('vincular ABCD-EFGH')).toBe('ABCD-EFGH');
    expect(parseLinkCommand('CONECTAR abcd-efgh')).toBe('abcd-efgh');
  });

  it('returns null for anything else', () => {
    expect(parseLinkCommand('lunch 25')).toBeNull();
    expect(parseLinkCommand('link')).toBeNull();
  });
});

describe('isUnlinkCommand', () => {
  it('recognizes an unlink keyword regardless of case', () => {
    expect(isUnlinkCommand('unlink')).toBe(true);
    expect(isUnlinkCommand('Desvincular')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isUnlinkCommand('lunch 25')).toBe(false);
  });
});
