<script setup lang="ts">
import Header from "./Header.vue";
import { Repl, type SFCOptions, useStore, useVueImportMap } from "@vue/repl";
import Monaco from "@vue/repl/monaco-editor";
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import { defaultSfc } from "./defaultSfc";
import { lightningCompiler } from "./lightningCompiler";

const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
const resolveBaseAssetUrl = (assetPath: string) => new URL(assetPath, baseUrl).toString();

const replRef = ref<InstanceType<typeof Repl>>();

const setVH = () => {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight}px`);
};
window.addEventListener("resize", setVH);
setVH();

const useSSRMode = ref(false);

const AUTO_SAVE_STORAGE_KEY = "lightning-vue-sfc-playground-auto-save";
const autoSave = ref<boolean>(JSON.parse(localStorage.getItem(AUTO_SAVE_STORAGE_KEY) ?? "true"));

const { productionMode, vueVersion, importMap } = useVueImportMap({
  runtimeDev: import.meta.env.PROD
    ? resolveBaseAssetUrl("vue.runtime.esm-browser.js")
    : resolveBaseAssetUrl("src/vue-dev-proxy"),
  runtimeProd: import.meta.env.PROD
    ? resolveBaseAssetUrl("vue.runtime.esm-browser.prod.js")
    : resolveBaseAssetUrl("src/vue-dev-proxy-prod"),
  serverRenderer: import.meta.env.PROD
    ? resolveBaseAssetUrl("server-renderer.esm-browser.js")
    : resolveBaseAssetUrl("src/vue-server-renderer-dev-proxy"),
});

let hash = location.hash.slice(1);
if (hash.startsWith("__DEV__")) {
  hash = hash.slice(7);
  productionMode.value = false;
}
if (hash.startsWith("__PROD__")) {
  hash = hash.slice(8);
  productionMode.value = true;
}
if (hash.startsWith("__SSR__")) {
  hash = hash.slice(7);
  useSSRMode.value = true;
}

const sfcOptions = computed(
  (): SFCOptions => ({
    script: {
      inlineTemplate: productionMode.value,
      isProd: productionMode.value,
      propsDestructure: true,
    },
    style: {
      isProd: productionMode.value,
    },
    template: {
      isProd: productionMode.value,
      compilerOptions: {
        isCustomElement: (tag: string) => tag === "mjx-container" || tag.startsWith("custom-"),
      },
    },
  }),
);

const store = useStore(
  {
    builtinImportMap: importMap,
    compiler: lightningCompiler,
    template: ref({
      welcomeSFC: defaultSfc,
      newSFC: defaultSfc,
    }),
    vueVersion,
    sfcOptions,
  },
  hash,
);

const originalStoreInit = store.init.bind(store);
let storeInitialized = false;
store.init = () => {
  if (storeInitialized) {
    return;
  }
  storeInitialized = true;
  originalStoreInit();
};
store.init();

const isReplReady = computed(() => {
  const mainFile = store.files[store.mainFile];
  return !!mainFile?.compiled.js;
});

globalThis.store = store as never;

watchEffect(() => {
  const newHash = store
    .serialize()
    .replace(/^#/, useSSRMode.value ? "#__SSR__" : "#")
    .replace(/^#/, productionMode.value ? "#__PROD__" : "#");
  history.replaceState({}, "", newHash);
});

function toggleProdMode() {
  productionMode.value = !productionMode.value;
}

function toggleSSR() {
  useSSRMode.value = !useSSRMode.value;
}

function toggleAutoSave() {
  autoSave.value = !autoSave.value;
  localStorage.setItem(AUTO_SAVE_STORAGE_KEY, String(autoSave.value));
}

function reloadPage() {
  replRef.value?.reload();
}

const theme = ref<"dark" | "light">("dark");
function toggleTheme(isDark: boolean) {
  theme.value = isDark ? "dark" : "light";
}

onMounted(() => {
  const cls = document.documentElement.classList;
  const preferDark = localStorage.getItem("lightning-vue-playground-prefer-dark");
  if (preferDark !== "false") {
    cls.add("dark");
  }
  toggleTheme(cls.contains("dark"));
  window.process = { env: {} } as never;
});

const isVaporSupported = ref(false);
watch(
  () => store.vueVersion,
  (version, oldVersion) => {
    const [major, minor] = (version || store.compiler.version)
      .split(".")
      .map((v: string) => parseInt(v, 10));
    isVaporSupported.value = major > 3 || (major === 3 && minor >= 6);
    if (oldVersion) {
      reloadPage();
    }
  },
  { immediate: true, flush: "pre" },
);

const previewOptions = computed(() => ({
  customCode: {
    importCode: `import { initCustomFormatter${isVaporSupported.value ? ", vaporInteropPlugin" : ""} } from 'vue'`,
    useCode: `
      ${isVaporSupported.value ? "app.use(vaporInteropPlugin)" : ""}
      if (window.devtoolsFormatters) {
        const index = window.devtoolsFormatters.findIndex((v) => v.__vue_custom_formatter)
        window.devtoolsFormatters.splice(index, 1)
        initCustomFormatter()
      } else {
        initCustomFormatter()
      }`,
  },
}));
</script>

<template>
  <Header
    :store="store"
    :prod="productionMode"
    :ssr="useSSRMode"
    :autoSave="autoSave"
    :theme="theme"
    @toggle-theme="toggleTheme"
    @toggle-prod="toggleProdMode"
    @toggle-ssr="toggleSSR"
    @toggle-autosave="toggleAutoSave"
    @reload-page="reloadPage"
  />
  <Repl
    v-if="isReplReady"
    ref="replRef"
    :theme="theme"
    :editor="Monaco"
    @keydown.ctrl.s.prevent
    @keydown.meta.s.prevent
    :ssr="useSSRMode"
    :model-value="autoSave"
    :editorOptions="{ autoSaveText: false }"
    :store="store"
    :showCompileOutput="true"
    :showSsrOutput="useSSRMode"
    :showOpenSourceMap="true"
    :autoResize="true"
    :clearConsole="false"
    :preview-options="previewOptions"
  />
  <div v-else class="playground-loading">Loading playground…</div>
</template>

<style>
.dark {
  color-scheme: dark;
}

body {
  font-size: 13px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
    "Helvetica Neue", sans-serif;
  margin: 0;
  --base: #444;
  --nav-height: 50px;
}

.vue-repl {
  height: calc(var(--vh) - var(--nav-height)) !important;
}

.playground-loading {
  height: calc(var(--vh) - var(--nav-height));
  display: grid;
  place-items: center;
  color: var(--base);
  background: #0f0f10;
}

:root:not(.dark) .playground-loading {
  background: #f7f7f8;
}

button {
  border: none;
  outline: none;
  cursor: pointer;
  margin: 0;
  background-color: transparent;
}
</style>
