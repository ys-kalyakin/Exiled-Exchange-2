<template>
  <div class="max-w-md p-2">
    <ui-checkbox class="mb-4" v-model="navigationEnabled">{{
      t(":gamepad.navigation_enabled")
    }}</ui-checkbox>

    <div class="mb-4">
      <div class="flex-1 mb-1">{{ t(":gamepad.repeat_delay") }}</div>
      <div class="flex gap-1 items-center">
        <input
          v-model.number="repeatDelay"
          type="number"
          min="0"
          step="10"
          class="rounded bg-gray-900 px-1 block w-20 font-poe text-center"
        />
        <span>ms</span>
      </div>
    </div>
    <div class="mb-4">
      <div class="flex-1 mb-1">{{ t(":gamepad.repeat_interval") }}</div>
      <div class="flex gap-1 items-center">
        <input
          v-model.number="repeatInterval"
          type="number"
          min="10"
          step="10"
          class="rounded bg-gray-900 px-1 block w-20 font-poe text-center"
        />
        <span>ms</span>
      </div>
    </div>
    <div class="mb-8">
      <div class="flex-1 mb-1">{{ t(":gamepad.stick_dead_zone") }}</div>
      <input
        v-model.number="stickDeadZone"
        type="number"
        min="0"
        max="1"
        step="0.05"
        class="rounded bg-gray-900 px-1 block w-20 font-poe text-center"
      />
    </div>

    <div class="mb-1">{{ t(":gamepad.button_assignments") }}</div>
    <div class="flex flex-col gap-1 pl-2 mb-4">
      <div v-for="button of buttons" :key="button" class="flex items-center">
        <label class="flex-1 font-poe">{{ button }}</label>
        <select
          v-model="models[button]"
          class="p-1 rounded bg-gray-700 w-52"
        >
          <option
            v-for="opt of optionsFor(button)"
            :key="opt.id"
            :value="opt.id"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  // the menu label resolves through t(component.name) -> settings.gamepad.title
  name: "settings.gamepad.title",
};
</script>

<script setup lang="ts">
// fork: gamepad support — configuration of the gamepad navigation layer
import { computed, reactive } from "vue";
import { useI18nNs } from "@/web/i18n";
import { configProp, configModelValue } from "./utils";
import {
  GAMEPAD_BUTTONS,
  GAMEPAD_BUTTON_INTENTS,
} from "../overlay/gamepad/buttonMap";
import type { GpAction, GpIntent } from "../overlay/gamepad/types";

import UiCheckbox from "@/web/ui/UiCheckbox.vue";

const props = defineProps(configProp());

const navigationEnabled = configModelValue(
  () => props.config.gamepad,
  "navigationEnabled",
);
const repeatDelay = configModelValue(
  () => props.config.gamepad,
  "repeatDelayMs",
);
const repeatInterval = configModelValue(
  () => props.config.gamepad,
  "repeatIntervalMs",
);
const stickDeadZone = configModelValue(
  () => props.config.gamepad,
  "stickDeadZone",
);

const INTENT_OPTIONS: Array<{ id: string; key: string }> = [
  { id: "unmapped", key: "unmapped" },
  { id: "move:row:-1", key: "row_up" },
  { id: "move:row:1", key: "row_down" },
  { id: "move:control:-1", key: "control_left" },
  { id: "move:control:1", key: "control_right" },
  { id: "activate", key: "activate" },
  { id: "back", key: "back" },
  { id: "action:search", key: "search" },
  { id: "action:browser", key: "browser" },
  { id: "action:preset", key: "preset" },
  { id: "action:section", key: "section" },
];

function intentToId(intent: GpIntent | "unmapped"): string {
  if (intent === "unmapped") return "unmapped";
  if (intent.kind === "move") return `move:${intent.axis}:${intent.delta}`;
  if (intent.kind === "activate") return "activate";
  if (intent.kind === "back") return "back";
  return `action:${intent.action}`;
}

function idToIntent(id: string): GpIntent | "unmapped" {
  if (id === "unmapped") return "unmapped";
  if (id === "activate") return { kind: "activate" };
  if (id === "back") return { kind: "back" };
  if (id.startsWith("move:")) {
    const [, axis, delta] = id.split(":");
    return {
      kind: "move",
      axis: axis as "row" | "control",
      delta: Number(delta) as 1 | -1,
    };
  }
  return { kind: "action", action: id.slice("action:".length) as GpAction };
}

function defaultId(button: string): string {
  return intentToId(GAMEPAD_BUTTON_INTENTS[button] ?? "unmapped");
}

const buttons = GAMEPAD_BUTTONS;

// reactive() unwraps the per-button computeds for template v-model
const models = reactive(
  Object.fromEntries(
    GAMEPAD_BUTTONS.map((button) => [
      button,
      computed<string>({
        get: () =>
          intentToId(props.config.gamepad.buttonIntents[button] ?? "unmapped"),
        set: (id) => {
          props.config.gamepad.buttonIntents[button] = idToIntent(id);
        },
      }),
    ]),
  ),
);

const { t } = useI18nNs("settings");

function optionsFor(button: string) {
  const def = defaultId(button);
  return INTENT_OPTIONS.map((opt) => ({
    id: opt.id,
    label:
      opt.id === def
        ? `${t(`:gamepad.intent.${opt.key}`)} (${t(":gamepad.default")})`
        : t(`:gamepad.intent.${opt.key}`),
  }));
}
</script>
