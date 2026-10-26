<template>
  <div class="max-w-lg p-2">
    <div class="mb-2 bg-gray-700 rounded px-2 py-1 leading-none">
      <i class="fas fa-info-circle"></i> {{ t("settings.clear_hotkey") }}
    </div>
    <div class="flex flex-col gap-4 mb-8">
      <HotkeysGeneric :hotkeys="hotkeys" />
    </div>
    <div class="mb-8 flex">
      <label class="flex-1">{{ t("settings.stash_scroll") }}</label>
      <div class="flex gap-x-4">
        <ui-radio
          v-model="stashScroll"
          :value="true"
          :disabled="stashScrollUnsupported"
          class="font-poe"
          >Ctrl + MouseWheel</ui-radio
        >
        <ui-radio v-model="stashScroll" :value="false">{{
          t("Disabled")
        }}</ui-radio>
      </div>
    </div>
    <div
      v-if="stashScrollUnsupported"
      class="mb-8 bg-gray-700 rounded px-2 py-1 leading-none"
    >
      <i class="fas fa-info-circle"></i>
      {{ t("settings.stash_scroll_unavailable") }}
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: "settings.hotkeys",
};
</script>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import { Host } from "@/web/background/IPC";
import {
  configProp,
  configModelValue,
  _configModelValue,
  findWidget,
} from "./utils";
import { PriceCheckWidget, DelveGridWidget } from "@/web/overlay/interfaces";
import { ItemCheckWidget } from "../item-check/widget.js";

import UiRadio from "@/web/ui/UiRadio.vue";
import HotkeysGeneric, { HotkeySchema } from "../settings/HotkeysGeneric.vue";

const props = defineProps(configProp());

const stashScrollUnsupported = shallowRef(false);
Host.onEvent("MAIN->CLIENT::injection-availability", (e) => {
  stashScrollUnsupported.value = !e.stashScrollSupported;
});

const hotkeys = computed<HotkeySchema[]>(() => {
  const priceCheckWidget = findWidget<PriceCheckWidget>(
    "price-check",
    props.config,
  )!;
  const itemCheckWidget = findWidget<ItemCheckWidget>(
    "item-check",
    props.config,
  )!;
  const delveGridWidget = findWidget<DelveGridWidget>(
    "delve-grid",
    props.config,
  )!;
  return [
    {
      translationKey: "price_check.name",
      items: [
        {
          translationKey: "price_check.hotkey",
          config: {
            modKey: _configModelValue(priceCheckWidget, "hotkeyHold"),
            nonModKey: _configModelValue(priceCheckWidget, "hotkey"),
          },
          // fork: gamepad support
          gamepad: _configModelValue(priceCheckWidget, "gamepadHotkey"),
        },
        {
          translationKey: "price_check.hotkey_locked",
          config: _configModelValue(priceCheckWidget, "hotkeyLocked"),
          gamepad: _configModelValue(priceCheckWidget, "gamepadHotkeyLocked"),
        },
      ],
    },
    {
      translationKey: "settings.overlay",
      config: _configModelValue(props.config, "overlayKey"),
      required: true,
      gamepad: _configModelValue(props.config.gamepad, "overlayCombo"),
    },
    {
      translationKey: "map_check.name",
      config: _configModelValue(itemCheckWidget, "hotkey"),
      gamepad: _configModelValue(itemCheckWidget, "gamepadHotkey"),
    },
    {
      translationKey: "item.info",
      config: _configModelValue(itemCheckWidget, "hotkey"),
      gamepad: _configModelValue(itemCheckWidget, "gamepadHotkey"),
    },
    {
      translationKey: "settings.delve_grid",
      config: _configModelValue(delveGridWidget, "toggleKey"),
      gamepad: _configModelValue(delveGridWidget, "gamepadHotkey"),
    },
  ];
});

const stashScroll = configModelValue(() => props.config, "stashScroll");

const { t } = useI18n();
</script>
