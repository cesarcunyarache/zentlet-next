export type AppleIdentity = {
  subject: string;
  email: string | null;
};

export abstract class AppleIdentityVerifier {
  abstract verify(identityToken: string): Promise<AppleIdentity>;
}
