<template>
  <div class="space-y-6">
    <div class="card overflow-hidden border border-white/10">
      <!-- Header & Filters -->
      <div class="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5">
        <div>
          <h3 class="text-lg font-bold text-white">Attendance History</h3>
          <p class="text-sm text-gray-400 mt-1">Track all student check-ins</p>
        </div>
        <div class="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            @click="exportData"
            class="btn btn-primary text-sm px-4 py-2"
          >
            <Download class="w-4 h-4" />
            Export CSV
          </button>
          <input 
            type="date" 
            v-model="filters.dateFrom"
            class="input-field text-sm bg-black/20 border-white/10 text-white"
          >
          <div class="relative flex-1 sm:flex-none sm:w-64">
             <input 
              type="text" 
              placeholder="Search by name..." 
              class="input-field w-full pl-10 text-sm bg-black/20 border-white/10 text-white placeholder-gray-500"
              v-model="filters.nama"
              @input="debouncedSearch"
            >
            <Search class="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          </div>
        </div>
      </div>
      
      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="table-header text-xs uppercase tracking-wider text-gray-400 font-semibold bg-white/5">
              <th class="px-6 py-4">Date</th>
              <th class="px-6 py-4">Student</th>
              <th class="px-6 py-4">Description</th>
              <th class="px-6 py-4">Price</th>
              <th class="px-6 py-4">Proof</th>
              <th class="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="att in store.attendances" :key="att._id" class="table-row hover:bg-white/5 transition-colors">
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="font-medium text-white">{{ moment(att.tanggal).format('DD MMM YYYY') }}</span>
                </div>
              </td>
              <td class="px-6 py-4 font-semibold text-white">{{ att.nama }}</td>
              <td class="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{{ att.deskripsi }}</td>
              <td class="px-6 py-4 font-medium text-gray-200">Rp {{ att.harga.toLocaleString('id-ID') }}</td>
              <td class="px-6 py-4">
                <button 
                  @click="openImage(att.foto_base64 || att.foto_path)"
                  class="text-blue-400 hover:text-blue-300 text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <ImageIcon class="w-4 h-4" />
                  View
                </button>
              </td>
              <td class="px-6 py-4">
                <span 
                  :class="`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border backdrop-blur-sm ${
                    att.isInvoiced 
                      ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  }`"
                >
                  {{ att.isInvoiced ? 'Invoiced' : 'Pending' }}
                </span>
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

    <!-- Image Modal -->
    <div v-if="selectedImage" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-all duration-300" @click="selectedImage = null">
      <img :src="selectedImage" class="max-w-full max-h-[90vh] rounded-2xl shadow-2xl border border-white/10" />
      <button class="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2 backdrop-blur-sm">
        <X class="w-6 h-6" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import moment from 'moment';
import { debounce } from 'lodash';
import { Download, Search, Image as ImageIcon, X } from 'lucide-vue-next';

const store = useDashboardStore();
const selectedImage = ref(null);
const filters = reactive({
  nama: '',
  dateFrom: '',
  dateTo: ''
});

const loadData = () => {
  store.fetchAttendances({
    page: store.pagination.page,
    limit: 20,
    ...filters
  });
};

onMounted(() => {
  loadData();
});

const debouncedSearch = debounce(() => {
  store.pagination.page = 1;
  loadData();
}, 500);

watch(() => filters.dateFrom, () => {
  store.pagination.page = 1;
  loadData();
});

const changePage = (page) => {
  store.pagination.page = page;
  loadData();
};

const openImage = (src) => {
  selectedImage.value = src;
};

const exportData = () => {
  window.location.href = '/api/export/attendances?format=csv';
};
</script>
