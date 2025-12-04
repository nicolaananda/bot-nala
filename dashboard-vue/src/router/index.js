import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/views/Dashboard.vue';

const routes = [
    {
        path: '/',
        name: 'Dashboard',
        component: Dashboard
    },
    {
        path: '/students',
        name: 'Students',
        component: () => import('@/views/Students.vue')
    },
    {
        path: '/attendances',
        name: 'Attendances',
        component: () => import('@/views/Attendances.vue')
    },
    {
        path: '/student/:nama',
        name: 'StudentDetail',
        component: () => import('@/views/StudentDetail.vue')
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
