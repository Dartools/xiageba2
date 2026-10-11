import {
  SITEMAP_MAX_AGE,
  SITEMAP_VARIES,
  STATIC_PAGES,
  assertSitemapPage,
  countSitemapMusics,
  countSitemapSources,
  fetchMusicUrls,
  fetchPageUrls,
  fetchSourceUrls,
  parseSitemapName,
  renderUrlset,
  type SitemapUrl,
} from "#server/lib/sitemap";

/**
 * sitemap 分片
 * GET /sitemap/static.xml
 * GET /sitemap/source-<n>.xml
 * GET /sitemap/music-<n>.xml
 *
 * 用一个路由承接所有分片：radix3 的动态段会吃到下一个 "/"，
 * 无法表达 "/sitemap-music-:page.xml"，所以文件名整体作为参数，自己解析。
 * 非法文件名与越界页码都返回 404（错误响应不进缓存）。
 */
export default defineCachedEventHandler(
  async (event) => {
    const { origin } = getRequestURL(event);
    const shard = parseSitemapName(
      String(getRouterParam(event, "name") || ""),
    );

    if (!shard) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        message: "sitemap 分片不存在",
      });
    }

    let urls: SitemapUrl[];

    if (shard.kind === "static") {
      const [staticUrls, pageUrls] = await Promise.all([
        Promise.resolve(
          STATIC_PAGES.map(({ path, ...rest }) => ({
            loc: `${origin}${path}`,
            ...rest,
          })),
        ),
        fetchPageUrls(origin),
      ]);
      urls = [...staticUrls, ...pageUrls];
    } else if (shard.kind === "source") {
      assertSitemapPage(shard.page, await countSitemapSources());
      urls = await fetchSourceUrls(origin, shard.page);
    } else {
      assertSitemapPage(shard.page, await countSitemapMusics());
      urls = await fetchMusicUrls(origin, shard.page);
    }

    setResponseHeader(event, "content-type", "application/xml");
    return renderUrlset(urls);
  },
  {
    maxAge: SITEMAP_MAX_AGE,
    // <loc> 是绝对地址，随域名变化，缓存键必须按域名隔离
    varies: SITEMAP_VARIES,
  },
);
