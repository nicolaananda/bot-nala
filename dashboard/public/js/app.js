// Global variables
let currentPage = 1;
let currentTab = 'attendances';
let revenueChart = null;
let topStudentsChart = null;
let revenueByStudentChart = null;
let invoiceStatusChart = null;
let selectedAttendances = new Set();
let currentInvoiceData = null;
let allStudents = [];
let allAttendances = [];

// --- Utility Functions ---

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const messageEl = toast.querySelector('.toast-message');
    const iconEl = toast.querySelector('.toast-icon');

    toast.className = `toast ${type}`;
    if (messageEl) messageEl.textContent = message;

    // Icons
    let iconHtml = '';
    if (type === 'success') iconHtml = '<i class="fas fa-check-circle"></i>';
    else if (type === 'error') iconHtml = '<i class="fas fa-times-circle"></i>';
    else if (type === 'warning') iconHtml = '<i class="fas fa-exclamation-triangle"></i>';

    if (iconEl) iconEl.innerHTML = iconHtml;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function updateLastUpdate() {
    const now = new Date();
    const el = document.getElementById('lastUpdate');
    if (el) el.textContent = `Updated: ${formatDateTime(now)}`;
}

// --- Navigation & UI Logic ---

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const exportDropdown = document.getElementById('exportDropdown');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (sidebar && !sidebar.contains(e.target) && sidebarToggle && !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }

        // Close dropdowns
        if (exportDropdown && !e.target.closest('.dropdown')) {
            exportDropdown.classList.remove('show');
        }
    });

    // Nav Item Click Handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
            // Only for main menu items that switch tabs
            if (this.getAttribute('onclick') && this.getAttribute('onclick').includes('showTab')) {
                // Remove active class from all nav items
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                // Add active class to clicked item
                this.classList.add('active');

                // On mobile, close sidebar after selection
                if (window.innerWidth <= 1024) {
                    sidebar.classList.remove('active');
                }
            }
        });
    });
}

function toggleExportDropdown() {
    const dropdown = document.getElementById('exportDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function showTab(tabName) {
    console.log('Switching to tab:', tabName);
    currentTab = tabName;

    // Update Tab Content Visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none'; // Ensure hidden
    });

    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = 'block'; // Ensure visible
    }

    // Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-item')).find(btn =>
        btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabName}'`)
    );
    if (activeBtn) activeBtn.classList.add('active');

    // Update Page Title
    const titles = {
        'attendances': 'Daftar Absensi',
        'students': 'Daftar Siswa',
        'charts': 'Analytics Overview'
    };
    const titleEl = document.querySelector('.page-title');
    if (titleEl) titleEl.textContent = titles[tabName] || 'Dashboard';

    // Load Data
    if (tabName === 'attendances') {
        loadAttendances(currentPage);
    } else if (tabName === 'students') {
        loadStudents();
    } else if (tabName === 'charts') {
        loadStatistics();
    }
}

// --- Data Loading ---

async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const result = await response.json();

        if (result.success) {
            const stats = result.data;

            // Update Stats Cards
            const updateEl = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            updateEl('totalStudents', stats.totalStudents);
            updateEl('totalAttendances', stats.totalAttendances);
            updateEl('totalRevenue', formatCurrency(stats.totalRevenue));
            updateEl('invoicedCount', stats.invoicedCount);
            updateEl('uninvoicedCount', stats.uninvoicedCount);

            updateLastUpdate();

            // Update charts if on charts tab
            if (currentTab === 'charts') {
                updateCharts(stats);
            }
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        showToast('Gagal memuat statistik', 'error');
    }
}

async function loadAttendances(page = 1) {
    try {
        const tbody = document.getElementById('attendancesTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="loading-state"><div class="spinner"></div><span>Memuat data...</span></td></tr>';

        const namaFilter = document.getElementById('namaFilter')?.value || '';
        const dateFrom = document.getElementById('dateFrom')?.value || '';
        const dateTo = document.getElementById('dateTo')?.value || '';
        const invoiceStatusFilter = document.getElementById('invoiceStatusFilter')?.value || '';

        let url = `/api/attendances?page=${page}&limit=20`;
        if (namaFilter) url += `&nama=${encodeURIComponent(namaFilter)}`;
        if (dateFrom) url += `&dateFrom=${dateFrom}`;
        if (dateTo) url += `&dateTo=${dateTo}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            allAttendances = result.data;

            // Client-side filter for invoice status (if API doesn't support it yet)
            let filteredData = allAttendances;
            if (invoiceStatusFilter !== '') {
                filteredData = allAttendances.filter(att => {
                    if (invoiceStatusFilter === 'true') return att.isInvoiced;
                    if (invoiceStatusFilter === 'false') return !att.isInvoiced;
                    return true;
                });
            }

            if (tbody) tbody.innerHTML = '';

            if (filteredData.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="loading-state">Tidak ada data absensi</td></tr>';
                const badge = document.getElementById('attendancesBadge');
                if (badge) badge.textContent = '0';
                return;
            }

            const badge = document.getElementById('attendancesBadge');
            if (badge) badge.textContent = result.pagination.total;

            filteredData.forEach(att => {
                const tr = document.createElement('tr');
                const isChecked = selectedAttendances.has(att._id);

                // Safe image handling
                let fotoHtml = '<td><span class="no-photo">-</span></td>';
                if (att.foto_base64) {
                    // Escape single quotes for onclick
                    const safeFoto = att.foto_base64.replace(/'/g, "\\'");
                    const safeNama = att.nama.replace(/'/g, "\\'");
                    const safeDesc = att.deskripsi.replace(/'/g, "\\'");

                    fotoHtml = `<td>
                        <img src="${att.foto_base64}" 
                             alt="Foto" 
                             class="attendance-photo" 
                             onclick="openModal('${safeFoto}', '${safeNama}', '${formatDate(att.tanggal)}', '${safeDesc}', '${formatCurrency(att.harga)}')"
                             onerror="this.src='https://placehold.co/100x100?text=No+Image'">
                    </td>`;
                }

                tr.innerHTML = `
                    <td>
                        <div class="checkbox-wrapper">
                            <input type="checkbox" id="cb_${att._id}" ${isChecked ? 'checked' : ''} onchange="toggleAttendanceSelection('${att._id}')">
                            <label for="cb_${att._id}"></label>
                        </div>
                    </td>
                    ${fotoHtml}
                    <td>
                        <div class="student-info">
                            <span class="student-name">${att.nama}</span>
                        </div>
                    </td>
                    <td>${formatDate(att.tanggal)}</td>
                    <td><span class="desc-truncate" title="${att.deskripsi}">${att.deskripsi}</span></td>
                    <td class="font-mono">${formatCurrency(att.harga)}</td>
                    <td>
                        <span class="badge ${att.isInvoiced ? 'badge-success' : 'badge-warning'}">
                            ${att.isInvoiced ? 'Invoiced' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${!att.isInvoiced ? `
                                <button class="btn-icon-sm btn-primary-light" onclick="generateSingleInvoice('${att.nama}', ['${att._id}'])" title="Generate Invoice">
                                    <i class="fas fa-file-invoice"></i>
                                </button>
                            ` : ''}
                            <button class="btn-icon-sm btn-danger-light" onclick="deleteAttendance('${att._id}', '${att.nama}', '${formatDate(att.tanggal)}')" title="Hapus">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            updatePagination(result.pagination);
            currentPage = page;
            updateSelectedCount();
        }
    } catch (error) {
        console.error('Error loading attendances:', error);
        const tbody = document.getElementById('attendancesTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="loading-state">Error memuat data. Silakan refresh.</td></tr>';
        showToast('Gagal memuat data absensi', 'error');
    }
}

async function loadStudents() {
    try {
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-state"><div class="spinner"></div><span>Memuat data...</span></td></tr>';

        const response = await fetch('/api/students');
        const result = await response.json();

        if (result.success) {
            allStudents = result.data;
            if (tbody) tbody.innerHTML = '';

            if (result.data.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-state">Tidak ada data siswa</td></tr>';
                const badge = document.getElementById('studentsBadge');
                if (badge) badge.textContent = '0';
                return;
            }

            const badge = document.getElementById('studentsBadge');
            if (badge) badge.textContent = result.data.length;

            result.data.forEach(student => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${student.nama}</strong></td>
                    <td>${student.totalAttendances}</td>
                    <td><span class="text-success">${student.invoicedCount}</span></td>
                    <td><span class="text-warning">${student.uninvoicedCount}</span></td>
                    <td class="font-mono">${formatCurrency(student.totalHarga)}</td>
                    <td>${student.lastAttendance ? formatDate(student.lastAttendance) : '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon-sm btn-info-light" onclick="viewStudentAttendances('${student.nama}')" title="Lihat Detail">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${student.uninvoicedCount > 0 ? `
                                <button class="btn-icon-sm btn-primary-light" onclick="generateInvoiceFromStudent('${student.nama}')" title="Generate Invoice">
                                    <i class="fas fa-file-invoice"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Populate select
            const select = document.getElementById('invoiceStudentSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
                result.data.forEach(student => {
                    if (student.uninvoicedCount > 0) {
                        const option = document.createElement('option');
                        option.value = student.nama;
                        option.textContent = `${student.nama} (${student.uninvoicedCount} pending)`;
                        select.appendChild(option);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading students:', error);
        const tbody = document.getElementById('studentsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-state">Error memuat data</td></tr>';
    }
}

// --- Actions ---

function toggleAttendanceSelection(id) {
    if (selectedAttendances.has(id)) {
        selectedAttendances.delete(id);
    } else {
        selectedAttendances.add(id);
    }
    updateSelectedCount();
}

function toggleSelectAll() {
    const headerCheckbox = document.getElementById('selectAllHeader');
    const isChecked = headerCheckbox.checked;

    const tbody = document.getElementById('attendancesTableBody');
    const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');

    if (isChecked) {
        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            // Find the ID from the onchange attribute
            const onchange = row.querySelector('input[type="checkbox"]').getAttribute('onchange');
            if (onchange) {
                const match = onchange.match(/'([^']+)'/);
                if (match) {
                    const id = match[1];
                    selectedAttendances.add(id);
                    cb.checked = true;
                }
            }
        });
    } else {
        selectedAttendances.clear();
        checkboxes.forEach(cb => cb.checked = false);
    }

    updateSelectedCount();
}

function updateSelectedCount() {
    const count = selectedAttendances.size;
    const countEl = document.getElementById('selectedCount');
    const bulkBtn = document.getElementById('bulkInvoiceBtn');

    if (countEl) countEl.textContent = `${count} selected`;
    if (bulkBtn) bulkBtn.disabled = count === 0;
}

async function generateSingleInvoice(nama, attendanceIds) {
    try {
        showToast('Generating invoice...', 'warning');

        const response = await fetch('/api/invoice/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, attendanceIds })
        });

        const result = await response.json();

        if (result.success) {
            currentInvoiceData = result.data;
            showInvoicePreview(result.data);
            showToast('Invoice generated successfully!', 'success');
            loadStatistics();
            loadAttendances(currentPage);
            loadStudents();
        } else {
            showToast(result.message || 'Failed to generate invoice', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Server error', 'error');
    }
}

async function bulkGenerateInvoice() {
    if (selectedAttendances.size === 0) return;

    const attendanceIds = Array.from(selectedAttendances);
    // Assuming all selected are from same student for now, or backend handles it.
    // Ideally we should check if they are same student.
    // For simplicity, we take the first one's name.
    const firstAtt = allAttendances.find(att => attendanceIds.includes(att._id));

    if (!firstAtt) return;

    // Verify all selected are same student
    const differentStudent = attendanceIds.some(id => {
        const att = allAttendances.find(a => a._id === id);
        return att && att.nama !== firstAtt.nama;
    });

    if (differentStudent) {
        showToast('Please select attendances for the same student only', 'error');
        return;
    }

    await generateSingleInvoice(firstAtt.nama, attendanceIds);
    selectedAttendances.clear();
    updateSelectedCount();
}

async function deleteAttendance(id, nama, tanggal) {
    if (!confirm(`Delete attendance for ${nama} on ${tanggal}?`)) return;

    try {
        const response = await fetch(`/api/attendances/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            showToast('Deleted successfully', 'success');
            loadStatistics();
            loadAttendances(currentPage);
        } else {
            showToast('Failed to delete', 'error');
        }
    } catch (error) {
        showToast('Error deleting', 'error');
    }
}

function viewStudentAttendances(nama) {
    const filter = document.getElementById('namaFilter');
    if (filter) filter.value = nama;
    showTab('attendances');
    applyFilters();
}

function applyFilters() {
    currentPage = 1;
    selectedAttendances.clear();
    updateSelectedCount();
    if (currentTab === 'attendances') {
        loadAttendances(1);
    }
}

function clearFilters() {
    ['namaFilter', 'dateFrom', 'dateTo', 'invoiceStatusFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    applyFilters();
}

function refreshData() {
    loadStatistics();
    if (currentTab === 'attendances') loadAttendances(currentPage);
    else if (currentTab === 'students') loadStudents();
    showToast('Data refreshed', 'success');
}

function exportData(format) {
    window.location.href = `/api/export/attendances?format=${format}`;
}

function quickSearch() {
    const term = document.getElementById('tableSearch')?.value.toLowerCase();
    if (!term) return;

    const rows = document.querySelectorAll('#attendancesTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

// --- Modals ---

function showGenerateInvoiceModal() {
    document.getElementById('generateInvoiceModal').classList.add('active');
    loadStudents();
}

function closeGenerateInvoiceModal() {
    document.getElementById('generateInvoiceModal').classList.remove('active');
}

function showInvoicePreview(data) {
    const content = document.getElementById('invoicePreviewContent');
    if (content) {
        content.innerHTML = `
            <div class="preview-container">
                <img src="${data.invoiceBase64}" alt="Invoice">
                <div class="preview-details">
                    <h4>${data.nama}</h4>
                    <p>${data.attendanceCount} items • ${formatCurrency(data.totalHarga)}</p>
                </div>
            </div>
        `;
    }
    document.getElementById('invoicePreviewModal').classList.add('active');
}

function closeInvoicePreviewModal() {
    document.getElementById('invoicePreviewModal').classList.remove('active');
}

function openModal(src, nama, tanggal, deskripsi, harga) {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('modalImage');
    const info = document.getElementById('modalInfo');

    if (img) img.src = src;
    if (info) {
        info.innerHTML = `
            <h3>${nama}</h3>
            <div class="meta">
                <span><i class="far fa-calendar"></i> ${tanggal}</span>
                <span><i class="fas fa-tag"></i> ${harga}</span>
            </div>
            <p>${deskripsi}</p>
        `;
    }

    if (modal) modal.classList.add('active');
}

function closeModal() {
    document.getElementById('imageModal').classList.remove('active');
}

async function loadUninvoicedAttendances() {
    const select = document.getElementById('invoiceStudentSelect');
    const studentName = select.value;
    const list = document.getElementById('uninvoicedAttendancesList');

    if (!studentName) {
        list.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/api/attendances/student/${encodeURIComponent(studentName)}`);
        const result = await response.json();

        if (result.success) {
            const uninvoiced = result.data.filter(att => !att.isInvoiced);

            if (uninvoiced.length === 0) {
                list.innerHTML = '<div class="empty-state">No pending attendances</div>';
                return;
            }

            list.innerHTML = `
                <div class="selection-header">
                    <h4>Select Items</h4>
                    <span class="text-muted">${uninvoiced.length} available</span>
                </div>
            `;

            uninvoiced.forEach(att => {
                const item = document.createElement('div');
                item.className = 'attendance-select-item';
                item.innerHTML = `
                    <input type="checkbox" id="inv_${att._id}" value="${att._id}" onchange="updateInvoicePreview()">
                    <label for="inv_${att._id}">
                        <span class="date">${formatDate(att.tanggal)}</span>
                        <span class="desc">${att.deskripsi}</span>
                        <span class="price">${formatCurrency(att.harga)}</span>
                    </label>
                `;
                list.appendChild(item);
            });
        }
    } catch (error) {
        console.error(error);
    }
}

function updateInvoicePreview() {
    const checkboxes = document.querySelectorAll('#uninvoicedAttendancesList input:checked');
    const btn = document.getElementById('generateInvoiceBtn');
    const preview = document.getElementById('invoicePreview');

    const count = checkboxes.length;

    if (count > 0) {
        let total = 0;
        checkboxes.forEach(cb => {
            const priceText = cb.nextElementSibling.querySelector('.price').textContent;
            // Remove non-numeric chars
            const price = parseInt(priceText.replace(/[^0-9]/g, ''));
            total += price;
        });

        preview.innerHTML = `
            <div class="summary-card">
                <div class="row">
                    <span>Selected Items</span>
                    <strong>${count}</strong>
                </div>
                <div class="row total">
                    <span>Total Amount</span>
                    <strong>${formatCurrency(total)}</strong>
                </div>
            </div>
        `;
        btn.disabled = false;
    } else {
        preview.innerHTML = '';
        btn.disabled = true;
    }
}

async function generateInvoiceFromModal() {
    const select = document.getElementById('invoiceStudentSelect');
    const checkboxes = document.querySelectorAll('#uninvoicedAttendancesList input:checked');

    if (!select.value || checkboxes.length === 0) return;

    const ids = Array.from(checkboxes).map(cb => cb.value);
    await generateSingleInvoice(select.value, ids);
    closeGenerateInvoiceModal();
}

function generateInvoiceFromStudent(nama) {
    // Open modal and select student
    showGenerateInvoiceModal();
    // Wait for students to load then select
    setTimeout(() => {
        const select = document.getElementById('invoiceStudentSelect');
        if (select) {
            select.value = nama;
            loadUninvoicedAttendances();
        }
    }, 500);
}

function downloadInvoice() {
    if (!currentInvoiceData) return;
    const link = document.createElement('a');
    link.href = currentInvoiceData.invoiceBase64;
    link.download = currentInvoiceData.fileName;
    link.click();
}

// --- Pagination ---

function updatePagination(pagination) {
    const el = document.getElementById('pagination');
    if (!el) return;

    el.innerHTML = '';

    if (pagination.pages <= 1) return;

    const createBtn = (text, page, active = false, disabled = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        if (active) btn.classList.add('active');
        if (disabled) btn.disabled = true;
        else btn.onclick = () => loadAttendances(page);
        return btn;
    };

    el.appendChild(createBtn('«', pagination.page - 1, false, pagination.page === 1));

    // Simple pagination logic
    for (let i = 1; i <= pagination.pages; i++) {
        if (
            i === 1 ||
            i === pagination.pages ||
            (i >= pagination.page - 1 && i <= pagination.page + 1)
        ) {
            el.appendChild(createBtn(i, i, i === pagination.page));
        } else if (
            i === pagination.page - 2 ||
            i === pagination.page + 2
        ) {
            const span = document.createElement('span');
            span.textContent = '...';
            span.className = 'pagination-dots';
            el.appendChild(span);
        }
    }

    el.appendChild(createBtn('»', pagination.page + 1, false, pagination.page === pagination.pages));
}

// --- Charts ---

function updateCharts(stats) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stats.revenueByMonth.map(m => m.month),
            datasets: [{
                label: 'Revenue',
                data: stats.revenueByMonth.map(m => m.total),
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    // Top Students
    const ctx2 = document.getElementById('topStudentsChart');
    if (ctx2) {
        if (topStudentsChart) topStudentsChart.destroy();
        topStudentsChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: stats.topStudents.map(s => s.nama),
                datasets: [{
                    label: 'Attendances',
                    data: stats.topStudents.map(s => s.count),
                    backgroundColor: '#4361ee',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Invoice Status
    const ctx3 = document.getElementById('invoiceStatusChart');
    if (ctx3) {
        if (invoiceStatusChart) invoiceStatusChart.destroy();
        invoiceStatusChart = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: ['Invoiced', 'Pending'],
                datasets: [{
                    data: [stats.invoicedCount, stats.uninvoicedCount],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    loadStatistics();
    loadAttendances(1);

    // Set default tab
    showTab('attendances');

    // Auto refresh
    setInterval(() => {
        loadStatistics();
        if (currentTab === 'attendances') loadAttendances(currentPage);
    }, 60000);
});
