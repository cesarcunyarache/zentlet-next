import { Module } from '@nestjs/common';
import { GetSessionUseCase } from './application/use-cases/get-session/get-session.use-case.js';
import { SignInWithAppleUseCase } from './application/use-cases/sign-in-with-apple/sign-in-with-apple.use-case.js';
import { SignInWithPasswordUseCase } from './application/use-cases/sign-in-with-password/sign-in-with-password.use-case.js';
import { SignOutUseCase } from './application/use-cases/sign-out/sign-out.use-case.js';
import { SignUpWithPasswordUseCase } from './application/use-cases/sign-up-with-password/sign-up-with-password.use-case.js';
import { AccountRepository } from './domain/account/account.repository.js';
import { AppleIdentityVerifier } from './domain/apple/apple-identity-verifier.js';
import { PasswordHasher } from './domain/password/password-hasher.js';
import { SessionRepository } from './domain/session/session.repository.js';
import { UserRepository } from './domain/user/user.repository.js';
import { JoseAppleIdentityVerifier } from './infrastructure/apple/jose-apple-identity-verifier.js';
import { NodePasswordHasher } from './infrastructure/password/node-password-hasher.js';
import { PrismaAccountRepository } from './infrastructure/account/prisma-account.repository.js';
import { PrismaSessionRepository } from './infrastructure/session/prisma-session.repository.js';
import { PrismaUserRepository } from './infrastructure/user/prisma-user.repository.js';

@Module({
  providers: [
    SignUpWithPasswordUseCase,
    SignInWithPasswordUseCase,
    SignInWithAppleUseCase,
    GetSessionUseCase,
    SignOutUseCase,
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: SessionRepository, useClass: PrismaSessionRepository },
    { provide: AccountRepository, useClass: PrismaAccountRepository },
    { provide: PasswordHasher, useClass: NodePasswordHasher },
    { provide: AppleIdentityVerifier, useClass: JoseAppleIdentityVerifier },
  ],
  exports: [
    SignUpWithPasswordUseCase,
    SignInWithPasswordUseCase,
    SignInWithAppleUseCase,
    GetSessionUseCase,
    SignOutUseCase,
  ],
})
export class AuthModule {}
