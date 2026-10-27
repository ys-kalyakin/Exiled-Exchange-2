<template>
  <div id="app" class="text-sm font-poe-sc">
    <OverlayWindow />
  </div>
</template>

<script setup lang="ts">
import OverlayWindow from "./overlay/OverlayWindow.vue";
</script>

<style lang="postcss">
@import url("@fortawesome/fontawesome-free/css/all.min.css");
@import url("animate.css/animate.css");
@import url("../assets/font.css");
@import url("../assets/theme.css");
@tailwind base;
@tailwind components;
@tailwind utilities;

.table-stripped tbody tr {
  border-bottom: 1px solid var(--ee-separator);
}

.table-stripped tbody tr:hover {
  background: var(--ee-hover);
}

.table-stripped tbody tr:last-child {
  border-bottom: none;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  /* align-items: center; */
  overflow: hidden;
  justify-content: space-between;

  :focus {
    outline: 0;
  }

  /* keyboard + gamepad focus share the accent ring (see .focused-gamepad) */
  :focus-visible {
    outline: 2px solid var(--ee-focus);
    outline-offset: 1px;
  }
}

.layout-column {
  display: flex;
  flex-direction: column;
  height: 100%;
}

::-webkit-scrollbar {
  width: 0.5rem;
  height: 0.5rem;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--ee-border-strong);
  border-radius: 2px;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.btn {
  @apply bg-gray-700;
  @apply px-2 py-1;
  @apply text-gray-400;
  @apply leading-none;
  @apply rounded;
}

.btn.primary {
  background: var(--ee-accent);
  color: #14171d;
}

.btn.primary:hover {
  background: var(--ee-accent-strong);
}

.btn.danger {
  background: rgba(229, 87, 87, 0.15);
  color: #ff8080;
}

.btn.danger:hover {
  background: rgba(229, 87, 87, 0.25);
}

.btn-icon {
  @apply text-xs text-gray-600;
}

@keyframes ring {
  0% {
    -webkit-transform: rotate(-15deg);
    -ms-transform: rotate(-15deg);
    transform: rotate(-15deg);
  }

  2% {
    -webkit-transform: rotate(15deg);
    -ms-transform: rotate(15deg);
    transform: rotate(15deg);
  }

  4% {
    -webkit-transform: rotate(-18deg);
    -ms-transform: rotate(-18deg);
    transform: rotate(-18deg);
  }

  6% {
    -webkit-transform: rotate(18deg);
    -ms-transform: rotate(18deg);
    transform: rotate(18deg);
  }

  8% {
    -webkit-transform: rotate(-22deg);
    -ms-transform: rotate(-22deg);
    transform: rotate(-22deg);
  }

  10% {
    -webkit-transform: rotate(22deg);
    -ms-transform: rotate(22deg);
    transform: rotate(22deg);
  }

  12% {
    -webkit-transform: rotate(-18deg);
    -ms-transform: rotate(-18deg);
    transform: rotate(-18deg);
  }

  14% {
    -webkit-transform: rotate(18deg);
    -ms-transform: rotate(18deg);
    transform: rotate(18deg);
  }

  16% {
    -webkit-transform: rotate(-12deg);
    -ms-transform: rotate(-12deg);
    transform: rotate(-12deg);
  }

  18% {
    -webkit-transform: rotate(12deg);
    -ms-transform: rotate(12deg);
    transform: rotate(12deg);
  }

  20% {
    -webkit-transform: rotate(0deg);
    -ms-transform: rotate(0deg);
    transform: rotate(0deg);
  }
}

.faa-ring {
  animation: ring 2s ease;
  transform-origin-x: 50%;
  transform-origin-y: 0px;
  transform-origin-z: initial;
}
</style>
