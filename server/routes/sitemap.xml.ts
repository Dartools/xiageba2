import {
  SITEMAP_MAX_AGE,
  SITEMAP_VARIES,
  buildShardLocs,
  countSitemapMusics,
  countSitemapSources,
  renderSitemapIndex,
  totalPages,
} from "#server/lib/sitemap";

/**
 * sitemap 索引
 * GET /sitemap.xml
 *
 * robots.txt 里声明的 Sitemap 地址仍然是这里，无需改动。
 */
export default defineCachedEventHandler(
  async (event) => {
    const { origin } = getRequestURL(event);

    const [sourceTotal, musicTotal] = await Promise.all([
      countSitemapSources(),
      countSitemapMusics(),
    ]);

    const entries = [
      { loc: `${origin}/sitemap/static.xml` },
      ...buildShardLocs(origin, "source", totalPages(sourceTotal)),
      ...buildShardLocs(origin, "music", totalPages(musicTotal)),
    ];

    setResponseHeader(event, "content-type", "application/xml");
    return renderSitemapIndex(entries);
  },
  {
    maxAge: SITEMAP_MAX_AGE,
    // <loc> 是绝对地址，随域名变化，缓存键必须按域名隔离
    varies: SITEMAP_VARIES,
  },
);
