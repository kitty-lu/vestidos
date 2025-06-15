// Variables globales
let allPedidos = [];
let filteredPedidos = [];
const chartInstances = {};

// Paleta de colores
const chartColors = {
  primary: '#4e73df',
  success: '#1cc88a',
  info: '#36b9cc',
  warning: '#f6c23e',
  danger: '#e74a3b',
  secondary: '#858796',
  dark: '#5a5c69',
};

// Cargar datos del dashboard
function loadDashboardData() {
    showLoading(true);
    
    fetch('/api/pedido')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(pedidos => {
            if (!Array.isArray(pedidos)) {
                throw new Error('La respuesta no es un array de datos');
            }
            
            allPedidos = pedidos;
            filteredPedidos = [...pedidos];
            
            updateStatsCards();
            renderDataTable();
            renderCharts();
            setupFilters();
        })
        .catch(error => {
            console.error('Error:', error);
            showError(`Error al cargar datos: ${error.message}`);
        })
        .finally(() => {
            showLoading(false);
        });
}

// Actualizar las tarjetas de estadísticas
function updateStatsCards() {
    const totalVentas = filteredPedidos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const totalPedidos = filteredPedidos.length;
    const pedidosCompletados = filteredPedidos.filter(p => p.estado_pedido === 'Completado').length;
    
    // Calcular mejor cliente
    const ventasPorCliente = {};
    filteredPedidos.forEach(p => {
        const cliente = p.nombre_cliente || 'Desconocido';
        ventasPorCliente[cliente] = (ventasPorCliente[cliente] || 0) + parseFloat(p.monto);
    });
    
    const mejorCliente = Object.keys(ventasPorCliente).reduce((a, b) => 
        ventasPorCliente[a] > ventasPorCliente[b] ? a : b, 'N/A');
    
    // Calcular vestido más popular
    const ventasPorVestido = {};
    filteredPedidos.forEach(p => {
        const vestido = p.tipo_vestido || 'Desconocido';
        ventasPorVestido[vestido] = (ventasPorVestido[vestido] || 0) + 1;
    });
    
    const vestidoPopular = Object.keys(ventasPorVestido).reduce((a, b) => 
        ventasPorVestido[a] > ventasPorVestido[b] ? a : b, 'N/A');
    
    // Actualizar DOM
    document.getElementById('totalVentas').textContent = formatCurrency(totalVentas);
    document.getElementById('totalPedidos').textContent = totalPedidos;
    document.getElementById('pedidosCompletados').textContent = `${pedidosCompletados} (${Math.round((pedidosCompletados/totalPedidos)*100)}%)`;
    document.getElementById('mejorCliente').textContent = mejorCliente;
    document.getElementById('vestidoPopular').textContent = vestidoPopular;
}

// Renderizar la tabla de datos
function renderDataTable() {
    const tabla = $('#tablaPedidos').DataTable();
    if (tabla) {
        tabla.destroy();
    }

    $('#tablaPedidos').DataTable({
        data: filteredPedidos,
        columns: [
            { data: 'id_pedido', title: 'ID' },
            { 
                data: 'fecha_pedido', 
                title: 'Fecha',
                render: function(data) {
                    return new Date(data).toLocaleString();
                }
            },
            { data: 'nombre_cliente', title: 'Cliente' },
            { data: 'tipo_vestido', title: 'Vestido' },
            { data: 'talla', title: 'Talla' },
            { 
                data: 'estado_pedido', 
                title: 'Estado',
                render: function(data) {
                    const badgeClass = {
                        'Completado': 'bg-success',
                        'En proceso': 'bg-info',
                        'Pendiente': 'bg-warning',
                        'Cancelado': 'bg-danger'
                    }[data] || 'bg-secondary';
                    
                    return `<span class="badge ${badgeClass}">${data}</span>`;
                }
            },
            { 
                data: 'monto', 
                title: 'Monto',
                render: function(data) {
                    return formatCurrency(data);
                }
            },
            {
                title: 'Acciones',
                orderable: false,
                render: function(data, type, row) {
                    return `
                        <button class="btn btn-sm btn-warning editar-pedido" data-id="${row.id_pedido}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger eliminar-pedido" data-id="${row.id_pedido}">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }
        ],
        responsive: true,
        order: [[1, 'desc']],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        }
    });
}

// Renderizar gráficos
function renderCharts() {
    // Destruir gráficos existentes
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });

    // Gráfico de ventas mensuales
    renderVentasMensualesChart();
    
    // Gráfico de ventas por tipo de vestido
    renderVentasPorTipoChart();
    
    // Gráfico de estado de pedidos
    renderEstadoPedidosChart();
}

function renderVentasMensualesChart() {
    const ctx = document.getElementById('ventasMensuales').getContext('2d');
    
    // Agrupar por mes
    const ventasPorMes = {};
    filteredPedidos.forEach(p => {
        const fecha = new Date(p.fecha_pedido);
        const mes = `${fecha.getFullYear()}-${(fecha.getMonth()+1).toString().padStart(2, '0')}`;
        ventasPorMes[mes] = (ventasPorMes[mes] || 0) + parseFloat(p.monto);
    });
    
    const meses = Object.keys(ventasPorMes).sort();
    const ventas = meses.map(mes => ventasPorMes[mes]);
    
    chartInstances.ventasMensuales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Ventas',
                data: ventas,
                borderColor: chartColors.primary,
                backgroundColor: 'rgba(78, 115, 223, 0.05)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
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

function renderVentasPorTipoChart() {
    const ctx = document.getElementById('ventasPorTipo').getContext('2d');
    
    const ventasPorTipo = {};
    filteredPedidos.forEach(p => {
        const tipo = p.tipo_vestido || 'Desconocido';
        ventasPorTipo[tipo] = (ventasPorTipo[tipo] || 0) + parseFloat(p.monto);
    });
    
    const tipos = Object.keys(ventasPorTipo);
    const ventas = Object.values(ventasPorTipo);
    
    chartInstances.ventasPorTipo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tipos,
            datasets: [{
                label: 'Ventas',
                data: ventas,
                backgroundColor: tipos.map((_, i) => 
                    Object.values(chartColors)[i % Object.keys(chartColors).length])
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
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

function renderEstadoPedidosChart() {
    const ctx = document.getElementById('estadoPedidos').getContext('2d');
    
    const conteoEstados = {};
    filteredPedidos.forEach(p => {
        const estado = p.estado_pedido || 'Desconocido';
        conteoEstados[estado] = (conteoEstados[estado] || 0) + 1;
    });
    
    const estados = Object.keys(conteoEstados);
    const conteos = Object.values(conteoEstados);
    
    chartInstances.estadoPedidos = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: estados,
            datasets: [{
                data: conteos,
                backgroundColor: estados.map((_, i) => 
                    Object.values(chartColors)[i % Object.keys(chartColors).length])
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b);
                            const percent = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Configurar filtros
function setupFilters() {
    // Filtro por estado
    $('#filterEstado').change(function() {
        const estado = $(this).val();
        if (estado) {
            filteredPedidos = allPedidos.filter(p => p.estado_pedido === estado);
        } else {
            filteredPedidos = [...allPedidos];
        }
        updateDashboard();
    });
    
    // Filtro por tipo de vestido
    $('#filterTipoVestido').change(function() {
        const tipo = $(this).val();
        if (tipo) {
            filteredPedidos = allPedidos.filter(p => p.tipo_vestido === tipo);
        } else {
            filteredPedidos = [...allPedidos];
        }
        updateDashboard();
    });
    
    // Filtro por rango de fechas
    $('#filterRangoFechas').change(function() {
        const [start, end] = $(this).val().split(' - ');
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
            filteredPedidos = allPedidos.filter(p => {
                const fecha = new Date(p.fecha_pedido);
                return fecha >= startDate && fecha <= endDate;
            });
        } else {
            filteredPedidos = [...allPedidos];
        }
        updateDashboard();
    });
}

// Actualizar todo el dashboard
function updateDashboard() {
    updateStatsCards();
    renderDataTable();
    renderCharts();
}

// Formatear moneda
function formatCurrency(value) {
    return '$' + parseFloat(value || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Mostrar/ocultar loading
function showLoading(show) {
    if (show) {
        $('#loadingSpinner').removeClass('d-none');
        $('.dashboard-container').addClass('d-none');
    } else {
        $('#loadingSpinner').addClass('d-none');
        $('.dashboard-container').removeClass('d-none');
    }
}

// Mostrar error
function showError(message) {
    $('#errorMessage').text(message).removeClass('d-none');
}

// static/js/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos iniciales
    fetch('/api/pedido')
        .then(response => {
            if (!response.ok) throw new Error('Error en la respuesta');
            return response.json();
        })
        .then(data => {
            // Ocultar spinner y mostrar contenido
            document.getElementById('loadingSpinner').classList.add('d-none');
            document.querySelector('.dashboard-container').classList.remove('d-none');
            
            // Procesar datos
            procesarDatos(data);
            renderDataTable(data);
            renderCharts(data);
        })
        .catch(error => {
            console.error('Error al cargar los datos:', error);
            document.getElementById('loadingSpinner').classList.add('d-none');
            document.getElementById('errorMessage').textContent = 'Error al cargar los datos: ' + error.message;
            document.getElementById('errorMessage').classList.remove('d-none');
        });
});

function procesarDatos(pedidos) {
    // Calcular estadísticas básicas
    const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const totalPedidos = pedidos.length;
    const pedidosCompletados = pedidos.filter(p => p.estado_pedido === 'Completado').length;
    
    // Actualizar las tarjetas de estadísticas
    document.getElementById('totalVentas').textContent = formatCurrency(totalVentas);
    document.getElementById('totalPedidos').textContent = totalPedidos;
    document.getElementById('pedidosCompletados').textContent = `${pedidosCompletados} (${Math.round((pedidosCompletados/totalPedidos)*100)}%)`;
}

function renderDataTable(pedidos) {
    $('#tablaPedidos').DataTable({
        data: pedidos,
        columns: [
            { data: 'id_pedido', title: 'ID' },
            { 
                data: 'fecha_pedido', 
                title: 'Fecha',
                render: function(data) {
                    return new Date(data).toLocaleString();
                }
            },
            { data: 'nombre_cliente', title: 'Cliente' },
            { data: 'tipo_vestido', title: 'Vestido' },
            { data: 'talla', title: 'Talla' },
            { 
                data: 'estado_pedido', 
                title: 'Estado',
                render: function(data) {
                    const badgeClass = {
                        'Completado': 'bg-success',
                        'En proceso': 'bg-info',
                        'Pendiente': 'bg-warning',
                        'Cancelado': 'bg-danger'
                    }[data] || 'bg-secondary';
                    
                    return `<span class="badge ${badgeClass}">${data}</span>`;
                }
            },
            { 
                data: 'monto', 
                title: 'Monto',
                render: function(data) {
                    return formatCurrency(data);
                }
            }
        ],
        responsive: true,
        order: [[1, 'desc']],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
        }
    });
}

function renderCharts(pedidos) {
    // Gráfico de ventas mensuales
    renderVentasMensuales(pedidos);
    
    // Gráfico de ventas por tipo de vestido
    renderVentasPorTipo(pedidos);
    
    // Gráfico de estado de pedidos
    renderEstadoPedidos(pedidos);
}

function renderVentasMensuales(pedidos) {
    const ctx = document.getElementById('ventasMensuales').getContext('2d');
    
    // Agrupar por mes
    const ventasPorMes = {};
    pedidos.forEach(p => {
        const fecha = new Date(p.fecha_pedido);
        const mes = `${fecha.getFullYear()}-${(fecha.getMonth()+1).toString().padStart(2, '0')}`;
        ventasPorMes[mes] = (ventasPorMes[mes] || 0) + parseFloat(p.monto);
    });
    
    const meses = Object.keys(ventasPorMes).sort();
    const ventas = meses.map(mes => ventasPorMes[mes]);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Ventas',
                data: ventas,
                borderColor: '#4e73df',
                backgroundColor: 'rgba(78, 115, 223, 0.05)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
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

function renderVentasPorTipo(pedidos) {
    const ctx = document.getElementById('ventasPorTipo').getContext('2d');
    
    const ventasPorTipo = {};
    pedidos.forEach(p => {
        const tipo = p.tipo_vestido || 'Desconocido';
        ventasPorTipo[tipo] = (ventasPorTipo[tipo] || 0) + parseFloat(p.monto);
    });
    
    const tipos = Object.keys(ventasPorTipo);
    const ventas = Object.values(ventasPorTipo);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tipos,
            datasets: [{
                label: 'Ventas',
                data: ventas,
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
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

function renderEstadoPedidos(pedidos) {
    const ctx = document.getElementById('estadoPedidos').getContext('2d');
    
    const conteoEstados = {};
    pedidos.forEach(p => {
        const estado = p.estado_pedido || 'Desconocido';
        conteoEstados[estado] = (conteoEstados[estado] || 0) + 1;
    });
    
    const estados = Object.keys(conteoEstados);
    const conteos = Object.values(conteoEstados);
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: estados,
            datasets: [{
                data: conteos,
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b);
                            const percent = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

function formatCurrency(value) {
    return '$' + parseFloat(value || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}
// Función para abrir modal de edición
function abrirModalEditarPedido(id) {
    const pedido = filteredPedidos.find(p => p.id_pedido == id);
    if (pedido) {
        // Llenar formulario de edición
        $('#editIdPedido').val(pedido.id_pedido);
        $('#editFechaPedido').val(pedido.fecha_pedido.replace(' ', 'T'));
        $('#editEstadoPedido').val(pedido.estado_pedido);
        $('#editMonto').val(pedido.monto);
        $('#editCantidad').val(pedido.nro_total_articulos);
        
        // Mostrar modal
        $('#editarPedidoModal').modal('show');
    }
}

// Función para eliminar pedido
function eliminarPedido(id) {
    fetch(`/api/pedido/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            loadDashboardData(); // Recargar datos
            showToast('Pedido eliminado correctamente', 'success');
        } else {
            throw new Error('Error al eliminar pedido');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Error al eliminar pedido', 'danger');
    });
}

// Mostrar notificación toast
function showToast(message, type) {
    const toast = $('#toastNotificacion');
    toast.removeClass('bg-primary bg-success bg-danger')
         .addClass(`bg-${type}`)
         .find('.toast-body').text(message);
    
    bootstrap.Toast.getOrCreateInstance(toast[0]).show();
}