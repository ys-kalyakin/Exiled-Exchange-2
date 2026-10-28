<template>
  <div
    v-if="active"
    class="flex items-center gap-3 px-2 py-1 bg-gray-900 overflow-hidden pointer-events-none absolute bottom-0 left-0 right-0 z-10"
  >
    <span
      v-for="chip of chips"
      :key="chip.id"
      class="flex items-center gap-1 whitespace-nowrap"
    >
      <span class="bg-gray-400 text-gray-900 rounded px-1 font-poe">{{
        chip.key
      }}</span>
      <span class="text-gray-400">{{ t(`:gamepad.${chip.labelKey}`) }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
// fork: gamepad support — input-adaptive hint bar for the price check window
// (gamepad-navigation spec). Positions itself at the bottom edge of the
// nearest positioned ancestor, floating over content so appearing never
// reflows the navigable rows; the parent must be position:relative/absolute.
import { computed, ref, watch } from "vue";
import { useI18nNs } from "@/web/i18n";
import { AppConfig } from "@/web/Config";
import type { Widget } from "../interfaces";
import { hintChips } from "./hints";
import { inputMode } from "./inputMode";
import type { GpIntentSource } from "./types";

const props = defineProps<{ config: Widget }>();

const { t } = useI18nNs("settings");

/** Chips of the bar's current mode; null while the bar is hidden. */
const active = ref<GpIntentSource | null>(null);

watch(inputMode, (snapshot) => {
  if (snapshot && props.config.wmWants === "show") {
    active.value = snapshot.mode;
  }
});

// a re-shown window starts with the bar hidden again until the next intent
watch(
  () => props.config.wmWants,
  (state) => {
    if (state !== "show") active.value = null;
  },
);

const chips = computed(() =>
  active.value ? hintChips(active.value, AppConfig().gamepad) : [],
);
</script>
