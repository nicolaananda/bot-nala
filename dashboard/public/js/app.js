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

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    toast.className = `toast ${type}`;
    messageEl.textContent = message;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    icon.className = `toast-icon ${icons[type] || icons.success}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Update last update time
function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = 
        `Terakhir diupdate: ${formatDateTime(now)}`;
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            document.getElementById('totalStudents').textContent = stats.totalStudents;
            document.getElementById('totalAttendances').textContent = stats.totalAttendances;
            document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
            document.getElementById('invoicedCount').textContent = stats.invoicedCount;
            document.getElementById('uninvoicedCount').textContent = stats.uninvoicedCount;
            
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

// Load attendances
async function loadAttendances(page = 1) {
    try {
        const namaFilter = document.getElementById('namaFilter').value;
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        const invoiceStatusFilter = document.getElementById('invoiceStatusFilter')?.value || '';
        
        let url = `/api/attendances?page=${page}&limit=20`;
        if (namaFilter) url += `&nama=${encodeURIComponent(namaFilter)}`;
        if (dateFrom) url += `&dateFrom=${dateFrom}`;
        if (dateTo) url += `&dateTo=${dateTo}`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            allAttendances = result.data;
            
            // Filter by invoice status if needed
            let filteredData = allAttendances;
            if (invoiceStatusFilter !== '') {
                filteredData = allAttendances.filter(att => {
                    if (invoiceStatusFilter === 'true') return att.isInvoiced;
                    if (invoiceStatusFilter === 'false') return !att.isInvoiced;
                    return true;
                });
            }
            
            const tbody = document.getElementById('attendancesTableBody');
            tbody.innerHTML = '';
            
            if (filteredData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="loading">Tidak ada data absensi</td></tr>';
                document.getElementById('attendancesBadge').textContent = '0';
                return;
            }
            
            document.getElementById('attendancesBadge').textContent = result.pagination.total;
            
            filteredData.forEach(att => {
                const tr = document.createElement('tr');
                const isChecked = selectedAttendances.has(att._id);
                const fotoCell = att.foto_base64 
                    ? `<td><img src="${att.foto_base64}" alt="Foto absensi" class="attendance-photo" onclick="openModal('${att.foto_base64}', '${att.nama}', '${formatDate(att.tanggal)}', '${att.deskripsi}', '${formatCurrency(att.harga)}')"></td>`
                    : `<td>-</td>`;
                
                tr.innerHTML = `
                    <td><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleAttendanceSelection('${att._id}')"></td>
                    ${fotoCell}
                    <td><strong>${att.nama}</strong></td>
                    <td>${formatDate(att.tanggal)}</td>
                    <td>${att.deskripsi}</td>
                    <td>${formatCurrency(att.harga)}</td>
                    <td><span class="badge ${att.isInvoiced ? 'badge-success' : 'badge-warning'}">${att.isInvoiced ? 'Sudah' : 'Belum'}</span></td>
                    <td>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            ${!att.isInvoiced ? `<button class="btn btn-sm btn-primary" onclick="generateSingleInvoice('${att.nama}', ['${att._id}'])">
                                <i class="fas fa-file-invoice"></i> Invoice
                            </button>` : '<span class="badge badge-success">Done</span>'}
                            <button class="btn btn-sm btn-danger" onclick="deleteAttendance('${att._id}', '${att.nama}', '${formatDate(att.tanggal)}')" title="Hapus data">
                                <i class="fas fa-trash"></i> Hapus
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Update pagination
            updatePagination(result.pagination);
            currentPage = page;
            updateSelectedCount();
        }
    } catch (error) {
        console.error('Error loading attendances:', error);
        document.getElementById('attendancesTableBody').innerHTML = 
            '<tr><td colspan="8" class="loading">Error memuat data</td></tr>';
        showToast('Gagal memuat data absensi', 'error');
    }
}

// Toggle attendance selection
function toggleAttendanceSelection(id) {
    if (selectedAttendances.has(id)) {
        selectedAttendances.delete(id);
    } else {
        selectedAttendances.add(id);
    }
    updateSelectedCount();
}

// Toggle select all
function toggleSelectAll() {
    const checkbox = document.getElementById('selectAll');
    const headerCheckbox = document.getElementById('selectAllHeader');
    const isChecked = checkbox.checked;
    
    if (headerCheckbox) headerCheckbox.checked = isChecked;
    
    const tbody = document.getElementById('attendancesTableBody');
    const checkboxes = tbody.querySelectorAll('input[type="checkbox"]');
    
    if (isChecked) {
        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            const id = row.querySelector('input[type="checkbox"]').getAttribute('onchange').match(/'([^']+)'/)[1];
            selectedAttendances.add(id);
            cb.checked = true;
        });
    } else {
        selectedAttendances.clear();
        checkboxes.forEach(cb => cb.checked = false);
    }
    
    updateSelectedCount();
}

// Update selected count
function updateSelectedCount() {
    const count = selectedAttendances.size;
    document.getElementById('selectedCount').textContent = `${count} selected`;
    const bulkBtn = document.getElementById('bulkInvoiceBtn');
    bulkBtn.disabled = count === 0;
}

// Load students
async function loadStudents() {
    try {
        const response = await fetch('/api/students');
        const result = await response.json();
        
        if (result.success) {
            allStudents = result.data;
            const tbody = document.getElementById('studentsTableBody');
            tbody.innerHTML = '';
            
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">Tidak ada data siswa</td></tr>';
                document.getElementById('studentsBadge').textContent = '0';
                return;
            }
            
            document.getElementById('studentsBadge').textContent = result.data.length;
            
            result.data.forEach(student => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${student.nama}</strong></td>
                    <td>${student.totalAttendances}</td>
                    <td>${student.invoicedCount}</td>
                    <td>${student.uninvoicedCount}</td>
                    <td>${formatCurrency(student.totalHarga)}</td>
                    <td>${student.lastAttendance ? formatDate(student.lastAttendance) : '-'}</td>
                    <td>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                            <button class="btn btn-sm btn-success" onclick="viewStudentAttendances('${student.nama}')">
                                <i class="fas fa-eye"></i> Lihat
                            </button>
                            ${student.uninvoicedCount > 0 ? `
                                <button class="btn btn-sm btn-primary" onclick="generateInvoiceFromStudent('${student.nama}')">
                                    <i class="fas fa-file-invoice"></i> Invoice
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Populate student select for invoice modal
            const select = document.getElementById('invoiceStudentSelect');
            select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
            result.data.forEach(student => {
                if (student.uninvoicedCount > 0) {
                    const option = document.createElement('option');
                    option.value = student.nama;
                    option.textContent = `${student.nama} (${student.uninvoicedCount} belum invoice)`;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('studentsTableBody').innerHTML = 
            '<tr><td colspan="7" class="loading">Error memuat data</td></tr>';
        showToast('Gagal memuat data siswa', 'error');
    }
}

// Generate invoice from student
async function generateInvoiceFromStudent(nama) {
    try {
        showToast('Sedang membuat invoice...', 'warning');
        
        const response = await fetch('/api/invoice/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nama })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentInvoiceData = result.data;
            showInvoicePreview(result.data);
            showToast('Invoice berhasil dibuat!', 'success');
            loadStatistics();
            loadAttendances(currentPage);
            loadStudents();
        } else {
            showToast(result.message || 'Gagal membuat invoice', 'error');
        }
    } catch (error) {
        console.error('Error generating invoice:', error);
        showToast('Gagal membuat invoice', 'error');
    }
}

// Generate single invoice
async function generateSingleInvoice(nama, attendanceIds) {
    try {
        showToast('Sedang membuat invoice...', 'warning');
        
        const response = await fetch('/api/invoice/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nama, attendanceIds })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentInvoiceData = result.data;
            showInvoicePreview(result.data);
            showToast('Invoice berhasil dibuat!', 'success');
            loadStatistics();
            loadAttendances(currentPage);
            loadStudents();
        } else {
            showToast(result.message || 'Gagal membuat invoice', 'error');
        }
    } catch (error) {
        console.error('Error generating invoice:', error);
        showToast('Gagal membuat invoice', 'error');
    }
}

// Bulk generate invoice
async function bulkGenerateInvoice() {
    if (selectedAttendances.size === 0) {
        showToast('Pilih absensi terlebih dahulu', 'warning');
        return;
    }
    
    const attendanceIds = Array.from(selectedAttendances);
    const firstAtt = allAttendances.find(att => attendanceIds.includes(att._id));
    
    if (!firstAtt) {
        showToast('Data tidak ditemukan', 'error');
        return;
    }
    
    await generateSingleInvoice(firstAtt.nama, attendanceIds);
    selectedAttendances.clear();
    loadAttendances(currentPage);
}

// Show generate invoice modal
function showGenerateInvoiceModal() {
    document.getElementById('generateInvoiceModal').style.display = 'block';
    loadStudents();
}

// Close generate invoice modal
function closeGenerateInvoiceModal() {
    document.getElementById('generateInvoiceModal').style.display = 'none';
    document.getElementById('uninvoicedAttendancesList').innerHTML = '';
    document.getElementById('invoicePreview').innerHTML = '';
}

// Load uninvoiced attendances for selected student
async function loadUninvoicedAttendances() {
    const studentName = document.getElementById('invoiceStudentSelect').value;
    
    if (!studentName) {
        document.getElementById('uninvoicedAttendancesList').innerHTML = '';
        document.getElementById('invoicePreview').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/attendances/student/${encodeURIComponent(studentName)}`);
        const result = await response.json();
        
        if (result.success) {
            const uninvoiced = result.data.filter(att => !att.isInvoiced);
            
            if (uninvoiced.length === 0) {
                document.getElementById('uninvoicedAttendancesList').innerHTML = 
                    '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Semua absensi sudah di-invoice</p>';
                return;
            }
            
            const list = document.getElementById('uninvoicedAttendancesList');
            list.innerHTML = '<h4 style="margin-bottom: 15px;">Pilih Absensi untuk Invoice:</h4>';
            
            uninvoiced.forEach((att, index) => {
                const item = document.createElement('div');
                item.className = 'attendance-item';
                item.innerHTML = `
                    <input type="checkbox" id="att_${att._id}" value="${att._id}" onchange="updateInvoicePreview()">
                    ${att.foto_base64 ? `<img src="${att.foto_base64}" alt="Foto">` : ''}
                    <div class="attendance-item-info">
                        <h4>${att.deskripsi}</h4>
                        <p>${formatDate(att.tanggal)} - ${formatCurrency(att.harga)}</p>
                    </div>
                `;
                list.appendChild(item);
            });
            
            updateInvoicePreview();
        }
    } catch (error) {
        console.error('Error loading attendances:', error);
        showToast('Gagal memuat data absensi', 'error');
    }
}

// Update invoice preview
function updateInvoicePreview() {
    const checkboxes = document.querySelectorAll('#uninvoicedAttendancesList input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        document.getElementById('invoicePreview').innerHTML = '';
        document.getElementById('generateInvoiceBtn').disabled = true;
        return;
    }
    
    const studentName = document.getElementById('invoiceStudentSelect').value;
    const selectedAtts = allAttendances.filter(att => selectedIds.includes(att._id));
    const totalHarga = selectedAtts.reduce((sum, att) => sum + att.harga, 0);
    
    document.getElementById('invoicePreview').innerHTML = `
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4>Preview Invoice</h4>
            <p><strong>Siswa:</strong> ${studentName}</p>
            <p><strong>Jumlah Absensi:</strong> ${selectedIds.length}</p>
            <p><strong>Total Harga:</strong> ${formatCurrency(totalHarga)}</p>
        </div>
    `;
    
    document.getElementById('generateInvoiceBtn').disabled = false;
}

// Generate invoice from modal
async function generateInvoiceFromModal() {
    const studentName = document.getElementById('invoiceStudentSelect').value;
    const checkboxes = document.querySelectorAll('#uninvoicedAttendancesList input[type="checkbox"]:checked');
    const attendanceIds = Array.from(checkboxes).map(cb => cb.value);
    
    if (!studentName || attendanceIds.length === 0) {
        showToast('Pilih siswa dan absensi terlebih dahulu', 'warning');
        return;
    }
    
    await generateSingleInvoice(studentName, attendanceIds);
    closeGenerateInvoiceModal();
}

// Show invoice preview modal
function showInvoicePreview(invoiceData) {
    document.getElementById('invoicePreviewContent').innerHTML = `
        <img src="${invoiceData.invoiceBase64}" alt="Invoice" style="max-width: 100%; border-radius: 8px; box-shadow: var(--shadow-lg);">
        <div style="margin-top: 20px; text-align: center;">
            <p><strong>${invoiceData.nama}</strong></p>
            <p>${invoiceData.attendanceCount} absensi</p>
            <p>Total: ${formatCurrency(invoiceData.totalHarga)}</p>
        </div>
    `;
    document.getElementById('invoicePreviewModal').style.display = 'block';
}

// Close invoice preview modal
function closeInvoicePreviewModal() {
    document.getElementById('invoicePreviewModal').style.display = 'none';
    currentInvoiceData = null;
}

// Download invoice
function downloadInvoice() {
    if (!currentInvoiceData) return;
    
    const link = document.createElement('a');
    link.href = currentInvoiceData.invoiceBase64;
    link.download = currentInvoiceData.fileName;
    link.click();
    showToast('Invoice berhasil diunduh', 'success');
}

// Delete attendance
async function deleteAttendance(id, nama, tanggal) {
    if (!confirm(`Apakah Anda yakin ingin menghapus data absensi ini?\n\nNama: ${nama}\nTanggal: ${tanggal}\n\nTindakan ini tidak dapat dibatalkan!`)) {
        return;
    }
    
    try {
        showToast('Sedang menghapus data...', 'warning');
        
        const response = await fetch(`/api/attendances/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Data absensi untuk ${result.data.nama} berhasil dihapus!`, 'success');
            loadStatistics();
            loadAttendances(currentPage);
            loadStudents();
        } else {
            showToast(result.message || 'Gagal menghapus data', 'error');
        }
    } catch (error) {
        console.error('Error deleting attendance:', error);
        showToast('Gagal menghapus data', 'error');
    }
}

// Export data
async function exportData(format) {
    try {
        showToast('Sedang mengexport data...', 'warning');
        
        const response = await fetch(`/api/export/attendances?format=${format}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `attendances_${new Date().toISOString().split('T')[0]}.${format}`;
            link.click();
            window.URL.revokeObjectURL(url);
            showToast(`Data berhasil diexport sebagai ${format.toUpperCase()}`, 'success');
        } else {
            showToast('Gagal export data', 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Gagal export data', 'error');
    }
}

// Quick search
function quickSearch() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#attendancesTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Update pagination
function updatePagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';
    
    if (pagination.pages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Sebelumnya';
    prevBtn.disabled = pagination.page === 1;
    prevBtn.onclick = () => loadAttendances(pagination.page - 1);
    paginationEl.appendChild(prevBtn);
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pagination.pages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => loadAttendances(1);
        if (pagination.page === 1) firstBtn.classList.add('active');
        paginationEl.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px';
            paginationEl.appendChild(ellipsis);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        if (i === pagination.page) pageBtn.classList.add('active');
        pageBtn.onclick = () => loadAttendances(i);
        paginationEl.appendChild(pageBtn);
    }
    
    if (endPage < pagination.pages) {
        if (endPage < pagination.pages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px';
            paginationEl.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = pagination.pages;
        lastBtn.onclick = () => loadAttendances(pagination.pages);
        if (pagination.page === pagination.pages) lastBtn.classList.add('active');
        paginationEl.appendChild(lastBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Selanjutnya →';
    nextBtn.disabled = pagination.page === pagination.pages;
    nextBtn.onclick = () => loadAttendances(pagination.page + 1);
    paginationEl.appendChild(nextBtn);
}

// Show tab
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    currentTab = tabName;
    
    // Load data based on tab
    if (tabName === 'attendances') {
        loadAttendances(currentPage);
    } else if (tabName === 'students') {
        loadStudents();
    } else if (tabName === 'charts') {
        loadStatistics(); // This will also update charts
    }
}

// Apply filters
function applyFilters() {
    currentPage = 1;
    selectedAttendances.clear();
    if (currentTab === 'attendances') {
        loadAttendances(1);
    }
}

// Clear filters
function clearFilters() {
    document.getElementById('namaFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    if (document.getElementById('invoiceStatusFilter')) {
        document.getElementById('invoiceStatusFilter').value = '';
    }
    applyFilters();
}

// Refresh data
function refreshData() {
    loadStatistics();
    if (currentTab === 'attendances') {
        loadAttendances(currentPage);
    } else if (currentTab === 'students') {
        loadStudents();
    } else if (currentTab === 'charts') {
        loadStatistics();
    }
    showToast('Data telah diupdate', 'success');
}

// View student attendances
function viewStudentAttendances(nama) {
    document.getElementById('namaFilter').value = nama;
    showTab('attendances');
    // Manually trigger the tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes('Daftar Absensi')) {
            btn.classList.add('active');
        }
    });
    applyFilters();
}

// Show bulk invoice modal
function showBulkInvoiceModal() {
    if (selectedAttendances.size === 0) {
        showToast('Pilih absensi terlebih dahulu', 'warning');
        return;
    }
    bulkGenerateInvoice();
}

// Update charts
function updateCharts(stats) {
    // Revenue chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    if (stats.revenueByMonth && stats.revenueByMonth.length > 0) {
        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: stats.revenueByMonth.map(item => {
                    const [year, month] = item.month.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                }),
                datasets: [{
                    label: 'Pendapatan (Rp)',
                    data: stats.revenueByMonth.map(item => item.total),
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Top students chart
    const topStudentsCtx = document.getElementById('topStudentsChart');
    if (topStudentsChart) {
        topStudentsChart.destroy();
    }
    
    if (stats.topStudents && stats.topStudents.length > 0) {
        topStudentsChart = new Chart(topStudentsCtx, {
            type: 'bar',
            data: {
                labels: stats.topStudents.map(item => item.nama),
                datasets: [{
                    label: 'Jumlah Absensi',
                    data: stats.topStudents.map(item => item.count),
                    backgroundColor: 'rgba(37, 99, 235, 0.8)',
                    borderColor: 'rgb(37, 99, 235)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // Revenue by student chart
    const revenueByStudentCtx = document.getElementById('revenueByStudentChart');
    if (revenueByStudentChart) {
        revenueByStudentChart.destroy();
    }
    
    if (stats.topStudents && stats.topStudents.length > 0) {
        revenueByStudentChart = new Chart(revenueByStudentCtx, {
            type: 'doughnut',
            data: {
                labels: stats.topStudents.slice(0, 5).map(item => item.nama),
                datasets: [{
                    label: 'Pendapatan',
                    data: stats.topStudents.slice(0, 5).map(item => item.totalHarga),
                    backgroundColor: [
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${formatCurrency(context.parsed)}`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Invoice status chart
    const invoiceStatusCtx = document.getElementById('invoiceStatusChart');
    if (invoiceStatusChart) {
        invoiceStatusChart.destroy();
    }
    
    invoiceStatusChart = new Chart(invoiceStatusCtx, {
        type: 'pie',
        data: {
            labels: ['Sudah Invoice', 'Belum Invoice'],
            datasets: [{
                label: 'Status Invoice',
                data: [stats.invoicedCount, stats.uninvoicedCount],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Modal functions
function openModal(imageSrc, nama, tanggal, deskripsi, harga) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalInfo = document.getElementById('modalInfo');
    
    modalImg.src = imageSrc;
    modalInfo.innerHTML = `
        <strong>${nama}</strong><br>
        Tanggal: ${tanggal}<br>
        ${deskripsi}<br>
        Harga: ${harga}
    `;
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('imageModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = ['imageModal', 'generateInvoiceModal', 'invoicePreviewModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            if (modalId === 'generateInvoiceModal') closeGenerateInvoiceModal();
            else if (modalId === 'invoicePreviewModal') closeInvoicePreviewModal();
            else closeModal();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
    loadAttendances(1);
    
    // Auto refresh every 30 seconds
    setInterval(() => {
        loadStatistics();
        if (currentTab === 'attendances') {
            loadAttendances(currentPage);
        }
    }, 30000);
});
