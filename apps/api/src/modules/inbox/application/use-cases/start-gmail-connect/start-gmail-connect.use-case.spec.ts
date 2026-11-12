import { describe, expect, it } from 'vitest';
import { FakeGmailClient } from '../../../infrastructure/gmail/fake-gmail-client.js';
import { StartGmailConnectUseCase } from './start-gmail-connect.use-case.js';

describe('StartGmailConnectUseCase', () => {
  it('without Gmail configured there is no URL', () => {
    const client = new FakeGmailClient();
    client.isAvailable.mockReturnValue(false);

    expect(new StartGmailConnectUseCase(client).execute()).toBeNull();
  });

  it('generates a different random state each time and includes it in the URL', () => {
    const useCase = new StartGmailConnectUseCase(new FakeGmailClient());

    const first = useCase.execute();
    const second = useCase.execute();

    expect(first?.state).toMatch(/^[\w-]{32}$/);
    expect(first?.url).toContain(`state=${first?.state}`);
    expect(first?.state).not.toBe(second?.state);
  });
});
