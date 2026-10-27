<template>
  <button @click="updateInput" :class="$style['radio']">
    <template v-if="!useBgSelection">
      <span :class="[$style['ring'], { [$style['checked']]: isChecked }]">
        <span :class="$style['dot']" />
      </span>
      <slot />
    </template>
    <template v-else>
      <div
        class="rounded px-1 py-0.5"
        :class="{
          'bg-gray-700': isChecked,
        }"
      >
        <slot />
      </div>
    </template>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "UiRadio",
  emits: ["update:modelValue"],
  props: {
    value: {
      type: null,
      required: true,
    },
    modelValue: {
      type: null,
      required: true,
    },
    useBgSelection: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, ctx) {
    return {
      isChecked: computed(() => {
        return props.modelValue === props.value;
      }),
      updateInput() {
        ctx.emit("update:modelValue", props.value);
      },
    };
  },
});
</script>

<style lang="postcss" module>
.radio {
  display: flex;
  @apply gap-x-1;
  align-items: center;
  text-align: left;
}

.ring {
  position: relative;
  flex: none;
  width: 0.875rem;
  height: 0.875rem;
  border: 1px solid var(--ee-border-strong);
  border-radius: 50%;
  background: var(--ee-surface-sunk);
}

.radio:hover .ring {
  border-color: var(--ee-accent);
}

.ring.checked {
  border-color: var(--ee-accent);
}

.dot {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--ee-accent);
  opacity: 0;
  transform: scale(0.4);
  transition:
    transform var(--ee-dur-1) var(--ee-ease),
    opacity var(--ee-dur-1) var(--ee-ease);
}

.ring.checked .dot {
  opacity: 1;
  transform: scale(1);
}
</style>
