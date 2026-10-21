import { prisma } from "#server/lib/prisma";

/**
 * 后台单条音乐查询
 *
 * 供编辑页加载数据使用：与公开接口不同，这里不做 status 过滤，
 * 已禁用的歌曲也要能进编辑页修改。
 */
export default defineEventHandler(async (event) => {
  const id = event.context.params?.id as string;

  if (!id) {
    throw createError({ statusCode: 400, message: "缺少音乐ID" });
  }

  const music = await prisma.music.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      artist: true,
      album: true,
      cover: true,
      lyrics: true,
      playUrl: true,
      downloads: true,
      status: true,
    },
  });

  if (!music) {
    throw createError({ statusCode: 404, message: "音乐不存在" });
  }

  return {
    ...music,
    downloads: music.downloads || [],
  };
});
