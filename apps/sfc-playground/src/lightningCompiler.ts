import { createBrowserCompiler } from "@lightning-vue/compiler/browser";
import initLightningCss, * as lightningcss from "lightningcss-wasm";

let ready: Promise<typeof lightningcss> | undefined;

async function loadLightningCss() {
  ready ??= initLightningCss().then(() => lightningcss);
  return ready;
}

void loadLightningCss();

export const lightningCompiler = createBrowserCompiler(loadLightningCss);
