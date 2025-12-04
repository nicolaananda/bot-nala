<template>
  <aside 
    class="fixed inset-y-0 left-0 z-30 w-72 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:flex md:flex-col glass-panel border-r-0 rounded-r-2xl my-4 ml-4 h-[calc(100vh-2rem)]"
    :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Logo Area -->
    <div class="h-24 flex items-center justify-between px-8 border-b border-white/10">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/80 to-purple-600/80 flex items-center justify-center shadow-lg shadow-blue-500/20 backdrop-blur-sm border border-white/20">
          <span class="text-white font-bold text-2xl">N</span>
        </div>
        <div>
          <h1 class="text-xl font-bold text-white leading-tight tracking-wide">Nala Bot</h1>
          <p class="text-xs text-blue-300 font-medium tracking-wider uppercase">Dashboard</p>
        </div>
      </div>
      <!-- Mobile Close Button -->
      <button @click="$emit('close')" class="md:hidden text-gray-400 hover:text-white">
        <X class="w-6 h-6" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-8 px-4 space-y-2">
      <p class="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Menu</p>
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        @click="$emit('close')"
        class="flex items-center px-4 py-4 rounded-xl transition-all duration-300 group relative overflow-hidden"
        active-class="bg-blue-600/20 text-white shadow-lg shadow-blue-500/10 border border-blue-500/30"
        :class="[
          $route.path === item.path 
            ? '' 
            : 'text-gray-400 hover:bg-white/5 hover:text-white hover:border hover:border-white/10'
        ]"
      >
        <component 
          :is="item.icon" 
          class="w-5 h-5 mr-3 transition-colors relative z-10"
          :class="$route.path === item.path ? 'text-blue-400' : 'text-gray-500 group-hover:text-white'"
        />
        <span class="font-medium relative z-10">{{ item.name }}</span>
        
        <!-- Active Glow -->
        <div 
          v-if="$route.path === item.path"
          class="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-50"
        ></div>
      </router-link>
    </nav>

    <!-- User Profile -->
    <div class="p-4 border-t border-white/10">
      <div class="flex items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white shadow-md border border-white/20">
          <User class="w-5 h-5" />
        </div>
        <div class="ml-3 overflow-hidden">
          <p class="text-sm font-semibold text-white truncate">Administrator</p>
          <p class="text-xs text-gray-400 truncate">admin@nala.bot</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { LayoutDashboard, Users, Calendar, User, X } from 'lucide-vue-next';
import { useRoute } from 'vue-router';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

const route = useRoute();

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Students', path: '/students', icon: Users },
  { name: 'Attendances', path: '/attendances', icon: Calendar },
];
</script>
