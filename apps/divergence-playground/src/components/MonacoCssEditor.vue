<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/language/css/monaco.contribution";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const root = ref<HTMLElement | null>(null);

let editor: monaco.editor.IStandaloneCodeEditor | undefined;
let model: monaco.editor.ITextModel | undefined;
let syncingFromParent = false;

(
  self as typeof self & {
    MonacoEnvironment?: { getWorker: (_moduleId: string, label: string) => Worker };
  }
).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }

    return new editorWorker();
  },
};

onMounted(() => {
  if (!root.value) {
    return;
  }

  model = monaco.editor.createModel(props.modelValue, "css");
  editor = monaco.editor.create(root.value, {
    model,
    theme: "vs",
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
    fontSize: 14,
    lineHeight: 21,
    lineNumbers: "on",
    roundedSelection: false,
    renderLineHighlight: "gutter",
    scrollBeyondLastLine: false,
    wordWrap: "on",
    wrappingIndent: "indent",
    tabSize: 2,
    padding: {
      top: 14,
      bottom: 14,
    },
  });

  editor.onDidChangeModelContent(() => {
    if (!editor || syncingFromParent) {
      return;
    }
    emit("update:modelValue", editor.getValue());
  });
});

watch(
  () => props.modelValue,
  (nextValue) => {
    if (!editor || nextValue === editor.getValue()) {
      return;
    }

    syncingFromParent = true;
    editor.setValue(nextValue);
    syncingFromParent = false;
  },
);

onBeforeUnmount(() => {
  editor?.dispose();
  model?.dispose();
});
</script>

<template>
  <div ref="root" class="editor-root" />
</template>

<style scoped>
.editor-root {
  min-height: 180px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(196, 205, 227, 0.95);
  background: white;
}
</style>
