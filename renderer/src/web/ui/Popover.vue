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
}

.tippy-content {
  /* technically raised to outside context but doesn't break stuff */
  @apply p-1;
}
</style>
