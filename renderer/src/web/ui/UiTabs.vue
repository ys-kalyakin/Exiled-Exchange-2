<template>
  <div>
    <div :class="$style['tabbar']">
      <button
        v-for="tab in tabs"
        :key="tab"
        @click="updateTab(tab)"
        :class="[$style['tab'], { [$style['active']]: modelValue === tab }]"
      >
        {{ tab }}
      </button>
    </div>

    <slot :selected="modelValue" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "UiTabs",
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    tabs: {
      type: Array as () => string[],
      required: true,
    },
  },
  emits: ["update:modelValue"],
  setup(_, { emit }) {
    return {
      updateTab(tab: string) {
        emit("update:modelValue", tab);
      },
    };
  },
});
</script>

<style lang="postcss" module>
.tabbar {
  display: flex;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--ee-border);
}

.tab {
  position: relative;
  padding: 0.25rem 0.5rem;
  line-height: 1;
  color: var(--ee-text-2);
}

.tab:hover,
.tab.active {
  color: var(--ee-text-1);
}

.tab.active::after {
  content: "";
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  bottom: -1px;
  height: 2px;
  background: var(--ee-accent);
}
</style>
