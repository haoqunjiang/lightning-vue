declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}

declare module "*?raw" {
  const source: string;
  export default source;
}

declare const __COMMIT__: string;

declare module "file-saver" {
  export function saveAs(data: Blob, filename?: string): void;
}

declare module "vue/dist/vue.runtime.esm-browser.prod.js" {
  export * from "vue";
}

declare global {
  interface Window {
    VUE_DEVTOOLS_CONFIG?: {
      defaultSelectedAppId?: string;
    };
  }
}
