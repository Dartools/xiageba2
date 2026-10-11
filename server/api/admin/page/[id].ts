import { prisma } from "#server/lib/prisma";
import { assertValidSlug } from "#server/lib/page";

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, message: "缺少页面 ID" });

  const method = event.method;

  if (method === "PUT") {
    const body = await readBody(event);
    const data: any = {};

    if (body?.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        throw createError({ statusCode: 400, message: "页面标题不能为空" });
      }
      if (title.length > 255) {
        throw createError({
          statusCode: 400,
          message: "页面标题不能超过 255 个字符",
        });
      }
      data.title = title;
    }

    if (body?.slug !== undefined) {
      const slug = assertValidSlug(body.slug);
      const exist = await prisma.page.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });
      if (exist) {
        throw createError({
          statusCode: 400,
          message: `URL 缩略名 "${slug}" 已存在，请更换`,
        });
      }
      data.slug = slug;
    }

    if (body?.content !== undefined) data.content = String(body.content ?? "");
    if (body?.icon !== undefined) data.icon = String(body.icon).trim() || "file-text";
    if (body?.status === "DRAFT" || body?.status === "PUBLISHED") {
      data.status = body.status;
    }
    if (body?.sort !== undefined && Number.isFinite(parseInt(body.sort))) {
      data.sort = parseInt(body.sort);
    }

    if (Object.keys(data).length === 0) {
      throw createError({ statusCode: 400, message: "没有需要更新的字段" });
    }

    try {
      const updated = await prisma.page.update({ where: { id }, data });
      return { success: true, data: updated };
    } catch (e: any) {
      if (e?.code === "P2002") {
        throw createError({
          statusCode: 400,
          message: `URL 缩略名 "${data.slug}" 已存在，请更换`,
        });
      }
      if (e?.code === "P2025") {
        throw createError({ statusCode: 404, message: "页面不存在" });
      }
      throw e;
    }
  }

  if (method === "DELETE") {
    try {
      await prisma.page.delete({ where: { id } });
      return { success: true };
    } catch (e: any) {
      if (e?.code === "P2025") {
        throw createError({ statusCode: 404, message: "页面不存在" });
      }
      throw e;
    }
  }

  throw createError({ statusCode: 405, message: "不支持的请求方法" });
});
