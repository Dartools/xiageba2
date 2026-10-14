import {
  getAppDownloadConfig,
  saveAppDownloadConfig,
  AppUpdateStrategy,
  type AppDownloadConfig,
} from "#server/lib/appConfig";
import { clearCacheNitroHandlers } from "#server/utils/cache";

const STRATEGY_VALUES = [0, 1, 2, 3];

/**
 * APP 下载配置（后台「页面装修 → APP 下载配置」）
 *
 * GET  读取配置
 * POST 保存配置（整份提交，缺失字段回落默认值）
 */
export default defineEventHandler(async (event) => {
  const method = event.method;

  if (method === "GET") {
    const config = await getAppDownloadConfig();
    return { data: config };
  }

  if (method === "POST") {
    const body = (await readBody(event)) as
      | Partial<AppDownloadConfig>
      | undefined;
    if (!body || typeof body !== "object") {
      throw createError({ statusCode: 400, message: "配置内容不能为空" });
    }

    // versionCode：非负整数
    const versionCode = Number(body.versionCode ?? 0);
    if (!Number.isInteger(versionCode) || versionCode < 0) {
      throw createError({
        statusCode: 400,
        message: "versionCode 必须是非负整数",
      });
    }

    // updateStrategy：0-3，缺省按 0（不更新）
    const updateStrategy = Number(body.updateStrategy ?? AppUpdateStrategy.NONE);
    if (!STRATEGY_VALUES.includes(updateStrategy)) {
      throw createError({
        statusCode: 400,
        message: "更新策略必须是 0、1、2、3 之一",
      });
    }

    const saved = await saveAppDownloadConfig({
      versionName: body.versionName,
      versionCode,
      apkUrl: body.apkUrl,
      previewImageUrl: body.previewImageUrl,
      updateStrategy: updateStrategy as AppDownloadConfig["updateStrategy"],
      wgtUrl: body.wgtUrl,
      wgtMd5: body.wgtMd5,
      updateDesc: body.updateDesc,
    });

    // 前台接口带缓存，保存后立即失效，否则最长 30 分钟不生效
    await clearCacheNitroHandlers("app-config-data");

    return { success: true, data: saved };
  }

  throw createError({ statusCode: 405, message: "不支持的请求方法" });
});
