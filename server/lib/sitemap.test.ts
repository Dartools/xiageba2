import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * sitemap 生成逻辑测试
 *
 * 覆盖：
 * 1. 分片数量计算与收录上限裁剪
 * 2. XML 转义（loc 里出现 & 会让爬虫把整个文件判为无效）
 * 3. 分片页码校验（越界 404，非数字 404）
 * 4. 查询的 skip/take 与 lastmod 取值
 *
 * 环境说明：vitest 是纯 node 环境，没有 Nitro 运行时全局，
 * 这里把 defineCachedFunction 打桩成「直接返回原函数」，
 * 让 count 走真实的 mock prisma。
 */

vi.stubGlobal("defineCachedFunction", (fn: unknown) => fn);

const h = vi.hoisted(() => ({
  sourceRows: [] as any[],
  musicRows: [] as any[],
  sourceCount: 0,
  musicCount: 0,
  pageParam: "1",
  lastFindManyArgs: null as any,
}));

vi.mock("#server/lib/prisma", () => ({
  prisma: {
    source: {
      count: async () => h.sourceCount,
      findMany: async (args: any) => {
        h.lastFindManyArgs = args;
        return h.sourceRows;
      },
    },
    music: {
      count: async () => h.musicCount,
      findMany: async (args: any) => {
        h.lastFindManyArgs = args;
        return h.musicRows;
      },
    },
  },
}));

vi.stubGlobal(
  "getRouterParam",
  (_event: unknown, _name: string) => h.pageParam,
);
vi.stubGlobal("createError", (opts: any) =>
  Object.assign(new Error(opts.message || "error"), opts),
);

const {
  SITEMAP_PAGE_SIZE,
  assertSitemapPage,
  buildShardLocs,
  clampTotal,
  countSitemapMusics,
  countSitemapSources,
  escapeXml,
  fetchSourceUrls,
  parseSitemapName,
  renderSitemapIndex,
  renderUrlset,
  totalPages,
} = await import("./sitemap");

beforeEach(() => {
  h.sourceRows = [];
  h.musicRows = [];
  h.sourceCount = 0;
  h.musicCount = 0;
  h.pageParam = "1";
  h.lastFindManyArgs = null;
});

describe("escapeXml", () => {
  it("转义 XML 保留字符，且 & 不会被二次转义", () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });

  it("普通 URL 原样返回", () => {
    expect(escapeXml("https://so.liumingye.cn/music/abc123")).toBe(
      "https://so.liumingye.cn/music/abc123",
    );
  });
});

describe("clampTotal / totalPages", () => {
  it("默认收录上限 5000，超出被裁剪", () => {
    expect(clampTotal(10_000)).toBe(5_000);
    expect(clampTotal(936_576)).toBe(5_000);
  });

  it("未超上限时原样返回", () => {
    expect(clampTotal(111)).toBe(111);
  });

  it("非法值归零", () => {
    expect(clampTotal(Number.NaN)).toBe(0);
    expect(clampTotal(-1)).toBe(0);
  });

  it("分片数按 45000 一页向上取整，至少 1 片", () => {
    expect(SITEMAP_PAGE_SIZE).toBe(1_000);
    expect(totalPages(0)).toBe(1);
    expect(totalPages(1)).toBe(1);
    expect(totalPages(1_000)).toBe(1);
    expect(totalPages(1_001)).toBe(2);
    expect(totalPages(5_000)).toBe(5);
  });
});

describe("parseSitemapName", () => {
  it("识别 static / source / music 三种分片", () => {
    expect(parseSitemapName("static.xml")).toEqual({ kind: "static" });
    expect(parseSitemapName("source-1.xml")).toEqual({
      kind: "source",
      page: 1,
    });
    expect(parseSitemapName("music-12.xml")).toEqual({
      kind: "music",
      page: 12,
    });
  });

  it("非法文件名一律返回 null（调用方 404）", () => {
    for (const bad of [
      "",
      "foo.xml",
      "source.xml",
      "source-.xml",
      "source-0.xml",
      "source-1.5.xml",
      "source-1e3.xml",
      "source--1.xml",
      "source-1",
      "music-1.html",
      "static.xml.gz",
      "SOURCE-1.xml",
    ]) {
      expect(parseSitemapName(bad)).toBeNull();
    }
  });
});

describe("assertSitemapPage", () => {
  it("页码在范围内时原样返回", () => {
    expect(assertSitemapPage(1, 200_000)).toBe(1);
    expect(assertSitemapPage(5, 200_000)).toBe(5);
  });

  it("越界 / 非正整数抛 404", () => {
    for (const bad of [0, -1, 6, 1.5, Number.NaN]) {
      expect(() => assertSitemapPage(bad, 200_000)).toThrow();
      try {
        assertSitemapPage(bad, 200_000);
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
      }
    }
  });
});

describe("fetchSourceUrls", () => {
  it("skip/take 按页码换算，loc 拼成绝对地址", async () => {
    h.sourceRows = [
      {
        id: "abc",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: null,
      },
    ];
    h.pageParam = "3";

    const urls = await fetchSourceUrls("https://so.liumingye.cn", 3);

    expect(h.lastFindManyArgs.skip).toBe(2 * SITEMAP_PAGE_SIZE);
    expect(h.lastFindManyArgs.take).toBe(SITEMAP_PAGE_SIZE);
    expect(urls[0].loc).toBe("https://so.liumingye.cn/source/abc");
    // updatedAt 为空时回退到 createdAt
    expect(urls[0].lastmod).toBe("2026-01-01T00:00:00.000Z");
  });

  it("updatedAt 存在时优先用它作为 lastmod", async () => {
    h.sourceRows = [
      {
        id: "def",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-05-05T00:00:00.000Z"),
      },
    ];

    const urls = await fetchSourceUrls("https://so.liumingye.cn", 1);

    expect(urls[0].lastmod).toBe("2026-05-05T00:00:00.000Z");
  });

  it("第一页 skip 为 0", async () => {
    await fetchSourceUrls("https://so.liumingye.cn", 1);
    expect(h.lastFindManyArgs.skip).toBe(0);
  });
});

describe("renderUrlset", () => {
  it("输出合法的 urlset 骨架并转义 loc", () => {
    const xml = renderUrlset([
      {
        loc: "https://x.cn/music/a?b=1&c=2",
        lastmod: "2026-01-01T00:00:00.000Z",
        changefreq: "weekly",
        priority: "0.7",
      },
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain("<loc>https://x.cn/music/a?b=1&amp;c=2</loc>");
    expect(xml).toContain("<lastmod>2026-01-01T00:00:00.000Z</lastmod>");
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("缺省字段不输出对应节点", () => {
    const xml = renderUrlset([{ loc: "https://x.cn/" }]);
    expect(xml).not.toContain("<lastmod>");
    expect(xml).not.toContain("<changefreq>");
    expect(xml).not.toContain("<priority>");
  });
});

describe("renderSitemapIndex / buildShardLocs", () => {
  it("输出合法的 sitemapindex 骨架", () => {
    const xml = renderSitemapIndex([
      { loc: "https://x.cn/sitemap/static.xml" },
    ]);
    expect(xml).toContain(
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain("<loc>https://x.cn/sitemap/static.xml</loc>");
    expect(xml.trimEnd().endsWith("</sitemapindex>")).toBe(true);
  });

  it("分片地址从 1 开始连续编号，且能被 parseSitemapName 反向解析", () => {
    const locs = buildShardLocs("https://x.cn", "source", 3);
    expect(locs.map((l) => l.loc)).toEqual([
      "https://x.cn/sitemap/source-1.xml",
      "https://x.cn/sitemap/source-2.xml",
      "https://x.cn/sitemap/source-3.xml",
    ]);

    // 关键回归：index 里给出的地址必须能被分片路由解析回同一个分片
    for (const [i, entry] of locs.entries()) {
      const name = entry.loc.split("/").pop()!;
      expect(parseSitemapName(name)).toEqual({ kind: "source", page: i + 1 });
    }
  });
});
