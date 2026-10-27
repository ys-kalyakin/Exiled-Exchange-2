<template>
  <div :class="$style.titlebar">
    <slot />
    <button @click="emit('click')" class="truncate">{{ title }}</button>
    <button
      @click.stop="emit('close')"
      tabindex="-1"
      :class="[$style.button, $style.close]"
      title="Close"
    >
      <i class="fas fa-window-close"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
}>();

const emit = defineEmits<{
  (e: "click" | "close"): void;
}>();
</script>

<style lang="postcss" module>
.titlebar {
  @apply text-[color:var(--ee-text-2)];
  background: var(--ee-surface-raised);
  border-bottom: 1px solid var(--ee-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 1.75rem;
  line-height: 1.75rem;

  button {
    @apply px-2 pt-px;

    &:hover {
      @apply text-[color:var(--ee-text-1)];
      background: var(--ee-hover);
    }

    &.close:hover {
      color: #ff8080;
      background: rgba(229, 87, 87, 0.15);
    }
  }
}
</style>
