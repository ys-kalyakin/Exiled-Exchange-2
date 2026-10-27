<template>
  <component :is="tagName" ref="target" v-bind="$attrs">
    <slot name="target" />
  </component>
  <div ref="content">
    <slot name="content" />
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  inject,
  onMounted,
  onBeforeUnmount,
  ref,
  PropType,
} from "vue";
import tippy, { Instance, Placement } from "tippy.js";
import "tippy.js/dist/tippy.css";
import "tippy.js/themes/light.css";
import { gamepadPopoverRegistryKey } from "@/web/overlay/gamepad/types";

export default defineComponent({
  name: "UiPopover",
  inheritAttrs: false,
  props: {
    trigger: {
      type: String,
      default: undefined,
    },
    boundary: {
      type: String,
      default: undefined,
    },
    placement: {
      type: String as PropType<Placement>,
      default: undefined,
    },
    arrow: {
      type: Boolean,
      default: true,
    },
    delay: {
      type: [Array, Number] as PropType<
        number | [number | null, number | null]
      >,
      default: 0,
    },
    tagName: {
      type: String,
      default: "span",
    },
  },
  setup(props) {
    const target = ref<HTMLElement>(null!);
    const content = ref<HTMLElement>(null!);
    let instance: Instance;
    // open popovers are closable via the gamepad B button (back chain)
    const gamepadPopovers = inject(gamepadPopoverRegistryKey, null);
    let removeGamepadCloser: (() => void) | undefined;

    onMounted(() => {
      instance = tippy(target.value, {
        content: content.value,
        interactive: true,
        theme: "light",
        trigger: props.trigger,
        placement: props.placement,
        arrow: props.arrow,
        delay: props.delay,
        maxWidth: "none",
        onShow: () => {
          removeGamepadCloser?.();
          removeGamepadCloser = gamepadPopovers?.add(() => instance.hide());
        },
        onHide: () => {
          removeGamepadCloser?.();
          removeGamepadCloser = undefined;
        },
        popperOptions: {
          modifiers: [
            ...(props.boundary
              ? [
                  {
                    name: "preventOverflow",
                    options: {
                      boundary: document.querySelector(props.boundary),
                    },
                  },
                ]
              : []),
          ],
        },
      });
    });

    onBeforeUnmount(() => {
      instance.destroy();
      removeGamepadCloser?.();
      removeGamepadCloser = undefined;
    });

    return {
      target,
      content,
    };
  },
});
</script>

<style lang="postcss">
.tippy-box[data-theme~="light"] {
  @apply rounded;
  color: var(--ee-text-1);
  background: var(--ee-surface-raised);
  border: 1px solid var(--ee-border-strong);
  box-shadow: var(--ee-shadow-2);
}

.tippy-box[data-theme~="light"][data-placement^="top"] > .tippy-arrow:before {
  border-top-color: var(--ee-surface-raised);
}

.tippy-box[data-theme~="light"][data-placement^="bottom"]
  > .tippy-arrow:before {
  border-bottom-color: var(--ee-surface-raised);
}

.tippy-box[data-theme~="light"][data-placement^="left"] > .tippy-arrow:before {
  border-left-color: var(--ee-surface-raised);
}

.tippy-box[data-theme~="light"][data-placement^="right"] > .tippy-arrow:before {
  border-right-color: var(--ee-surface-raised);
}

/* entrance: fade + scale(0.98→1) on the content wrapper; popper owns the
   positioning transform on the box itself, so this stays conflict-free */
.tippy-box[data-theme~="light"] .tippy-content {
  transform: scale(0.98);
  opacity: 0;
}

.tippy-box[data-theme~="light"][data-state="visible"] .tippy-content {
  transform: scale(1);
  opacity: 1;
  transition:
    transform 120ms var(--ee-ease),
    opacity 120ms var(--ee-ease);
}

.tippy-content {
  /* technically raised to outside context but doesn't break stuff */
  @apply p-1;
}
</style>
