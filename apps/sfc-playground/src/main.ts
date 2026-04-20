import { createApp } from "vue";
import App from "./App.vue";

(
  window as Window & { VUE_DEVTOOLS_CONFIG?: { defaultSelectedAppId?: string } }
).VUE_DEVTOOLS_CONFIG = {
  defaultSelectedAppId: "repl",
};

createApp(App).mount("#app");
