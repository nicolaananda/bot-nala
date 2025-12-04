<template>
  <Transition name="toast">
    <div 
      v-if="show" 
      :class="[
        'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 flex items-center gap-2',
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      ]"
    >
      <span v-if="type === 'success'">✅</span>
      <span v-else>❌</span>
      {{ message }}
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';

const show = ref(false);
const message = ref('');
const type = ref('success');

const trigger = (msg, t = 'success') => {
  message.value = msg;
  type.value = t;
  show.value = true;
  setTimeout(() => {
    show.value = false;
  }, 3000);
};

defineExpose({ trigger });
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
