<template>
  <button
    :class="[
      $style.btn,
      { [$style.dimmed]: filter.disabled },
      {
        [$style.readonly]: readonly,
      },
    ]"
    @click="toggle"
  >
    <span
      v-if="!readonly && !collapse"
      :class="[$style.cbox, { [$style.checked]: isChecked }]"
    >
      <span :class="$style.check" />
    </span>
    <img v-if="img" :src="img" class="w-5 h-5" />
    <span class="pl-1">{{ t(text) }}</span>
    <i
      v-if="collapse"
      class="pl-2 text-xs text-gray-400"
      :class="filter.disabled ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, type PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
  filter: {
    type: Object as PropType<{ disabled: boolean }>, // will be mutated directly, instead of emit
    required: true,
  },
  text: { type: String, required: true },
  img: { type: String, default: undefined },
  readonly: { type: Boolean, default: undefined },
  active: { type: Boolean, default: undefined },
  collapse: { type: Boolean, default: undefined },
});

const { t } = useI18n();

const isChecked = computed(() =>
  props.active != null ? props.active : !props.filter.disabled,
);

function toggle() {
  const { filter, readonly } = props;
  if (!readonly) {
    filter.disabled = !filter.disabled;
  }
}
</script>

<style lang="postcss" module>
/* checkbox row (same visual language as ui/UiCheckbox.vue) */
.btn {
  @apply pl-1 pr-2;
  display: flex;
  align-items: center;
  text-align: left;
  line-height: 1.25rem;

  &.dimmed {
    @apply opacity-60;
  }

  &.readonly {
    cursor: default;
  }
}

.cbox {
  position: relative;
  flex: none;
  width: 0.875rem;
  height: 0.875rem;
  border: 1px solid var(--ee-border-strong);
  border-radius: 2px;
  background: var(--ee-surface-sunk);

  &.checked {
    border-color: var(--ee-accent);
    background: var(--ee-accent);
  }
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

.checked .check {
  opacity: 1;
  transform: rotate(45deg) scale(1);
}
</style>
