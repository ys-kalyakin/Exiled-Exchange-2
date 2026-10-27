<template>
  <button @click="updateInput" :class="$style['checkbox']">
    <span :class="[$style['box'], { [$style['checked']]: isChecked }]">
      <span :class="$style['check']" />
    </span>
    <slot />
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "UiCheckbox",
  emits: ["update:modelValue"],
  props: {
    modelValue: {},
    values: {
      type: Array,
      default: [true, false],
    },
  },
  setup(props, ctx) {
    return {
      // visual state only cares about values[0], as the old glyphs did
      isChecked: computed(() => props.modelValue === props.values[0]),
      updateInput() {
        const [on, off] = props.values;
        ctx.emit("update:modelValue", props.modelValue === on ? off : on);
      },
    };
  },
});
</script>

<style lang="postcss" module>
.checkbox {
  display: flex;
  @apply gap-x-1;
  align-items: center;
  text-align: left;
}

.box {
  position: relative;
  flex: none;
  width: 0.875rem;
  height: 0.875rem;
  border: 1px solid var(--ee-border-strong);
  border-radius: 2px;
  background: var(--ee-surface-sunk);
}

.checkbox:hover .box {
  border-color: var(--ee-accent);
}

.box.checked {
  border-color: var(--ee-accent);
  background: var(--ee-accent);
}

.check {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 0.325rem;
  height: 0.55rem;
  border-right: 0.125rem solid #14171d;
  border-bottom: 0.125rem solid #14171d;
  opacity: 0;
  transform: rotate(45deg) scale(0.4);
  transition:
    transform var(--ee-dur-1) var(--ee-ease),
    opacity var(--ee-dur-1) var(--ee-ease);
}

.box.checked .check {
  opacity: 1;
  transform: rotate(45deg) scale(1);
}
</style>
