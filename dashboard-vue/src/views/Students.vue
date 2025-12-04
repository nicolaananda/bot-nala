<template>
  <div class="space-y-6">
    <div class="card overflow-hidden border border-white/10">
      <!-- Header & Filters -->
      <div class="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5">
        <div>
          <h3 class="text-lg font-bold text-white">All Students</h3>
          <p class="text-sm text-gray-400 mt-1">Manage and view student performance</p>
        </div>
        <div class="relative w-full sm:w-72">
          <input 
            type="text" 
            placeholder="Search students..." 
            class="input-field w-full pl-10 bg-black/20 border-white/10 text-white placeholder-gray-500"
            v-model="searchQuery"
          >
          <Search class="w-5 h-5 text-gray-500 absolute left-3 top-2.5" />
        </div>
      </div>
      
      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="table-header text-xs uppercase tracking-wider text-gray-400 font-semibold bg-white/5">
              <th class="px-6 py-4">Name</th>
              <th class="px-6 py-4">Attendance</th>
              <th class="px-6 py-4">Total Revenue</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4">Last Seen</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="student in filteredStudents" :key="student.nama" class="table-row group hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-300 font-bold mr-3 shadow-sm group-hover:shadow-md transition-all border border-white/10">
                    {{ student.nama.charAt(0) }}
                  </div>
                  <span class="font-semibold text-white">{{ student.nama }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-full bg-gray-700/50 rounded-full h-1.5 w-24 overflow-hidden">
                    <div class="bg-blue-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" :style="`width: ${Math.min(student.totalAttendances * 10, 100)}%`"></div>
                  </div>
                  <span class="text-sm font-medium text-gray-300">{{ student.totalAttendances }}</span>
                </div>
              </td>
              <td class="px-6 py-4 font-medium text-white">
                Rp {{ student.totalHarga.toLocaleString('id-ID') }}
              </td>
              <td class="px-6 py-4">
                <span v-if="student.uninvoicedCount > 0" class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-sm">
                  {{ student.uninvoicedCount }} Pending
                </span>
                <span v-else class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30 backdrop-blur-sm">
                  All Invoiced
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-400">
                {{ formatDate(student.lastAttendance) }}
              </td>
              <td class="px-6 py-4 text-right">
                <router-link 
                  :to="`/student/${student.nama}`"
                  class="btn btn-secondary text-xs px-3 py-1.5 inline-flex"
                >
                  View Details
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
        <span class="text-sm text-gray-400 font-medium">
          Page {{ store.pagination.page }} of {{ store.pagination.pages }}
        </span>
        <div class="flex gap-2">
          <button 
            @click="changePage(store.pagination.page - 1)"
            :disabled="store.pagination.page <= 1"
            class="btn btn-secondary text-sm py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button 
            @click="changePage(store.pagination.page + 1)"
            :disabled="store.pagination.page >= store.pagination.pages"
            class="btn btn-secondary text-sm py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { Search } from 'lucide-vue-next';
import moment from 'moment';

const store = useDashboardStore();
const searchQuery = ref('');

const loadData = () => {
  store.fetchStudents({
    page: store.pagination.page,
    limit: 20
  });
};

onMounted(() => {
  loadData();
});

const changePage = (page) => {
  store.pagination.page = page;
  loadData();
};

const filteredStudents = computed(() => {
  if (!searchQuery.value) return store.students;
  return store.students.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const formatDate = (date) => {
  return moment(date).format('DD MMM YYYY');
};
</script>
