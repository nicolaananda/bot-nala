<template>
  <div class="space-y-8">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(stat, index) in statsCards" :key="index" class="card p-6 relative overflow-hidden group border border-white/10 hover:border-white/30">
        <div class="relative z-10">
          <div class="flex items-center justify-between mb-4">
            <div :class="`p-3 rounded-xl ${stat.bgClass} ${stat.textClass} group-hover:scale-110 transition-transform duration-300 backdrop-blur-md`">
              <component :is="stat.icon" class="w-6 h-6" />
            </div>
            <span :class="`text-xs font-bold px-2.5 py-1 rounded-full ${stat.badgeClass} backdrop-blur-md`">
              {{ stat.trend }}
            </span>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-400">{{ stat.title }}</p>
            <h3 class="text-3xl font-bold mt-1 text-white tracking-tight">{{ stat.value }}</h3>
          </div>
        </div>
        
        <!-- Decorative Background -->
        <div class="absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-125 blur-2xl" :class="stat.textClass.replace('text-', 'bg-')"></div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Revenue Chart -->
      <div class="lg:col-span-2 card p-8 border border-white/10">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h3 class="text-lg font-bold text-white">Revenue Overview</h3>
            <p class="text-sm text-gray-400 mt-1">Monthly revenue performance</p>
          </div>
          <select class="input-field text-sm py-2 bg-white/5 border-white/10 text-white">
            <option>Last 6 Months</option>
            <option>Last Year</option>
          </select>
        </div>
        <div class="h-80">
          <RevenueChart :data="revenueData" />
        </div>
      </div>

      <!-- Top Students -->
      <div class="card p-0 overflow-hidden flex flex-col border border-white/10">
        <div class="p-6 border-b border-white/10 bg-white/5">
          <h3 class="text-lg font-bold text-white">Top Students</h3>
          <p class="text-sm text-gray-400 mt-1">Most active students by attendance</p>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
          <div 
            v-for="(student, index) in topStudents" 
            :key="student.nama" 
            class="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5"
          >
            <div class="flex items-center gap-4">
              <div class="relative">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-300 font-bold text-sm shadow-sm group-hover:shadow-md transition-all border border-white/10">
                  {{ student.nama.charAt(0) }}
                </div>
                <div 
                  v-if="index < 3" 
                  class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-gray-900"
                  :class="index === 0 ? 'bg-yellow-400 text-yellow-900' : index === 1 ? 'bg-gray-300 text-gray-800' : 'bg-orange-300 text-orange-900'"
                >
                  {{ index + 1 }}
                </div>
              </div>
              <div>
                <p class="font-semibold text-white text-sm">{{ student.nama }}</p>
                <p class="text-xs text-gray-400">{{ student.count }} attendances</p>
              </div>
            </div>
            <span class="font-bold text-white text-sm bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              Rp {{ (student.totalHarga / 1000).toFixed(0) }}k
            </span>
          </div>
        </div>
        <div class="p-4 border-t border-white/10 bg-white/5 text-center">
          <router-link to="/students" class="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline">
            View All Students
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { Users, DollarSign, CheckCircle, Clock } from 'lucide-vue-next';
import RevenueChart from '@/components/RevenueChart.vue';

const store = useDashboardStore();

onMounted(() => {
  store.fetchStatistics();
});

const statsCards = computed(() => {
  const s = store.stats || {};
  return [
    { 
      title: 'Total Students', 
      value: s.totalStudents || 0, 
      icon: Users, 
      bgClass: 'bg-blue-500/20', 
      textClass: 'text-blue-400',
      badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      trend: '+12%'
    },
    { 
      title: 'Total Revenue', 
      value: `Rp ${(s.totalRevenue || 0).toLocaleString('id-ID')}`, 
      icon: DollarSign, 
      bgClass: 'bg-green-500/20', 
      textClass: 'text-green-400',
      badgeClass: 'bg-green-500/20 text-green-300 border border-green-500/30',
      trend: '+8.5%'
    },
    { 
      title: 'Invoiced', 
      value: s.invoicedCount || 0, 
      icon: CheckCircle, 
      bgClass: 'bg-purple-500/20', 
      textClass: 'text-purple-400',
      badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      trend: 'Active'
    },
    { 
      title: 'Pending Invoice', 
      value: s.uninvoicedCount || 0, 
      icon: Clock, 
      bgClass: 'bg-orange-500/20', 
      textClass: 'text-orange-400',
      badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      trend: 'Action Needed'
    },
  ];
});

const topStudents = computed(() => store.stats?.topStudents || []);
const revenueData = computed(() => store.stats?.revenueByMonth || []);
</script>
