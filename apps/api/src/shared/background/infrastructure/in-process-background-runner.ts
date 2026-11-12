import { Logger } from '../../logger/domain/logger.js';
import { BackgroundRunner, type BackgroundTask } from '../domain/background-runner.js';

export class InProcessBackgroundRunner extends BackgroundRunner {
  constructor(private readonly logger: Logger) {
    super();
  }

  run(task: BackgroundTask): void {
    setImmediate(() => {
      task().catch((error: unknown) => this.logger.error({ err: error }, 'background.task_failed'));
    });
  }
}
