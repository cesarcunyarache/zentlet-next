import { CreateTransactionUseCase } from "../application/use-cases/create-transaction.use-case";
import { DeleteTransactionUseCase } from "../application/use-cases/delete-transaction.use-case";
import { GetTransactionUseCase } from "../application/use-cases/get-transaction.use-case";
import { ListTransactionsUseCase } from "../application/use-cases/list-transactions.use-case";
import { SummarizeTransactionsUseCase } from "../application/use-cases/summarize-transactions.use-case";
import { UpdateTransactionUseCase } from "../application/use-cases/update-transaction.use-case";
import { budgetMonitor, listPlacement, recurringSeries } from "./transaction.adapters";
import { PrismaTransactionRepository } from "./persistence/prisma/prisma-transaction.repository";

const repository = new PrismaTransactionRepository();

export const transactionUseCases = {
  list: new ListTransactionsUseCase(repository),
  summarize: new SummarizeTransactionsUseCase(repository),
  get: new GetTransactionUseCase(repository),
  create: new CreateTransactionUseCase(repository, recurringSeries, budgetMonitor, listPlacement),
  update: new UpdateTransactionUseCase(repository, budgetMonitor),
  delete: new DeleteTransactionUseCase(repository),
};
