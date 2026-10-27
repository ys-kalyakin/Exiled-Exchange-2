<template>
  <div :class="[$style.btn, { [$style.dimmed]: filter.disabled }]">
    <button @click="filter.disabled = !filter.disabled" class="pl-2">
      <span :class="[$style.cbox, { [$style.checked]: !filter.disabled }]">
        <span :class="$style.check" />
      </span>
      <span>{{ name }}</span>
    </button>
    <!-- editor is revealed on enabled rows only -->
    <select
      v-if="!filter.disabled"
      :class="$style.dropdown"
      v-model="selected"
      @focus="onFocus"
      @change="onChange"
      :disabled="filter.disabled"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <!-- disabled row: the item's natural option label instead of an editor -->
    <span v-else :class="$style.value">{{ selectedLabel }}</span>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType, ref, watch, computed } from "vue";

export default defineComponent({
  props: {
    filter: {
      type: Object as PropType<{ disabled: boolean; value?: string }>,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    options: {
      type: Array as PropType<Array<{ label: string; value: string }>>,
      required: true,
    },
  },
  setup(props) {
    const selected = ref<string>(props.filter.value || "");

    watch(
      () => props.filter.value,
      (newValue) => {
        selected.value = newValue || "";
      },
      { immediate: true },
    );

    const selectedLabel = computed(() => {
      return (
        props.options.find((option) => option.value === selected.value)
          ?.label ?? ""
      );
    });

    const onFocus = () => {
      props.filter.disabled = false;
    };

    const onChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      props.filter.value = target.value;
    };

    return {
      selected,
      selectedLabel,
      onFocus,
      onChange,
    };
  },
});
</script>

<style lang="postcss" module>
/* checkbox row (same visual language as ui/UiCheckbox.vue) */
.btn {
  line-height: 1.25rem;
  display: flex;
  align-items: center;

  &.dimmed {
    @apply opacity-60;
  }
}

.btn button {
  display: flex;
  align-items: center;
  @apply gap-x-1;
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

.value {
  @apply text-[color:var(--ee-text-3)];
}

.dropdown {
  @apply bg-[color:var(--ee-surface-sunk)];
  @apply text-[color:var(--ee-text-2)];
  @apply rounded;
  @apply focus:outline-none focus:ring-2 focus:ring-[color:var(--ee-focus)];
}
</style>
