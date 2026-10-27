<template>
  <button
    @click="updateInput"
    class="flex items-center gap-x-1"
    style="height: 1.375rem"
  >
    <span :class="[$style['track'], { [$style['on']]: modelValue }]">
      <span :class="$style['thumb']" />
    </span>
    <slot />
  </button>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "UiToggle",
  emits: ["update:modelValue"],
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  setup(props, ctx) {
    return {
      updateInput() {
        ctx.emit("update:modelValue", !props.modelValue);
      },
    };
  },
});
</script>

<style lang="postcss" module>
.track {
  position: relative;
  flex: none;
  width: 1.75rem;
  height: 1rem;
  border: 1px solid var(--ee-border-strong);
  border-radius: 2px;
  background: var(--ee-surface-sunk);
}

.track.on {
  border-color: var(--ee-accent);
  background: var(--ee-accent);
}

.thumb {
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  background: #c3c9d4;
  transform: translateX(0);
  transition: transform var(--ee-dur-1) var(--ee-ease);
}

.track.on .thumb {
  background: #14171d;
  transform: translateX(0.75rem);
}
</style>
