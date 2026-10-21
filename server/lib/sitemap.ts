import { prisma } from "#server/lib/prisma";

/**
 * sitemap 生成相关的常量、查询与渲染工具
 *
 *   /sitemap.xml              → sitemapindex（只列分片地址，不含 URL）
 *   /sitemap/static.xml       → 静态页（数量固定，单文件足够）
 *   /sitemap/source-<n>.xml   → 资源详情页分片
 *   /sitemap/music-<n>.xml    → 音乐详情页分片
 *
 * ⚠️ 分片路径为什么是 /sitemap/<name> 而不是 /sitemap-music-<n>.xml：
 * Nitro 用 radix3 做路由匹配，而 radix3 的动态段会一直吃到下一个 "/"，
 * 不支持 ":page.xml" 这种「参数 + 静态后缀」的写法 —— 注册出来的路由
 * /sitemap-music-:page.xml 永远匹配不上（实测返回 null）。
 * 因此统一走 /sitemap/:name 一个路由，由 parseSitemapName 自己解析文件名。
 *
 * sitemap 协议限制（https://www.sitemaps.org/protocol.html）：
 */

/** 缓存时长：1 小时（秒） */
export const SITEMAP_MAX_AGE = 60 * 60;

/**
 * 单个 sitemap 文件的 URL 上限。
 */
export const SITEMAP_PAGE_SIZE = 1_000;

/**
 * 每种内容最多收录多少条（按 createdAt 倒序，即收录最近的内容）。
 *
 * ⚠️ 这不是协议限制，而是内存保护：sitemap 响应会被 defineCachedEventHandler
 *
 * 设为 0 表示不限制（全量收录）——确认机器内存充足后再开。
 * 通过环境变量 NUXT_SITEMAP_MAX_URLS 覆盖。
 */
const MAX_URLS_PER_SET = Number(
  Number.isFinite(Number(process.env.NUXT_SITEMAP_MAX_URLS))
    ? process.env.NUXT_SITEMAP_MAX_URLS
    : 5_000,
);

/**
 * 站点是同一套代码部署在多个镜像域名上的，sitemap 里的 <loc> 必须是绝对地址，
 * 而绝对地址取决于请求的 host/x-forwarded-*，所以缓存键必须按这些头隔离，
 * 否则 A 域名缓存的 sitemap 会被发给 B 域名，导致 sitemap 与 canonical 不一致。
 */
export const SITEMAP_VARIES = ["host", "x-forwarded-host", "x-forwarded-proto"];

export interface SitemapUrl {
  path?: string;
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

/** 静态页面。数量固定，不需要分片。 */
export const STATIC_PAGES: Omit<SitemapUrl, "loc">[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/page/forbidden-keywords", changefreq: "weekly", priority: "0.3" },
];

/** XML 保留字符转义。loc 里出现 & 会导致爬虫解析整个文件失败。 */
export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 条数上限裁剪（0 = 不限制） */
export function clampTotal(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!MAX_URLS_PER_SET || MAX_URLS_PER_SET <= 0) return total;
  return Math.min(total, MAX_URLS_PER_SET);
}

/** 需要多少个分片（至少 1 个，即使一条都没有） */
export function totalPages(total: number): number {
  const clamped = clampTotal(total);
  if (clamped <= 0) return 1;
  return Math.ceil(clamped / SITEMAP_PAGE_SIZE);
}

export type SitemapShard =
  | { kind: "static" }
  | { kind: "source"; page: number }
  | { kind: "music"; page: number };

/**
 * 解析 /sitemap/:name 里的文件名。
 * 只认 static.xml / source-<n>.xml / music-<n>.xml，其余一律 null（调用方 404）。
 */
export function parseSitemapName(name: string): SitemapShard | null {
  if (!name.endsWith(".xml")) return null;
  const base = name.slice(0, -".xml".length);

  if (base === "static") return { kind: "static" };

  // 严格正整数：parseInt 会把 "1.5" 解析成 1，这里直接不匹配
  const matched = /^(source|music)-(\d+)$/.exec(base);
  if (!matched) return null;

  const page = Number(matched[2]);
  if (page < 1) return null;

  return { kind: matched[1] as "source" | "music", page };
}

/**
 * 校验分片页码在范围内，越界抛 404。
 * 错误响应不会被 Nitro 缓存（validate 会跳过 code >= 400），不会污染缓存。
 */
export function assertSitemapPage(page: number, total: number): number {
  const max = totalPages(total);
  if (!Number.isInteger(page) || page < 1 || page > max) {
    throw createError({
      statusCode: 404,
      statusMessage: "Not Found",
      message: `sitemap 分片不存在（共 ${max} 片）`,
    });
  }
  return page;
}

function lastmodOf(updatedAt: Date | null, createdAt: Date): string {
  return (updatedAt || createdAt).toISOString();
}

/**
 * 资源总数（缓存 1 小时）。
 * index 与所有分片都要用它判断分页边界，缓存后避免每片各查一次 count。
 */
export const countSitemapSources = defineCachedFunction(
  async (): Promise<number> =>
    prisma.source.count({
      where: { status: 1 },
    }),
  {
    name: "sitemap-count-source",
    maxAge: SITEMAP_MAX_AGE,
  },
);

/** 音乐总数（缓存 1 小时） */
export const countSitemapMusics = defineCachedFunction(
  async (): Promise<number> =>
    prisma.music.count({
      where: { status: 1 },
    }),
  {
    name: "sitemap-count-music",
    maxAge: SITEMAP_MAX_AGE,
  },
);

/** 取某一页资源详情的 sitemap 条目（loc 拼成绝对地址） */
export async function fetchSourceUrls(
  origin: string,
  page: number,
): Promise<SitemapUrl[]> {
  const rows = await prisma.source.findMany({
    where: { status: 1 },
    select: { id: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * SITEMAP_PAGE_SIZE,
    take: SITEMAP_PAGE_SIZE,
  });

  return rows.map((row) => ({
    loc: `${origin}/source/${row.id}`,
    lastmod: lastmodOf(row.updatedAt, row.createdAt),
    changefreq: "weekly",
    priority: "0.6",
  }));
}

/** 取某一页音乐详情的 sitemap 条目（loc 拼成绝对地址） */
export async function fetchMusicUrls(
  origin: string,
  page: number,
): Promise<SitemapUrl[]> {
  const rows = await prisma.music.findMany({
    where: { status: 1 },
    select: { id: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * SITEMAP_PAGE_SIZE,
    take: SITEMAP_PAGE_SIZE,
  });

  return rows.map((row) => ({
    loc: `${origin}/music/${row.id}`,
    lastmod: lastmodOf(row.updatedAt, row.createdAt),
    changefreq: "weekly",
    priority: "0.7",
  }));
}

/**
 * 自定义页面（后台「页面管理」）的 sitemap 条目。
 * 页面已由 STATIC_PAGES 中的硬编码路径改为数据库驱动，这里统一按 slug 生成。
 */
export async function fetchPageUrls(origin: string): Promise<SitemapUrl[]> {
  const rows = await prisma.page.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    loc: `${origin}/page/${row.slug}`,
    lastmod: lastmodOf(row.updatedAt, row.createdAt),
    changefreq: "monthly",
    priority: "0.3",
  }));
}

/** 渲染 urlset（紧凑单行，减小体积） */
export function renderUrlset(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      let out = `  <url><loc>${escapeXml(u.loc)}</loc>`;
      if (u.lastmod) out += `<lastmod>${escapeXml(u.lastmod)}</lastmod>`;
      if (u.changefreq) out += `<changefreq>${u.changefreq}</changefreq>`;
      if (u.priority) out += `<priority>${u.priority}</priority>`;
      return `${out}</url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

/** 渲染 sitemapindex。lastmod 可选，这里不输出：全局一个时间无助于增量抓取。 */
export function renderSitemapIndex(entries: SitemapIndexEntry[]): string {
  const body = entries
    .map((e) => {
      let out = `  <sitemap><loc>${escapeXml(e.loc)}</loc>`;
      if (e.lastmod) out += `<lastmod>${escapeXml(e.lastmod)}</lastmod>`;
      return `${out}</sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

/** 组装 index 里的分片地址（与 parseSitemapName 的格式必须保持一致） */
export function buildShardLocs(
  origin: string,
  prefix: "source" | "music",
  pages: number,
): SitemapIndexEntry[] {
  return Array.from({ length: pages }, (_, i) => ({
    loc: `${origin}/sitemap/${prefix}-${i + 1}.xml`,
  }));
}
