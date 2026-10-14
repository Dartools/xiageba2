import { getAppDownloadConfig } from "#server/lib/appConfig";

/**
 * 前台 APP 下载配置（公开读接口，供 /page/app 下载页使用）
 */
export default defineCachedEventHandler(
  async () => {
    const config = await getAppDownloadConfig();
    return { data: config };
  },
  {
    name: "app-config-data",
    maxAge: 30 * 60,
    staleMaxAge: 2 * 60 * 60, // 强制过期
    swr: true,
  },
);
