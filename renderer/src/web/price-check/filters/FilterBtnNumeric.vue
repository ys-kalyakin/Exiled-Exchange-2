<template>
  <div :class="[$style.btn, { [$style.dimmed]: filter.disabled }]">
    <button @click="filter.disabled = !filter.disabled" class="pl-2">
      <span :class="[$style.cbox, { [$style.checked]: !filter.disabled }]">
        <span :class="$style.check" />
      </span>
      <span>{{ name }}</span>
    </button>
    <!-- threshold editor is revealed on enabled rows only -->
    <template v-if="!filter.disabled">
      <input
        :class="$style.input"
        step="any"
        type="number"
        v-model.number="inputMin"
        @focus="inputFocus"
        @mousedown.right.prevent="clearInput($event, 'min')"
        @blur="inputMinBlur"
        @mousewheel.stop
        :style="{ width: `${1.2 + Math.max(String(inputMin).length, 2)}ch` }"
      />
      <template v-if="'max' in filter">
        <span>–</span>
        <input
          :class="$style.input"
          step="any"
          type="number"
          v-model.number="inputMax"
          @focus="inputFocus"
          @mousedown.right.prevent="clearInput($event, 'max')"
          @mousewheel.stop
          :style="{ width: `${1.2 + Math.max(String(inputMax).length, 2)}ch` }"
          placeholder="…"
        />
      </template>
    </template>
    <!-- disabled row: the item's natural value instead of a threshold input -->
    <span v-else class="tnum" :class="$style.value">
      {{
        "max" in filter && filter.max != null
          ? `${filter.value}–${filter.max}`
          : filter.value
      }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, watch } from "vue";
import { FilterNumeric } from "./interfaces";

export default defineComponent({
  emits: [], // mutates filter
  props: {
    filter: {
      type: Object as PropType<FilterNumeric>,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const _inputMin = ref<number | "">("");
    watch(
      () => props.filter,
      (filter) => {
        _inputMin.value = filter.value;
      },
      { immediate: true },
    );

    const _inputMax = ref<number | "">("");
    watch(
      () => props.filter,
      (filter) => {
        _inputMax.value = filter.max ?? "";
      },
      { immediate: true },
    );

    const inputMin = computed<number | "">({
      get() {
        return _inputMin.value;
      },
      set(value) {
        _inputMin.value = value;
        if (typeof value === "number") {
          props.filter.value = value;
        } else {
          props.filter.value = 0;
        }
      },
    });

    const inputMax = computed<number | "">({
      get() {
        return _inputMax.value;
      },
      set(value) {
        _inputMax.value = value;
        if (typeof value === "number") {
          props.filter.max = value;
        } else {
          props.filter.max = undefined;
        }
      },
    });

    return {
      inputMin,
      inputMax,
      inputFocus(e: FocusEvent) {
        const target = e.target as HTMLInputElement;
        target.select();
        props.filter.disabled = false;
      },
      inputMinBlur() {
        if (typeof _inputMin.value !== "number") {
          _inputMin.value = 0;
          props.filter.disabled = true;
        }
      },
      clearInput(e: MouseEvent, which: "min" | "max") {
        const target = e.target as HTMLInputElement;

        if (which === "min") {
          inputMin.value = "";
        } else {
          inputMax.value = "";
        }

        target.focus();
      },
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
  /* keep the label clear of the natural value / threshold editor */
  @apply gap-x-1.5;

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

.input {
  @apply text-center;
  @apply bg-transparent;
  @apply text-[color:var(--ee-text-2)];
  @apply select-all;

  &:hover,
  &:focus {
    @apply bg-[color:var(--ee-surface-sunk)];
    @apply -my-px border-t border-b border-[color:var(--ee-border-strong)];
  }

  &::placeholder {
    @apply text-[color:var(--ee-text-3)];
  }

  &:focus {
    cursor: none;
  }
}
</style>
