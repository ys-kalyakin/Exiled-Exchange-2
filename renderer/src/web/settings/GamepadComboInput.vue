<template>
  <div class="flex items-center gap-1.5">
    <i
      class="fas fa-gamepad text-xs"
      :class="capturing ? 'text-orange-400' : 'text-gray-300'"
      :title="t('settings.gamepad.combo_hint')"
    />
    <button
      class="rounded bg-gray-900 px-1 text-center font-poe w-full whitespace-nowrap"
      :class="{
        'text-red-400': !modelValue && !capturing,
        'text-orange-400': capturing,
      }"
      :title="t('settings.gamepad.combo_hint')"
      @click="toggleCapture"
    >
      {{
        capturing
          ? t("settings.gamepad.press_combo")
          : modelValue || t("settings.gamepad.no_combo")
      }}
    </button>
    <button
      v-if="modelValue && !capturing"
      class="text-gray-400 px-1 leading-none"
      :title="t('settings.clear_hotkey')"
      @click="clear"
    >
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
// fork: gamepad support — "press the combo" capture input: while armed,
// main forwards every gamepad button (capture mode), the held set commits
// as "A + B" on the first release
import { onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Host } from "@/web/background/IPC";

defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string | null): void;
}>();

const { t } = useI18n();

const capturing = ref(false);
let pressed: Set<string> | null = null;
let abort: (() => void) | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;

function stop() {
  abort?.();
  abort = undefined;
  if (timeout !== undefined) clearTimeout(timeout);
  timeout = undefined;
  pressed = null;
  capturing.value = false;
}

function toggleCapture() {
  if (capturing.value) {
    stop();
    return;
  }
  capturing.value = true;
  pressed = new Set();
  const controller = Host.onEvent("MAIN->CLIENT::gamepad-input", (e) => {
    if (!pressed) return;
    // the released button was held until now, so it is part of the combo
    pressed.add(e.button);
    if (e.phase === "up" && pressed.size) {
      emit("update:modelValue", [...pressed].join(" + "));
      stop();
    }
  });
  abort = () => controller.abort();
  timeout = setTimeout(stop, 10_000);
}

function clear() {
  stop();
  emit("update:modelValue", null);
}

onBeforeUnmount(stop);
</script>
