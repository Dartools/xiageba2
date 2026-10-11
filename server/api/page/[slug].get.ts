import { prisma } from "#server/lib/prisma";

/** 前台按 slug 读取已发布页面（公开读接口） */
export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, "slug") || "").trim();
  if (!slug) {
    throw createError({ statusCode: 400, message: "缺少页面 slug" });
  }

  const page = await prisma.page.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      icon: true,
    },
  });

  if (!page) {
    throw createError({ statusCode: 404, message: "页面不存在或未发布" });
  }

  return { data: page };
});
