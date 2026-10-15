import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensurePrivateListId } from "@/lib/private-list";
import { GET as indexRoute, POST as createRoute } from "@/app/api/list/route";
import { DELETE as deleteRoute, GET as detailRoute, PATCH as updateRoute } from "@/app/api/list/[id]/route";
import { GET as entriesRoute, POST as addRoute } from "@/app/api/list/[id]/entries/route";
import { DELETE as removeRoute } from "@/app/api/list/[id]/entries/[transactionId]/route";
import { GET as invitesRoute, POST as createInviteRoute } from "@/app/api/list/[id]/invites/route";
import { DELETE as revokeRoute } from "@/app/api/list/[id]/invites/[inviteId]/route";
import { POST as emailInviteRoute } from "@/app/api/list/[id]/invites/email/route";
import { DELETE as removeMemberRoute, PATCH as updateMemberRoute } from "@/app/api/list/[id]/members/[userId]/route";
import { GET as previewRoute, POST as acceptRoute } from "@/app/api/list-invite/[token]/route";
import { createUser, resetDatabase } from "@/test/integration/database";
import { listUseCases } from "../server/infrastructure/list.container";
import type { TCreatedInvite, TInvitePreview, TList, TListDetail, TListEntryPage, TListInvite } from "../types";

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

const getSession = vi.mocked(auth.api.getSession);
const BASE_URL = "http://localhost";

let ownerId: string;
let categoryId: string;

const signIn = (id: string) => getSession.mockResolvedValue({ user: { id } } as never);
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });
const json = (body: unknown, method = "POST") =>
  new Request(`${BASE_URL}/api/list`, { method, body: JSON.stringify(body) });

async function createCategory(userId: string, name = "Viajes") {
  const category = await prisma.category.create({ data: { userId, name, icon: "✈️", color: "#D6E8F7" } });
  return category.id;
}

async function createTransaction(userId: string, amount: number, options: { type?: string; category?: string } = {}) {
  const transaction = await prisma.transaction.create({
    data: {
      id: randomUUID(),
      userId,
      amount,
      type: options.type ?? "expense",
      categoryId: options.category ?? categoryId,
      description: "Hotel",
      transactionDate: new Date("2026-10-03"),
      listId: await ensurePrivateListId(userId),
    },
  });
  return transaction.id;
}

async function createList(name = "Viaje a Cusco") {
  const response = await createRoute(json({ id: randomUUID(), name, icon: "🏔️", color: "#DCEFE6" }));
  return { status: response.status, list: (await response.json()) as TList };
}

const add = (listId: string, transactionIds: string[]) =>
  addRoute(json({ transactionIds }), params({ id: listId }));

const detail = async (listId: string) => (await detailRoute(new Request(BASE_URL), params({ id: listId }))).json() as Promise<TListDetail>;

beforeEach(async () => {
  await resetDatabase();
  ownerId = (await createUser()).id;
  categoryId = await createCategory(ownerId);
  signIn(ownerId);
});

describe("listas de movimientos con Postgres", () => {
  it("crea la lista con la moneda de la cuenta y la muestra en el índice", async () => {
    await prisma.userPreference.create({ data: { userId: ownerId, currency: "USD" } });

    const { status, list } = await createList();
    const index = (await (await indexRoute(new Request(BASE_URL))).json()) as TList[];

    expect(status).toBe(201);
    expect(list).toMatchObject({ currency: "USD", role: "owner", memberCount: 1, count: 0 });
    expect(index.map(({ id }) => id)).toEqual([await ensurePrivateListId(ownerId), list.id]);
  });

  it("suma los movimientos agregados por tipo y por categoría", async () => {
    const { list } = await createList();
    const food = await createCategory(ownerId, "Comida");
    const hotel = await createTransaction(ownerId, 320);
    const dinner = await createTransaction(ownerId, 80.5, { category: food });
    const refund = await createTransaction(ownerId, 50, { type: "income" });

    expect((await add(list.id, [hotel, dinner, refund])).status).toBe(200);

    const result = await detail(list.id);
    expect(result).toMatchObject({ count: 3, expenseTotal: 400.5, incomeTotal: 50 });
    expect(result.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: categoryId, expense: 320, income: 50 }),
        expect.objectContaining({ id: food, expense: 80.5, income: 0 }),
      ]),
    );
    expect(result.members).toEqual([expect.objectContaining({ userId: ownerId, role: "owner", count: 3 })]);
  });

  it("un movimiento solo está en una lista: agregarlo a otra lo mueve", async () => {
    const { list: trip } = await createList("Viaje");
    const { list: move } = await createList("Mudanza");
    const hotel = await createTransaction(ownerId, 320);

    await add(trip.id, [hotel]);
    await add(move.id, [hotel]);

    expect((await detail(trip.id)).count).toBe(0);
    expect((await detail(move.id)).count).toBe(1);
  });

  it("pagina los movimientos de la lista del más reciente al más antiguo", async () => {
    const { list } = await createList();
    const ids = await Promise.all([1, 2, 3].map((amount) => createTransaction(ownerId, amount)));
    await add(list.id, ids);

    const first = (await (
      await entriesRoute(new Request(`${BASE_URL}/api/list/x/entries?limit=2`), params({ id: list.id }))
    ).json()) as TListEntryPage;
    const second = (await (
      await entriesRoute(
        new Request(`${BASE_URL}/api/list/x/entries?limit=2&cursor=${first.nextCursor}`),
        params({ id: list.id }),
      )
    ).json()) as TListEntryPage;

    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map(({ id }) => id))).toEqual(new Set(ids));
    expect(first.items[0].category).toMatchObject({ id: categoryId, name: "Viajes" });
  });

  it("no deja agregar movimientos de otra persona", async () => {
    const { list } = await createList();
    const stranger = (await createUser()).id;
    const theirs = await createTransaction(stranger, 99, { category: await createCategory(stranger) });

    const response = await add(list.id, [theirs]);

    expect(response.status).toBe(422);
    expect(await prisma.transaction.findUnique({ where: { id: theirs } })).toMatchObject({
      listId: await ensurePrivateListId(stranger),
    });
  });

  it("rechaza agregar si la moneda de la cuenta cambió respecto a la lista", async () => {
    const { list } = await createList();
    await prisma.userPreference.create({ data: { userId: ownerId, currency: "EUR" } });

    const response = await add(list.id, [await createTransaction(ownerId, 10)]);

    expect(response.status).toBe(409);
  });

  it("quien no es miembro ni la ve ni la toca", async () => {
    const { list } = await createList();
    signIn((await createUser()).id);

    expect((await detailRoute(new Request(BASE_URL), params({ id: list.id }))).status).toBe(404);
    expect((await updateRoute(json({ name: "Mía" }, "PATCH"), params({ id: list.id }))).status).toBe(404);
    expect((await deleteRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: list.id }))).status).toBe(404);
  });

  it("quitar un movimiento lo devuelve a la lista privada; borrar la lista borra los que quedan", async () => {
    const { list } = await createList();
    const hotel = await createTransaction(ownerId, 320);
    const dinner = await createTransaction(ownerId, 80);
    await add(list.id, [hotel, dinner]);

    const removed = await removeRoute(
      new Request(BASE_URL, { method: "DELETE" }),
      params({ id: list.id, transactionId: hotel }),
    );
    const deleted = await deleteRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: list.id }));

    expect(removed.status).toBe(204);
    expect(deleted.status).toBe(204);
    expect(await prisma.transaction.findMany({ where: { id: { in: [hotel, dinner] } }, select: { id: true, listId: true } })).toEqual([
      { id: hotel, listId: await ensurePrivateListId(ownerId) },
    ]);
  });

  it("la lista privada no se comparte, no se edita, no se borra y no se le quitan movimientos", async () => {
    const privateList = await ensurePrivateListId(ownerId);
    const hotel = await createTransaction(ownerId, 320);

    expect((await updateRoute(json({ name: "Mía" }, "PATCH"), params({ id: privateList }))).status).toBe(403);
    expect((await deleteRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: privateList }))).status).toBe(403);
    expect(
      (await removeRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: privateList, transactionId: hotel }))).status,
    ).toBe(403);
  });

  it("al borrar la cuenta del dueño la lista pasa al editor y sus movimientos se van", async () => {
    const { list } = await createList();
    const editor = (await createUser()).id;
    await prisma.transactionListMember.create({ data: { listId: list.id, userId: editor, role: "editor" } });
    const editorsTx = await createTransaction(editor, 45, { category: await createCategory(editor) });
    await prisma.transaction.update({ where: { id: editorsTx }, data: { listId: list.id } });
    await add(list.id, [await createTransaction(ownerId, 320)]);

    await listUseCases.handOver.execute(ownerId);
    await prisma.user.delete({ where: { id: ownerId } });

    signIn(editor);
    expect(await detail(list.id)).toMatchObject({ role: "owner", memberCount: 1, count: 1, expenseTotal: 45 });
  });

  it("al borrar la cuenta del único miembro la lista desaparece", async () => {
    const { list } = await createList();

    await listUseCases.handOver.execute(ownerId);
    await prisma.user.delete({ where: { id: ownerId } });

    expect(await prisma.transactionList.findUnique({ where: { id: list.id } })).toBeNull();
  });
});

describe("compartir listas con Postgres", () => {
  async function invite(listId: string, role: "editor" | "viewer" = "editor") {
    const response = await createInviteRoute(json({ role }), params({ id: listId }));
    return { status: response.status, invite: (await response.json()) as TCreatedInvite };
  }

  const accept = (token: string) => acceptRoute(new Request(BASE_URL, { method: "POST" }), params({ token }));

  async function join(listId: string, role: "editor" | "viewer" = "editor") {
    const { invite: created } = await invite(listId, role);
    const guest = (await createUser()).id;
    signIn(guest);
    await accept(created.token);
    return guest;
  }

  it("al borrar una lista compartida se borran también los movimientos de los miembros", async () => {
    const { list } = await createList();
    const guest = await join(list.id);
    const taxi = await createTransaction(guest, 40, { category: await createCategory(guest) });
    await add(list.id, [taxi]);

    signIn(ownerId);
    const deleted = await deleteRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: list.id }));

    expect(deleted.status).toBe(204);
    expect(await prisma.transaction.findUnique({ where: { id: taxi } })).toBeNull();
  });

  it("la lista privada no se puede compartir", async () => {
    expect((await invite(await ensurePrivateListId(ownerId))).status).toBe(403);
  });

  it("el invitado ve la vista previa, se une y el dueño recibe un aviso", async () => {
    const { list } = await createList();
    const { status, invite: created } = await invite(list.id);
    const guest = (await createUser()).id;
    signIn(guest);

    const preview = (await (await previewRoute(new Request(BASE_URL), params({ token: created.token }))).json()) as TInvitePreview;
    const accepted = await accept(created.token);

    expect(status).toBe(201);
    expect(await prisma.transactionListInvite.findFirst({ where: { tokenHash: created.token } })).toBeNull();
    expect(preview).toMatchObject({ listId: list.id, ownerName: "Ana", role: "editor", isMember: false });
    expect(await accepted.json()).toEqual({ listId: list.id, joined: true });
    expect((await detail(list.id)).role).toBe("editor");
    expect(await prisma.notification.findMany({ where: { userId: ownerId }, select: { type: true } })).toEqual([
      { type: "list.joined" },
    ]);
  });

  it("invitar por correo deja la invitación pendiente a nombre de ese correo, sin exponer el token", async () => {
    const { list } = await createList();

    const response = await emailInviteRoute(
      json({ role: "viewer", email: " Diego@Gmail.com ", locale: "es" }),
      params({ id: list.id }),
    );
    const body = await response.json();
    const pending = (await (await invitesRoute(new Request(BASE_URL), params({ id: list.id }))).json()) as TListInvite[];

    expect(response.status).toBe(201);
    expect(body).not.toHaveProperty("token");
    expect(pending).toEqual([expect.objectContaining({ role: "viewer", email: "diego@gmail.com" })]);
  });

  it("un correo inválido se rechaza", async () => {
    const { list } = await createList();

    const response = await emailInviteRoute(json({ role: "viewer", email: "no-es-correo" }), params({ id: list.id }));

    expect(response.status).toBe(422);
  });

  it("un link sirve una sola vez", async () => {
    const { list } = await createList();
    const { invite: created } = await invite(list.id);
    signIn((await createUser()).id);
    await accept(created.token);

    signIn((await createUser()).id);
    expect((await accept(created.token)).status).toBe(410);
  });

  it("una invitación revocada ya no sirve y deja de estar pendiente", async () => {
    const { list } = await createList();
    const { invite: created } = await invite(list.id);

    await revokeRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: list.id, inviteId: created.id }));
    const pending = (await (await invitesRoute(new Request(BASE_URL), params({ id: list.id }))).json()) as TListInvite[];

    signIn((await createUser()).id);
    expect(pending).toEqual([]);
    expect((await accept(created.token)).status).toBe(410);
  });

  it("el editor agrega lo suyo y el detalle reparte los totales por persona", async () => {
    const { list } = await createList();
    await add(list.id, [await createTransaction(ownerId, 100)]);
    const guest = await join(list.id);
    const guestCategory = await createCategory(guest, "Taxi");
    await add(list.id, [await createTransaction(guest, 40, { category: guestCategory })]);

    const result = await detail(list.id);
    const page = (await (await entriesRoute(new Request(`${BASE_URL}/api/list/x/entries`), params({ id: list.id }))).json()) as TListEntryPage;

    expect(result).toMatchObject({ memberCount: 2, expenseTotal: 140 });
    expect(result.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: ownerId, expense: 100 }),
        expect.objectContaining({ userId: guest, expense: 40 }),
      ]),
    );
    expect(page.items.find((item) => item.authorId === guest)?.category).toMatchObject({ name: "Taxi" });
  });

  it("un lector no agrega ni invita", async () => {
    const { list } = await createList();
    const guest = await join(list.id, "viewer");

    expect((await add(list.id, [await createTransaction(guest, 10, { category: await createCategory(guest) })])).status).toBe(403);
    expect((await invite(list.id)).status).toBe(403);
  });

  it("al salir, sus movimientos vuelven a su historial y dejan de contar", async () => {
    const { list } = await createList();
    const guest = await join(list.id);
    const taxi = await createTransaction(guest, 40, { category: await createCategory(guest) });
    await add(list.id, [taxi]);

    const left = await removeMemberRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: list.id, userId: guest }));

    expect(left.status).toBe(204);
    expect(await prisma.transaction.findUnique({ where: { id: taxi } })).toMatchObject({
      listId: await ensurePrivateListId(guest),
    });
    expect((await detailRoute(new Request(BASE_URL), params({ id: list.id }))).status).toBe(404);
    signIn(ownerId);
    expect(await detail(list.id)).toMatchObject({ memberCount: 1, count: 0 });
  });

  it("el dueño cambia el rol y puede sacar a un miembro", async () => {
    const { list } = await createList();
    const guest = await join(list.id);
    signIn(ownerId);

    await updateMemberRoute(json({ role: "viewer" }, "PATCH"), params({ id: list.id, userId: guest }));
    expect((await detail(list.id)).members.find((member) => member.userId === guest)?.role).toBe("viewer");

    await removeMemberRoute(new Request(BASE_URL, { method: "DELETE" }), params({ id: list.id, userId: guest }));
    expect((await detail(list.id)).memberCount).toBe(1);
  });

  it("al heredar la lista, el nuevo dueño recibe un aviso", async () => {
    const { list } = await createList();
    const guest = await join(list.id);

    await listUseCases.handOver.execute(ownerId);

    expect(await prisma.notification.findMany({ where: { userId: guest }, select: { type: true } })).toEqual([
      { type: "list.owned" },
    ]);
  });
});
