import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 音乐批量操作接口测试
 *
 * 锁定状态开关相关的两类问题：
 * 1. 入参校验（空列表、超量、非法状态值、不支持的动作）必须在写库前拦截
 * 2. status 动作必须走 updateMany 且只改 status 字段
 */

const h = vi.hoisted(() => ({
  body: {} as any,
  updateManyCalls: [] as any[],
  deleteManyCalls: [] as any[],
}));

vi.mock("#server/lib/prisma", () => ({
  prisma: {
    music: {
      updateMany: async (args: any) => {
        h.updateManyCalls.push(args);
        return { count: args.where.id.in.length };
      },
      deleteMany: async (args: any) => {
        h.deleteManyCalls.push(args);
        return { count: args.where.id.in.length };
      },
    },
  },
}));

// Nitro 自动导入：defineEventHandler 直接返回原函数，便于直接调用
vi.stubGlobal("defineEventHandler", (fn: any) => fn);
vi.stubGlobal("readBody", async () => h.body);
vi.stubGlobal("createError", (o: any) => ({ ...o }));

const { default: handler } = await import("./batch.post");

const fakeEvent = () => ({ method: "POST" });

// handler 用 createError 抛错，测试里统一捕获后按返回值断言
const run = async (body: any) => {
  h.body = body;
  try {
    return await handler(fakeEvent() as any);
  } catch (e) {
    return e as any;
  }
};

beforeEach(() => {
  h.body = {};
  h.updateManyCalls = [];
  h.deleteManyCalls = [];
});

describe("入参校验", () => {
  it("ids 为空直接拒绝，不写库", async () => {
    const res: any = await run({ action: "status", ids: [], status: 1 });

    expect(res.statusCode).toBe(400);
    expect(h.updateManyCalls.length).toBe(0);
  });

  it("ids 超量时直接拒绝，不写库", async () => {
    const res: any = await run({
      action: "status",
      ids: Array.from({ length: 1001 }, (_, i) => `id${i}`),
      status: 1,
    });

    expect(res.statusCode).toBe(400);
    expect(h.updateManyCalls.length).toBe(0);
  });

  it("过滤非法 id 并去重", async () => {
    await run({ action: "status", ids: ["a", "a", null, 123, {}, "b"], status: 1 });

    expect(h.updateManyCalls[0].where.id.in).toEqual(["a", "b"]);
  });

  it("status 不是 0/1 时拒绝，不写库", async () => {
    const res: any = await run({ action: "status", ids: ["a"], status: 2 });

    expect(res.statusCode).toBe(400);
    expect(h.updateManyCalls.length).toBe(0);
  });

  it("不支持的动作类型拒绝", async () => {
    const res: any = await run({ action: "category", ids: ["a"] });

    expect(res.statusCode).toBe(400);
    expect(h.updateManyCalls.length).toBe(0);
    expect(h.deleteManyCalls.length).toBe(0);
  });
});

describe("status 动作", () => {
  it("批量启用：updateMany 只写 status=1", async () => {
    const res: any = await run({ action: "status", ids: ["a", "b"], status: 1 });

    expect(res.success).toBe(true);
    expect(res.count).toBe(2);
    expect(h.updateManyCalls[0].data).toEqual({ status: 1 });
  });

  it("批量禁用：updateMany 只写 status=0", async () => {
    const res: any = await run({ action: "status", ids: ["a"], status: 0 });

    expect(res.count).toBe(1);
    expect(h.updateManyCalls[0].data).toEqual({ status: 0 });
  });

  it("字符串 '0' 也按禁用处理", async () => {
    await run({ action: "status", ids: ["a"], status: "0" });

    expect(h.updateManyCalls[0].data).toEqual({ status: 0 });
  });
});

describe("delete 动作", () => {
  it("批量删除走 deleteMany", async () => {
    const res: any = await run({ action: "delete", ids: ["a", "b", "c"] });

    expect(res.success).toBe(true);
    expect(res.count).toBe(3);
    expect(h.deleteManyCalls[0].where.id.in).toEqual(["a", "b", "c"]);
    expect(h.updateManyCalls.length).toBe(0);
  });
});
