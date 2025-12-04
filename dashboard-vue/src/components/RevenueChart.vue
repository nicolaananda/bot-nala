<template>
  <Bar
    v-if="chartData.labels.length > 0"
    :data="chartData"
    :options="chartOptions"
  />
  <div v-else class="flex items-center justify-center h-full text-gray-400">
    No data available
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
});

const chartData = computed(() => {
  return {
    labels: props.data.map(item => item.month),
    datasets: [
      {
        label: 'Revenue (Rp)',
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        data: props.data.map(item => item.total)
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed.y);
          }
          return label;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#f3f4f6'
      },
      ticks: {
        callback: (value) => {
          return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value);
        }
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
};
</script>
