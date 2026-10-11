<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { Loader2, Globe, Palette } from "@lucide/vue";
import { get, post } from "~/utils/request";
import {
  emptyLayoutConfig,
  type LayoutDefaultConfig,
  type LayoutPreset,
  type PageOption,
} from "~/utils/page";

useSeoMeta({ title: "页面装修" });

const router = useRouter();
const { isLoggedIn, checkLogin, initialized } = useAuth();

/** 站点 SEO 配置（与 /api/admin/config/site-seo 字段一致） */
interface SiteSeoConfig {
  site_seo_title: string;
  site_seo_short_title: string;
  site_seo_description: string;
  site_icp_licence: string;
}

/** 空 SEO 骨架，字段留空时前台使用默认值 */
const emptySiteSeo = (): SiteSeoConfig => ({
  site_seo_title: "",
  site_seo_short_title: "",
  site_seo_description: "",
  site_icp_licence: "",
});

const config = ref<LayoutDefaultConfig>(emptyLayoutConfig());
const pageOptions = ref<PageOption[]>([]);
/** 预设入口由服务端下发 */
const presets = ref<LayoutPreset[]>([]);
const siteSeo = ref<SiteSeoConfig>(emptySiteSeo());

const loading = ref(false);
const saving = ref(false);
const saved = ref(false);
const error = ref("");

const loadConfig = async () => {
  loading.value = true;
  error.value = "";
  try {
    const [layoutRes, optionsRes, seoRes] = await Promise.all([
      get<{ data: LayoutDefaultConfig; presets: LayoutPreset[] }>(
        "/api/admin/config/layout-default",
      ),
      get<{ data: PageOption[] }>("/api/admin/page/options"),
      get<{ data: Partial<SiteSeoConfig> }>("/api/admin/config/site-seo"),
    ]);
    config.value = {
      ...emptyLayoutConfig(),
      ...(layoutRes?.data || {}),
    };
    presets.value = layoutRes?.presets || [];
    pageOptions.value = optionsRes?.data || [];
    siteSeo.value = { ...emptySiteSeo(), ...(seoRes?.data || {}) };
  } catch (e: any) {
    const err = e?.response?.data;
    error.value = err?.message || "配置加载失败";
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (!initialized.value) checkLogin();
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (!isLoggedIn.value) {
    router.push("/admin/login");
    return;
  }
  await loadConfig();
});

const save = async () => {
  saving.value = true;
  saved.value = false;
  error.value = "";
  try {
    // 先保存装修配置（带校验），再保存站点 SEO，任一失败都会提示
    await post("/api/admin/config/layout-default", config.value);
    await post("/api/admin/config/site-seo", siteSeo.value);
    saved.value = true;
    setTimeout(() => {
      saved.value = false;
    }, 2000);
  } catch (e: any) {
    const err = e?.response?.data;
    error.value = err?.message || "保存失败";
  } finally {
    saving.value = false;
  }
};

/** 放弃未保存的修改，重新拉取服务端配置 */
const reset = async () => {
  if (!confirm("确定要放弃未保存的修改并重新加载吗？")) return;
  await loadConfig();
};
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-lg font-medium">页面装修</h2>
      <p class="text-xs text-color-300 mt-1">
        配置 default 布局的导航菜单、底部链接与站点 SEO，可按预设或已有页面快速添加
      </p>
    </div>
    <div class="flex items-center gap-2">
      <UButton color="neutral" variant="soft" :disabled="loading" @click="reset">
        重新加载
      </UButton>
      <UButton
        color="primary"
        :icon="saved ? 'i-lucide-check' : 'i-lucide-save'"
        :loading="saving"
        :disabled="saving || loading"
        @click="save"
      >
        {{ saved ? "已保存" : "保存配置" }}
      </UButton>
    </div>
  </div>

  <div v-if="loading" class="flex flex-col items-center gap-2 py-16">
    <Loader2 class="w-6 h-6 text-primary-500 animate-spin" />
    <p class="text-muted text-sm">加载中...</p>
  </div>

  <div v-else class="space-y-4">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      class="mb-4"
    />

    <!-- 导航菜单 -->
    <AdminLayoutLinkList
      v-model="config.menuItems"
      title="导航菜单"
      hint="显示在顶部导航栏，按列表顺序排列；可选择预设入口或已有页面快速添加"
      :options="pageOptions"
      :presets="presets"
      to-placeholder="如 /search 或 https://example.com"
    />

    <!-- 底部链接 -->
    <AdminLayoutLinkList
      v-model="config.footerLinks"
      title="底部链接"
      hint="显示在页脚区域，按列表顺序排列；可选择预设入口或已有页面快速添加"
      :options="pageOptions"
      :presets="presets"
      :with-icon="false"
      to-placeholder="如 /page/forbidden-keywords"
    />

    <!-- 空态提示 -->
    <div
      v-if="!config.menuItems.length && !config.footerLinks.length"
      class="flex flex-col items-center gap-2 py-8 text-muted text-sm"
    >
      <Palette class="w-8 h-8 text-color-300" />
      <p>还没有任何装修配置，从上方任一分组点击「新增」开始</p>
    </div>

    <!-- 站点 SEO -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 shrink-0 bg-sky-600 rounded-lg flex items-center justify-center"
          >
            <Globe class="w-5 h-5 text-white" />
          </div>
          <div class="min-w-0">
            <h3 class="font-medium">站点标题与描述</h3>
            <p class="text-color-500 text-sm">
              标题用于首页 title，短标题用作内页 title 后缀，描述用于全站默认
              meta description；留空使用默认值
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <label class="block text-muted text-sm mb-2" for="seo-title">
            SEO 标题
          </label>
          <UInput
            id="seo-title"
            v-model="siteSeo.site_seo_title"
            type="text"
            placeholder="留空使用默认值"
            class="w-full"
          />
          <p class="text-color-500 text-xs mt-2">
            建议不超过 30 个字符，仅在首页生效
          </p>
        </div>
        <div>
          <label class="block text-muted text-sm mb-2" for="seo-short-title">
            短标题
          </label>
          <UInput
            id="seo-short-title"
            v-model="siteSeo.site_seo_short_title"
            type="text"
            placeholder="留空使用默认值"
            class="w-full"
          />
          <p class="text-color-500 text-xs mt-2">
            建议不超过 10 个字符，用于内页标题后缀（如「歌名 - 短标题」）
          </p>
        </div>
        <div>
          <label class="block text-muted text-sm mb-2" for="seo-description">
            SEO 描述
          </label>
          <UTextarea
            id="seo-description"
            v-model="siteSeo.site_seo_description"
            :rows="4"
            placeholder="留空使用默认值"
            class="w-full"
          />
          <p class="text-color-500 text-xs mt-2">
            建议不超过 120 个字符，页面自身设置了描述时优先使用页面的
          </p>
        </div>
        <div>
          <label class="block text-muted text-sm mb-2" for="icp-licence">
            ICP 备案号
          </label>
          <UInput
            id="icp-licence"
            v-model="siteSeo.site_icp_licence"
            type="text"
            placeholder="如：粤ICP备2023000000号"
            class="w-full"
          />
          <p class="text-color-500 text-xs mt-2">
            建议使用 粤ICP备2023000000号 格式
          </p>
        </div>
      </div>
    </UCard>

    <div class="flex justify-end">
      <UButton
        color="primary"
        :icon="saved ? 'i-lucide-check' : 'i-lucide-save'"
        :loading="saving"
        :disabled="saving || loading"
        @click="save"
      >
        {{ saved ? "已保存" : "保存配置" }}
      </UButton>
    </div>
  </div>
</template>
