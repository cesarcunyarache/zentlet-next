import { CreateTransactionUseCase } from "../application/create-transaction.usecase";
import { DeleteTransactionUseCase } from "../application/delete-transaction.usecase";
import { GetTransactionUseCase } from "../application/get-transaction.usecase";
import { ListTransactionsUseCase } from "../application/list-transactions.usecase";
import { SummarizeTransactionsUseCase } from "../application/summarize-transactions.usecase";
import { UpdateTransactionUseCase } from "../application/update-transaction.usecase";
import { budgetMonitor, recurringSeries } from "./transaction.adapters";
import { PrismaTransactionRepository } from "./prisma-transaction.repository";

const repository = new PrismaTransactionRepository();

export const transactionUseCases = {
  list: new ListTransactionsUseCase(repository),
  summarize: new SummarizeTransactionsUseCase(repository),
  get: new GetTransactionUseCase(repository),
  create: new CreateTransactionUseCase(repository, recurringSeries, budgetMonitor),
  update: new UpdateTransactionUseCase(repository, budgetMonitor),
  delete: new DeleteTransactionUseCase(repository),
};
