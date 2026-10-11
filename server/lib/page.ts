/** 页面 slug 规范：小写字母/数字，以短横线分隔，不能以短横线开头或结尾 */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 系统保留 slug：已存在同路径的独立前端路由，不允许被自定义页面占用 */
export const RESERVED_SLUGS = new Set(["forbidden-keywords"]);

/** 校验并规范化 slug，不合法时直接抛出 400 */
export function assertValidSlug(slug: unknown): string {
  const value = String(slug ?? "").trim();
  if (!value) {
    throw createError({ statusCode: 400, message: "URL 缩略名不能为空" });
  }
  if (value.length > 100) {
    throw createError({
      statusCode: 400,
      message: "URL 缩略名不能超过 100 个字符",
    });
  }
  if (!SLUG_REGEX.test(value)) {
    throw createError({
      statusCode: 400,
      message:
        "URL 缩略名只能包含小写字母、数字和短横线，且不能以短横线开头或结尾",
    });
  }
  if (RESERVED_SLUGS.has(value)) {
    throw createError({
      statusCode: 400,
      message: `URL 缩略名 "${value}" 为系统保留，请更换`,
    });
  }
  return value;
}
