import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/infrastructure/prisma.service.js';
import type { Session } from '../../domain/session/session.js';
import { SessionRepository } from '../../domain/session/session.repository.js';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(session: Session): Promise<Session> {
    return this.prisma.session.create({ data: session });
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { token } });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { token } });
  }
}
