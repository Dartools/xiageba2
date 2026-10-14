<script setup lang="ts">
import { computed } from "vue";
import type { ButtonProps } from "@nuxt/ui";
import {
  DEFAULT_APP_PREVIEW_IMAGE,
  emptyAppConfig,
  type AppDownloadConfig,
} from "~/utils/app";

defineOptions({ name: "AppDownloadPage" });

const { siteShortTitle, siteDescription } = await useSiteSeo();

interface AppConfigResponse {
  data: AppDownloadConfig;
}

const { data } = await useFetch<AppConfigResponse>("/api/app/config", {
  default: () => ({ data: emptyAppConfig() }),
  key: "app-config",
  dedupe: "defer",
});

const appConfig = computed<AppDownloadConfig>(
  () => data.value?.data || emptyAppConfig(),
);

/** 是否配置了 APK 下载地址 */
const hasApk = computed(() => !!appConfig.value.apkUrl);

/** 预览图地址，未配置时回落到默认图 */
const previewImage = computed(
  () => appConfig.value.previewImageUrl || DEFAULT_APP_PREVIEW_IMAGE,
);

/** 版本号文案：优先「v版本名（Build 版本码）」，单独存在时取其一 */
const versionText = computed(() => {
  const { versionName, versionCode } = appConfig.value;
  if (versionName && versionCode > 0) {
    return `v${versionName}（Build ${versionCode}）`;
  }
  if (versionName) return `v${versionName}`;
  if (versionCode > 0) return `Build ${versionCode}`;
  return "";
});

/** CTA 按钮组：配置了下载地址才展示 */
const ctaLinks = computed<ButtonProps[]>(() => {
  if (!hasApk.value) return [];
  return [
    {
      label: "安卓 APK 下载",
      icon: "i-lucide-download",
      to: appConfig.value.apkUrl,
      target: "_blank",
      color: "primary",
      size: "lg",
    },
  ];
});

useSeoMeta({
  title: "APP 下载",
  description: `下载 APP 客户端 - ${siteShortTitle}`,
  ogTitle: "APP 下载",
  ogDescription: `下载 APP 客户端 - ${siteShortTitle}`,
  twitterTitle: "APP 下载",
  twitterDescription: `下载 APP 客户端 - ${siteShortTitle}`,
});
</script>

<template>
  <div class="py-4">
    <UPageCTA
      orientation="horizontal"
      variant="soft"
      :links="ctaLinks"
      :ui="{
        container: 'py-10 sm:py-16 gap-6 sm:gap-10',
      }"
    >
      <template #title>
        <div class="flex flex-wrap items-center gap-2">
          <span>{{ siteShortTitle }} APP 下载</span>
        </div>
      </template>

      <template #description>
        <div class="flex flex-col gap-2">
          <p class="text-muted">{{ siteDescription }}</p>
          <p v-if="appConfig.updateDesc" class="text-muted">
            更新日志：{{ appConfig.updateDesc }}
          </p>
          <p v-else class="text-muted">安装包下载与版本信息将展示在这里。</p>
          <p v-if="!hasApk" class="mt-4 text-sm">
            暂未配置 APK 下载地址，请稍后再试。
          </p>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="appConfig.versionName"
              color="primary"
              variant="soft"
              size="lg"
            >
              v{{ appConfig.versionName }}
            </UBadge>
            <UBadge
              v-if="appConfig.versionCode > 0"
              color="neutral"
              variant="subtle"
              size="lg"
            >
              Build {{ appConfig.versionCode }}
            </UBadge>
          </div>
        </div>
      </template>

      <img
        :src="previewImage"
        alt="APP 预览图"
        width="360"
        height="680"
        class="mx-auto w-44 sm:w-56 rounded-xl shadow-lg ring-1 ring-default"
        loading="lazy"
      />
    </UPageCTA>
  </div>
</template>
