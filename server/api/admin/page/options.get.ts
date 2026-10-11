import { prisma } from "#server/lib/prisma";

/**
 * 页面下拉选项：供「页面装修 → 自定义页面」关联已创建的页面。
 * 不分页，仅返回必要字段。
 */
export default defineEventHandler(async () => {
  const pages = await prisma.page.findMany({
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      icon: true,
      status: true,
    },
    take: 500,
    skip: 0,
  });

  return { data: pages };
});
