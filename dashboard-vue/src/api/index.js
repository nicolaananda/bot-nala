import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default {
    // Statistics
    getStatistics() {
        return api.get('/statistics');
    },

    // Students
    getStudents() {
        return api.get('/students');
    },

    // Attendances
    getAttendances(params) {
        return api.get('/attendances', { params });
    },

    getStudentAttendances(nama) {
        return api.get(`/attendances/student/${nama}`);
    },

    deleteAttendance(id) {
        return api.delete(`/attendances/${id}`);
    },

    // Invoice
    generateInvoice(data) {
        return api.post('/invoice/generate', data);
    },

    getStudentInvoices(nama) {
        return api.get(`/invoices/student/${nama}`);
    }
};
