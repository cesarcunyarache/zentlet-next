import { Module } from '@nestjs/common';
import { GetSessionUseCase } from './application/use-cases/get-session/get-session.use-case.js';
import { SignInWithAppleUseCase } from './application/use-cases/sign-in-with-apple/sign-in-with-apple.use-case.js';
import { SignInWithPasswordUseCase } from './application/use-cases/sign-in-with-password/sign-in-with-password.use-case.js';
import { SignOutUseCase } from './application/use-cases/sign-out/sign-out.use-case.js';
import { SignUpWithPasswordUseCase } from './application/use-cases/sign-up-with-password/sign-up-with-password.use-case.js';
import { AccountRepository } from './domain/account.repository.js';
import { AppleIdentityVerifier } from './domain/apple-identity-verifier.js';
import { PasswordHasher } from './domain/password-hasher.js';
import { SessionRepository } from './domain/session.repository.js';
import { UserRepository } from './domain/user.repository.js';
import { JoseAppleIdentityVerifier } from './infrastructure/jose-apple-identity-verifier.js';
import { NodePasswordHasher } from './infrastructure/node-password-hasher.js';
import { PrismaAccountRepository } from './infrastructure/prisma-account.repository.js';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository.js';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';

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
