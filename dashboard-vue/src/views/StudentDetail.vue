<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div class="flex items-center gap-4">
        <router-link 
          to="/students" 
          class="p-2.5 glass-panel rounded-xl hover:bg-white/10 transition-colors group border border-white/10"
        >
          <ArrowLeft class="w-5 h-5 text-gray-400 group-hover:text-white" />
        </router-link>
        <div>
          <h2 class="text-2xl font-bold text-white">{{ route.params.nama }}</h2>
          <p class="text-sm text-gray-400">Student Profile & History</p>
        </div>
      </div>
      <button 
        @click="generateInvoice"
        :disabled="generating || uninvoicedCount === 0"
        class="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText class="w-5 h-5" />
        {{ generating ? 'Generating...' : 'Generate Invoice' }}
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card p-6 relative overflow-hidden group border border-white/10">
        <div class="relative z-10">
          <p class="text-sm font-medium text-gray-400">Total Attendances</p>
          <h3 class="text-3xl font-bold mt-2 text-white">{{ store.currentStudentAttendances.length }}</h3>
        </div>
        <div class="absolute right-4 top-4 p-3 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
          <Calendar class="w-6 h-6" />
        </div>
      </div>

      <div class="card p-6 relative overflow-hidden group border border-white/10">
        <div class="relative z-10">
          <p class="text-sm font-medium text-gray-400">Pending Items</p>
          <h3 class="text-3xl font-bold mt-2 text-orange-400">{{ uninvoicedCount }}</h3>
        </div>
        <div class="absolute right-4 top-4 p-3 bg-orange-500/20 rounded-xl text-orange-400 border border-orange-500/30">
          <Clock class="w-6 h-6" />
        </div>
      </div>

      <div class="card p-6 relative overflow-hidden group border border-white/10">
        <div class="relative z-10">
          <p class="text-sm font-medium text-gray-400">Pending Amount</p>
          <h3 class="text-3xl font-bold mt-2 text-blue-400">Rp {{ pendingAmount.toLocaleString('id-ID') }}</h3>
        </div>
        <div class="absolute right-4 top-4 p-3 bg-green-500/20 rounded-xl text-green-400 border border-green-500/30">
          <DollarSign class="w-6 h-6" />
        </div>
      </div>
    </div>
    
    <!-- Invoice History -->
    <div v-if="store.invoices.length > 0" class="card overflow-hidden border border-white/10">
      <div class="p-6 border-b border-white/10 bg-white/5">
        <h3 class="text-lg font-bold text-white">Invoice History</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="table-header text-xs uppercase tracking-wider text-gray-400 font-semibold bg-white/5">
              <th class="px-6 py-4">Date</th>
              <th class="px-6 py-4">Total Amount</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="inv in store.invoices" :key="inv._id" class="table-row hover:bg-white/5 transition-colors">
              <td class="px-6 py-4 text-sm font-medium text-white">{{ formatDate(inv.date) }}</td>
              <td class="px-6 py-4 font-medium text-white">Rp {{ inv.totalAmount.toLocaleString('id-ID') }}</td>
              <td class="px-6 py-4 text-right">
                <button 
                  @click="openImage(`/api/invoice/${inv.filename}`)"
                  class="btn btn-secondary text-xs px-3 py-1.5 inline-flex"
                >
                  View Invoice
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Attendance List -->
    <div class="card overflow-hidden border border-white/10">
      <div class="p-6 border-b border-white/10 bg-white/5">
        <h3 class="text-lg font-bold text-white">Attendance History</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="table-header text-xs uppercase tracking-wider text-gray-400 font-semibold bg-white/5">
              <th class="px-6 py-4">Date</th>
              <th class="px-6 py-4">Description</th>
              <th class="px-6 py-4">Price</th>
              <th class="px-6 py-4">Proof</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="att in store.currentStudentAttendances" :key="att._id" class="table-row hover:bg-white/5 transition-colors">
              <td class="px-6 py-4 text-sm font-medium text-white">{{ formatDate(att.tanggal) }}</td>
              <td class="px-6 py-4 text-sm text-gray-400">{{ att.deskripsi }}</td>
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
              <td class="px-6 py-4 text-right">
                <button 
                  @click="deleteAttendance(att._id)"
                  class="btn btn-danger text-xs px-3 py-1.5 inline-flex"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Image Modal -->
    <div v-if="selectedImage" class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-all duration-300" @click="selectedImage = null">
      <img :src="selectedImage" class="max-w-full max-h-[90vh] rounded-2xl shadow-2xl border border-white/10" />
      <button class="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2 backdrop-blur-sm">
        <X class="w-6 h-6" />
      </button>
    </div>

    <Toast ref="toast" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboard';
import { ArrowLeft, FileText, Calendar, Clock, DollarSign, Image as ImageIcon, X } from 'lucide-vue-next';
import moment from 'moment';
import Toast from '@/components/Toast.vue';

const route = useRoute();
const store = useDashboardStore();
const selectedImage = ref(null);
const generating = ref(false);
const toast = ref(null);

onMounted(() => {
  store.fetchStudentAttendances(route.params.nama);
  store.fetchStudentInvoices(route.params.nama);
});

const uninvoicedCount = computed(() => 
  store.currentStudentAttendances.filter(a => !a.isInvoiced).length
);

const pendingAmount = computed(() => 
  store.currentStudentAttendances
    .filter(a => !a.isInvoiced)
    .reduce((sum, a) => sum + a.harga, 0)
);

const formatDate = (date) => {
  return moment(date).format('DD MMM YYYY');
};

const openImage = (src) => {
  selectedImage.value = src;
};

const deleteAttendance = async (id) => {
  if (confirm('Are you sure you want to delete this attendance?')) {
    try {
      await store.deleteAttendance(id);
      await store.fetchStudentAttendances(route.params.nama);
      toast.value.trigger('Attendance deleted successfully', 'success');
    } catch (err) {
      toast.value.trigger('Failed to delete: ' + err.message, 'error');
    }
  }
};

const generateInvoice = async () => {
  if (!confirm(`Generate invoice for ${uninvoicedCount.value} items totaling Rp ${pendingAmount.value.toLocaleString('id-ID')}?`)) return;
  
  generating.value = true;
  try {
    await store.generateInvoice({ nama: route.params.nama });
    
    // Refresh list
    await store.fetchStudentAttendances(route.params.nama);
    await store.fetchStudentInvoices(route.params.nama);
    
    toast.value.trigger('Invoice generated successfully!', 'success');
  } catch (err) {
    toast.value.trigger('Failed to generate invoice: ' + err.message, 'error');
  } finally {
    generating.value = false;
  }
};
</script>
