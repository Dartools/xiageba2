/**
 * 页面装修：系统预设入口（仅服务端）
 *
 * 只被服务端使用：
 * 1. 保存配置时补全/校验 preset 来源的条目
 * 2. 通过后台接口 /api/admin/config/layout-default 下发给装修页
 *
 * 前端不 import 本文件，改为从接口读取，避免预设数据进入客户端产物。
 */

export const LAYOUT_LINK_PRESETS = [
  {
    key: "announcement",
    label: "公告列表",
    to: "/announcement",
    icon: "megaphone",
  },
  { key: "novel", label: "百度小说", to: "/book", icon: "book-open" },
  {
    key: "forbidden",
    label: "屏蔽词列表",
    to: "/page/forbidden-keywords",
    icon: "shield-ban",
  },
] as const;

export type LayoutPresetKey = (typeof LAYOUT_LINK_PRESETS)[number]["key"];

/** 按预设 key 查找 */
export function findLayoutPreset(key: unknown) {
  const value = typeof key === "string" ? key.trim() : "";
  if (!value) return undefined;
  return LAYOUT_LINK_PRESETS.find((p) => p.key === value);
}

/** 按链接地址反查预设（迁移旧数据时用于还原 source） */
export function findLayoutPresetByTo(to: unknown) {
  const value = String(to ?? "").trim();
  if (!value) return undefined;
  return LAYOUT_LINK_PRESETS.find((p) => p.to === value);
}

/** 预设 key 是否合法 */
export function isLayoutPresetKey(key: unknown): key is LayoutPresetKey {
  return !!findLayoutPreset(key);
}
