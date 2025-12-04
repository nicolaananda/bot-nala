import { defineStore } from 'pinia';
import api from '@/api';

export const useDashboardStore = defineStore('dashboard', {
    state: () => ({
        stats: null,
        students: [],
        attendances: [],
        currentStudentAttendances: [],
        invoices: [],
        loading: false,
        error: null,
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0
        }
    }),

    actions: {
        async fetchStatistics() {
            this.loading = true;
            try {
                const response = await api.getStatistics();
                this.stats = response.data.data;
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },

        async fetchStudents(params = {}) {
            this.loading = true;
            try {
                const response = await api.getStudents(params);
                this.students = response.data.data;
                if (response.data.pagination) {
                    this.pagination = response.data.pagination;
                }
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },

        async fetchAttendances(params = {}) {
            this.loading = true;
            try {
                const response = await api.getAttendances(params);
                this.attendances = response.data.data;
                this.pagination = response.data.pagination;
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },

        async fetchStudentAttendances(nama) {
            this.loading = true;
            try {
                const response = await api.getStudentAttendances(nama);
                this.currentStudentAttendances = response.data.data;
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },

        async fetchStudentInvoices(nama) {
            this.loading = true;
            try {
                const response = await api.getStudentInvoices(nama);
                this.invoices = response.data.data;
            } catch (err) {
                this.error = err.message;
            } finally {
                this.loading = false;
            }
        },

        async generateInvoice(data) {
            this.loading = true;
            try {
                const response = await api.generateInvoice(data);
                return response.data;
            } catch (err) {
                this.error = err.message;
                throw err;
            } finally {
                this.loading = false;
            }
        },

        async deleteAttendance(id) {
            this.loading = true;
            try {
                await api.deleteAttendance(id);
            } catch (err) {
                this.error = err.message;
                throw err;
            } finally {
                this.loading = false;
            }
        }
    }
});
