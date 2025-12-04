<template>
  <header class="h-20 md:h-24 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
    <div class="glass-panel px-4 py-2 md:px-6 md:py-3 rounded-2xl flex items-center gap-4">
      <button @click="$emit('toggle-sidebar')" class="md:hidden text-gray-400 hover:text-white">
        <Menu class="w-6 h-6" />
      </button>
      <div>
        <h2 class="text-xl md:text-2xl font-bold text-white tracking-tight">{{ routeName }}</h2>
        <p class="text-xs md:text-sm text-gray-400 mt-0.5 hidden md:block">Welcome back, Admin</p>
      </div>
    </div>
    
    <div class="flex items-center gap-4">
      <button class="w-10 h-10 md:w-12 md:h-12 rounded-2xl glass-panel flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg active:scale-95 border border-white/10">
        <Bell class="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Bell, Menu } from 'lucide-vue-next';

const route = useRoute();
const routeName = computed(() => route.name);

defineEmits(['toggle-sidebar']);
</script>
