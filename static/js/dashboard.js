// dashboard.js - Sistema de Dashboard para Minerva Vestidos

// Variables globales
let allData = [];
let filteredData = [];
const chartInstances = {};

// Paleta de colores para Minerva Vestidos
const chartColors = {
  cream: '#F9E9D9',
  olive: '#8A9A5B',
  gold: '#D4A373',
  charcoal: '#2F2E41',
  light: '#FFFAF0',
  darkOlive: '#6B7D4D',
  darkGold: '#C08D5D',
  
  getColorArray: function(count) {
    const baseColors = [
      this.olive, this.gold, this.charcoal, this.darkOlive,
      this.darkGold, this.cream, '#95E1D3', '#FCE38A'
    ];
    
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    } else {
      const colors = [...baseColors];
      for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.5) % 360;
        colors.push(`hsl(${hue}, 50%, 50%)`);
      }
      return colors;
    }
  },
  
  withOpacity: function(color, opacity) {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }
};

function loadDashboardData() {
    showLoading(true);
    
    fetch('/api/pedidos')
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || `Error del servidor: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'error') {
                throw new Error(data.message || 'Error en los datos recibidos');
            }
            
            if (!data.data || data.data.length === 0) {
                showWarning('La base de datos no contiene pedidos registrados');
                return;
            }
            
            procesarDatos(data.data);
            calcularKPIs(data.data);
            verificarAlertasInventario(data.data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            showError(`Error al cargar datos: ${error.message}`);
            
            // Opcional: Mostrar mensaje para el administrador
            if (error.message.includes('Tablas faltantes')) {
                showAdminAlert(error.message);
            }
        })
        .finally(() => {
            showLoading(false);
        });
}

function showAdminAlert(message) {
    const adminAlert = document.createElement('div');
    adminAlert.className = 'alert alert-danger mt-3';
    adminAlert.innerHTML = `
        <h5>Error de configuración</h5>
        <p>${message}</p>
        <p>Contacte al administrador del sistema.</p>
    `;
    document.querySelector('.dashboard-container').appendChild(adminAlert);
}


// Llamar a la función cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    
    // Resto de tu código de inicialización...
});
// Formatear números como moneda
function formatCurrency(num) {
  if (num === null || num === undefined) return '₡0.00';
  return '₡' + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Formatear números generales
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Procesar datos recibidos del servidor
function procesarDatos(data) {
    // Asegurarse de que los datos tienen la estructura correcta
    allData = data.map(pedido => ({
        id_pedido: pedido.id_pedido,
        fecha_pedido: pedido.fecha_pedido || new Date().toISOString(),
        estado_pedido: pedido.estado_pedido || 'Desconocido',
        cliente_nombre: pedido.cliente_nombre || 'Desconocido',
        cliente_tipo: pedido.cliente_tipo || 'Desconocido',
        monto: parseFloat(pedido.monto || 0),
        tipo_vestido: pedido.tipo_vestido || 'Desconocido',
        talla: pedido.talla || 'Desconocido',
        cantidad_inventario: parseInt(pedido.cantidad_inventario || 0)
    }));
    
    filteredData = [...allData];
    
    // Inicializar componentes
    popularFiltros();
    actualizarStatsCards();
    cargarTabla(filteredData);
    renderGraficos(filteredData);
}

// Popular los selectores de filtro
function popularFiltros() {
    // Obtener valores únicos para los filtros
    const tiposVestido = [...new Set(allData.map(p => p.tipo_vestido).filter(Boolean))];
    const tallas = [...new Set(allData.map(p => p.talla).filter(Boolean))];
    const estados = [...new Set(allData.map(p => p.estado_pedido).filter(Boolean))];
    const tiposCliente = [...new Set(allData.map(p => p.cliente_tipo).filter(Boolean))];
    
    // Configurar Select2 para los filtros múltiples
    $('#filterTipoVestido').select2({
        placeholder: 'Todos los tipos',
        allowClear: true,
        width: '100%',
        data: tiposVestido.map(tipo => ({ id: tipo, text: tipo }))
    });
    
    $('#filterTalla').select2({
        placeholder: 'Todas las tallas',
        allowClear: true,
        width: '100%',
        data: tallas.map(talla => ({ id: talla, text: talla }))
    });
    
    $('#filterEstado').select2({
        placeholder: 'Todos los estados',
        allowClear: true,
        width: '100%',
        data: estados.map(estado => ({ id: estado, text: estado }))
    });
    
    $('#filterCliente').select2({
        placeholder: 'Todos los tipos',
        allowClear: true,
        width: '100%',
        data: tiposCliente.map(tipo => ({ id: tipo, text: tipo }))
    });
    
    // Configurar datepickers
    $('.datepicker').datepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        todayHighlight: true,
        language: 'es'
    });
    
    // Event listeners para filtros
    $('#filterTipoVestido, #filterTalla, #filterEstado, #filterCliente').on('change', aplicarFiltros);
    $('#filterFechaInicio, #filterFechaFin').on('change', aplicarFiltros);
}
  
  // Configurar datepickers
  $('.datepicker').datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true,
    todayHighlight: true,
    language: 'es'
  });
  
  // Event listeners para filtros
  $('#filterTipoVestido, #filterTalla, #filterEstado, #filterCliente').on('change', aplicarFiltros);
  $('#filterFechaInicio, #filterFechaFin').on('change', aplicarFiltros);

// Aplicar filtros
function aplicarFiltros() {
  const tipoVestido = $('#filterTipoVestido').val() || [];
  const talla = $('#filterTalla').val() || [];
  const estado = $('#filterEstado').val() || [];
  const tipoCliente = $('#filterCliente').val() || [];
  const fechaInicio = $('#filterFechaInicio').val();
  const fechaFin = $('#filterFechaFin').val();

  filteredData = allData.filter(p => {
    // Filtros de selección múltiple
    if (tipoVestido.length > 0 && !tipoVestido.includes(p.tipo_vestido)) return false;
    if (talla.length > 0 && !talla.includes(p.talla)) return false;
    if (estado.length > 0 && !estado.includes(p.estado_pedido)) return false;
    if (tipoCliente.length > 0 && !tipoCliente.includes(p.cliente_tipo)) return false;
    
    // Filtros de fecha
    if (fechaInicio) {
      const fechaPedido = new Date(p.fecha_pedido);
      const fechaInicioObj = new Date(fechaInicio);
      if (fechaPedido < fechaInicioObj) return false;
    }
    
    if (fechaFin) {
      const fechaPedido = new Date(p.fecha_pedido);
      const fechaFinObj = new Date(fechaFin);
      fechaFinObj.setDate(fechaFinObj.getDate() + 1); // Incluir el día completo
      if (fechaPedido > fechaFinObj) return false;
    }
    
    return true;
  });

  actualizarStatsCards();
  cargarTabla(filteredData);
  renderGraficos(filteredData);
  calcularKPIs(filteredData);
  verificarAlertasInventario(filteredData);
  updateThemeUI(isDarkMode);
}

// Actualizar las tarjetas de estadísticas
function actualizarStatsCards() {
  const totalVentas = filteredData.reduce((sum, p) => sum + (p.monto || 0), 0);
  const totalPedidos = filteredData.length;
  
  // Calcular mejor cliente
  const ventasPorCliente = {};
  filteredData.forEach(p => {
    const cliente = p.cliente_nombre || 'Desconocido';
    ventasPorCliente[cliente] = (ventasPorCliente[cliente] || 0) + (p.monto || 0);
  });
  const mejorCliente = Object.keys(ventasPorCliente).reduce((a, b) => 
    ventasPorCliente[a] > ventasPorCliente[b] ? a : b, 'N/A');
  
  // Calcular vestido más popular
  const ventasPorVestido = {};
  filteredData.forEach(p => {
    const vestido = p.tipo_vestido || 'Desconocido';
    ventasPorVestido[vestido] = (ventasPorVestido[vestido] || 0) + 1;
  });
  const vestidoPopular = Object.keys(ventasPorVestido).reduce((a, b) => 
    ventasPorVestido[a] > ventasPorVestido[b] ? a : b, 'N/A');
  
  // Actualizar DOM
  document.getElementById('totalVentas').textContent = formatCurrency(totalVentas);
  document.getElementById('totalPedidos').textContent = formatNumber(totalPedidos);
  document.getElementById('mejorCliente').textContent = mejorCliente;
  document.getElementById('vestidoPopular').textContent = vestidoPopular;
}

// Cargar datos en la tabla
function cargarTabla(data) {
  const tabla = $('#tablaDatos').DataTable();
  if (tabla) {
    tabla.destroy();
  }

  const cuerpo = data.map(p => [
    p.id_pedido,
    new Date(p.fecha_pedido).toLocaleDateString(),
    p.cliente_nombre || 'Desconocido',
    p.tipo_vestido || 'Desconocido',
    p.talla || 'Desconocido',
    p.estado_pedido || 'Desconocido',
    formatCurrency(p.monto || 0),
    `<button class="btn btn-sm btn-action" data-id="${p.id_pedido}">
      <i class="fas fa-ellipsis-v"></i>
    </button>`
  ]);

  $('#tablaDatos').DataTable({
    data: cuerpo,
    columns: [
      { title: "ID Pedido" },
      { title: "Fecha" },
      { title: "Cliente" },
      { title: "Tipo Vestido" },
      { title: "Talla" },
      { title: "Estado" },
      { title: "Monto", className: "text-end" },
      { 
        title: "Acciones", 
        className: "text-center",
        orderable: false,
        searchable: false
      }
    ],
    responsive: true,
    order: [[0, 'desc']],
    pageLength: 10,
    lengthMenu: [10, 25, 50, 100],
    language: {
      search: "Buscar:",
      lengthMenu: "Mostrar _MENU_ entradas",
      info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
      infoEmpty: "Mostrando 0 a 0 de 0 entradas",
      infoFiltered: "(filtrado de _MAX_ entradas totales)",
      paginate: {
        first: "Primero",
        last: "Último",
        next: "Siguiente",
        previous: "Anterior"
      },
      emptyTable: "No hay datos disponibles",
      zeroRecords: "No se encontraron coincidencias"
    }
  });
}

// Renderizar todos los gráficos
function renderGraficos(data) {
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // Destruir gráficos existentes
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    
    // Verificar si hay datos
    if (data.length === 0) {
        console.warn("No hay datos para renderizar gráficos");
        return;
    }
    
    // Crear nuevos gráficos
    createVentasMensualesChart(data, isDarkMode);
    createVentasPorTipoChart(data, isDarkMode);
    createEstadoPedidosChart(data, isDarkMode);
    createVentasPorTallaChart(data, isDarkMode);
    createTopClientesChart(data, isDarkMode);
    createTipoClientesChart(data, isDarkMode);
    createInventarioSunburstChart(data, isDarkMode);
    createBajoInventarioChart(data, isDarkMode);
}

// Gráfico de Ventas Mensuales
function createVentasMensualesChart(data, isDarkMode) {
  const ctx = document.getElementById('ventasMensuales').getContext('2d');
  
  // Agrupar ventas por mes
  const ventasPorMes = {};
  data.forEach(pedido => {
    const fecha = new Date(pedido.fecha_pedido);
    const mes = fecha.getFullYear() + '-' + (fecha.getMonth() + 1).toString().padStart(2, '0');
    
    if (!ventasPorMes[mes]) {
      ventasPorMes[mes] = 0;
    }
    ventasPorMes[mes] += pedido.monto;
  });
  
  // Ordenar por mes
  const meses = Object.keys(ventasPorMes).sort();
  const ventas = meses.map(mes => ventasPorMes[mes]);
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.ventasMensuales = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [{
        label: 'Ventas',
        data: ventas,
        borderColor: chartColors.gold,
        backgroundColor: chartColors.withOpacity(chartColors.gold, 0.1),
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Ventas Mensuales',
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        },
        y: {
          ticks: {
            color: textColor,
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        }
      }
    }
  });
}

// Gráfico de Ventas por Tipo de Vestido
function createVentasPorTipoChart(data, isDarkMode) {
  const ctx = document.getElementById('ventasPorTipo').getContext('2d');
  
  const ventasPorTipo = {};
  data.forEach(pedido => {
    const tipo = pedido.tipo_vestido || 'Desconocido';
    if (!ventasPorTipo[tipo]) {
      ventasPorTipo[tipo] = 0;
    }
    ventasPorTipo[tipo] += pedido.monto;
  });
  
  const tipos = Object.keys(ventasPorTipo);
  const ventas = Object.values(ventasPorTipo);
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.ventasPorTipo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tipos,
      datasets: [{
        label: 'Ventas',
        data: ventas,
        backgroundColor: chartColors.getColorArray(tipos.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Ventas por Tipo de Vestido',
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        },
        y: {
          ticks: {
            color: textColor,
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        }
      }
    }
  });
}

// Gráfico de Estado de Pedidos
function createEstadoPedidosChart(data, isDarkMode) {
  const ctx = document.getElementById('estadoPedidos').getContext('2d');
  
  const conteoEstados = {};
  data.forEach(pedido => {
    const estado = pedido.estado_pedido || 'Desconocido';
    if (!conteoEstados[estado]) {
      conteoEstados[estado] = 0;
    }
    conteoEstados[estado]++;
  });
  
  const estados = Object.keys(conteoEstados);
  const conteos = Object.values(conteoEstados);
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.estadoPedidos = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: estados,
      datasets: [{
        data: conteos,
        backgroundColor: [
          chartColors.olive,    // Completado
          chartColors.gold,     // En proceso
          chartColors.darkGold  // Pendiente
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Estado de los Pedidos',
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Gráfico de Ventas por Talla
function createVentasPorTallaChart(data, isDarkMode) {
  const ctx = document.getElementById('ventasPorTalla').getContext('2d');
  
  const ventasPorTalla = {};
  data.forEach(pedido => {
    const talla = pedido.talla || 'Desconocido';
    if (!ventasPorTalla[talla]) {
      ventasPorTalla[talla] = 0;
    }
    ventasPorTalla[talla] += pedido.monto;
  });
  
  const tallas = Object.keys(ventasPorTalla);
  const ventas = Object.values(ventasPorTalla);
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.ventasPorTalla = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tallas,
      datasets: [{
        label: 'Ventas',
        data: ventas,
        backgroundColor: chartColors.getColorArray(tallas.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Ventas por Talla',
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        },
        y: {
          ticks: {
            color: textColor,
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        }
      }
    }
  });
}

// Gráfico de Top Clientes
function createTopClientesChart(data, isDarkMode) {
  const ctx = document.getElementById('topClientes').getContext('2d');
  
  const ventasPorCliente = {};
  data.forEach(pedido => {
    const cliente = pedido.cliente_nombre || 'Desconocido';
    if (!ventasPorCliente[cliente]) {
      ventasPorCliente[cliente] = 0;
    }
    ventasPorCliente[cliente] += pedido.monto;
  });
  
  const topClientes = Object.entries(ventasPorCliente)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
  
  const clientes = Object.keys(topClientes);
  const ventas = Object.values(topClientes);
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.topClientes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: clientes,
      datasets: [{
        label: 'Ventas',
        data: ventas,
        backgroundColor: chartColors.withOpacity(chartColors.olive, 0.7),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Top 10 Clientes',
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor,
            callback: function(value) {
              return formatCurrency(value);
            }
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        },
        y: {
          ticks: {
            color: textColor
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        }
      }
    }
  });
}

// Gráfico de Tipo de Clientes
function createTipoClientesChart(data, isDarkMode) {
  const ctx = document.getElementById('tipoClientes').getContext('2d');
  
  const conteoTipos = {};
  data.forEach(pedido => {
    const tipo = pedido.cliente_tipo || 'Desconocido';
    if (!conteoTipos[tipo]) {
      conteoTipos[tipo] = 0;
    }
    conteoTipos[tipo]++;
  });
  
  const tipos = Object.keys(conteoTipos);
  const conteos = Object.values(conteoTipos);
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.tipoClientes = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tipos,
      datasets: [{
        data: conteos,
        backgroundColor: [
          chartColors.olive,
          chartColors.gold,
          chartColors.darkOlive
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        title: {
          display: true,
          text: 'Distribución por Tipo de Cliente',
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Gráfico Sunburst de Inventario
function createInventarioSunburstChart(data, isDarkMode) {
  const ctx = document.getElementById('inventarioSunburst').getContext('2d');
  
  // Agrupar por tipo y talla
  const inventario = {};
  data.forEach(pedido => {
    const tipo = pedido.tipo_vestido || 'Desconocido';
    const talla = pedido.talla || 'Desconocido';
    
    if (!inventario[tipo]) {
      inventario[tipo] = {};
    }
    if (!inventario[tipo][talla]) {
      inventario[tipo][talla] = 0;
    }
    inventario[tipo][talla] += pedido.cantidad_inventario || 0;
  });
  
  // Preparar datos para sunburst
  const sunburstData = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderWidth: 1
    }]
  };
  
  let colorIndex = 0;
  const colors = chartColors.getColorArray(20);
  
  for (const tipo in inventario) {
    sunburstData.labels.push(tipo);
    sunburstData.datasets[0].data.push(0); // Nivel padre
    
    for (const talla in inventario[tipo]) {
      sunburstData.labels.push(talla);
      sunburstData.datasets[0].data.push(inventario[tipo][talla]);
      sunburstData.datasets[0].backgroundColor.push(colors[colorIndex % colors.length]);
      colorIndex++;
    }
  }
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.inventarioSunburst = new Chart(ctx, {
    type: 'pie',
    data: sunburstData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Inventario por Tipo y Talla',
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.raw} unidades`;
            }
          }
        }
      }
    }
  });
}

// Gráfico de Bajo Inventario
function createBajoInventarioChart(data, isDarkMode) {
  const ctx = document.getElementById('bajoInventario').getContext('2d');
  
  const UMBRAL_INVENTARIO = 10;
  const bajoInventario = data.filter(pedido => 
    (pedido.cantidad_inventario || 0) < UMBRAL_INVENTARIO
  );
  
  const productos = bajoInventario.map(p => `${p.tipo_vestido} - ${p.talla}`);
  const cantidades = bajoInventario.map(p => p.cantidad_inventario || 0);
  
  const textColor = isDarkMode ? chartColors.cream : chartColors.charcoal;
  
  chartInstances.bajoInventario = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: productos,
      datasets: [{
        label: 'Cantidad en Inventario',
        data: cantidades,
        backgroundColor: chartColors.withOpacity(chartColors.darkGold, 0.7),
        borderColor: chartColors.darkGold,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Productos con Bajo Inventario (< ${UMBRAL_INVENTARIO})`,
          color: textColor,
          font: {
            family: "'Playfair Display', serif",
            size: 16
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.raw} unidades`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        },
        y: {
          ticks: {
            color: textColor
          },
          grid: {
            color: chartColors.withOpacity(isDarkMode ? chartColors.gold : chartColors.olive, 0.1)
          }
        }
      }
    }
  });
}
function calcularKPIs(data) {
    if (!data || data.length === 0) return;
    
    // Total de ventas
    const totalVentas = data.reduce((sum, p) => sum + (p.monto || 0), 0);
    
    // Pedidos completados
    const pedidosCompletados = data.filter(p => p.estado_pedido === 'Completado').length;
    const totalPedidos = data.length;
    const tasaConversion = totalPedidos > 0 ? (pedidosCompletados / totalPedidos) * 100 : 0;
    
    // Promedio de compra
    const promedioCompra = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
    
    // Porcentaje de devoluciones (asumiendo que 'Pendiente' son devoluciones)
    const devoluciones = data.filter(p => p.estado_pedido === 'Pendiente').length;
    const porcentajeDevoluciones = totalPedidos > 0 ? (devoluciones / totalPedidos) * 100 : 0;
    
    // Cambio mensual (necesitarías datos históricos)
    const deltaVentas = 0; // Esto debería calcularse comparando con el mes anterior
    
    // Actualizar DOM
    document.getElementById('tasaConversion').textContent = `${tasaConversion.toFixed(2)}%`;
    document.getElementById('promedioCompra').textContent = formatCurrency(promedioCompra);
    document.getElementById('porcentajeDevoluciones').textContent = `${porcentajeDevoluciones.toFixed(2)}%`;
    document.getElementById('deltaVentas').textContent = formatCurrency(deltaVentas);
}

function verificarAlertasInventario(data) {
    const UMBRAL_INVENTARIO = 10;
    const bajoInventario = data.filter(pedido => 
        (pedido.cantidad_inventario || 0) < UMBRAL_INVENTARIO
    );
    
    if (bajoInventario.length > 0) {
        const alertasContent = document.getElementById('alertasContent');
        alertasContent.innerHTML = '';
        
        bajoInventario.forEach(item => {
            const alerta = document.createElement('div');
            alerta.className = 'alerta-item mb-2';
            alerta.innerHTML = `
                <i class="fas fa-exclamation-circle me-2"></i>
                <strong>${item.tipo_vestido} (${item.talla})</strong>: 
                Solo ${item.cantidad_inventario} unidades restantes
            `;
            alertasContent.appendChild(alerta);
        });
        
        document.getElementById('alertasInventario').classList.remove('d-none');
    } else {
        document.getElementById('alertasInventario').classList.add('d-none');
    }
}

// Función para actualizar la UI del tema
function updateThemeUI(isDark) {
    const lightBg = document.querySelector('.light-mode-bg');
    const darkBg = document.querySelector('.dark-mode-bg');
    const toggleBtn = document.getElementById('toggleTheme');
    
    if (isDark) {
        darkBg.style.opacity = '1';
        lightBg.style.opacity = '0';
        toggleBtn.innerHTML = '<i class="fas fa-sun me-1"></i> Modo Claro';
        toggleBtn.classList.remove('btn-outline-secondary');
        toggleBtn.classList.add('btn-outline-light');
    } else {
        lightBg.style.opacity = '1';
        darkBg.style.opacity = '0';
        toggleBtn.innerHTML = '<i class="fas fa-moon me-1"></i> Modo Oscuro';
        toggleBtn.classList.remove('btn-outline-light');
        toggleBtn.classList.add('btn-outline-secondary');
    }
    
    // Re-renderizar gráficos si es necesario
    if (window.renderGraficos) {
        window.renderGraficos(window.filteredData || []);
    }
}

// En tu dashboard.js, modifica la parte donde haces la petición:
fetch('/api/pedido')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('loadingSpinner').classList.add('d-none');
        document.querySelector('.dashboard-container').classList.remove('d-none');
        
        procesarDatos(data);
        calcularKPIs(data);
        verificarAlertasInventario(data);
    })
    .catch(error => {
        console.error('Error al cargar los datos:', error);
        document.getElementById('loadingSpinner').classList.add('d-none');
        document.getElementById('errorMessage').textContent = 
            `Error al cargar los datos: ${error.message}`;
        document.getElementById('errorMessage').classList.remove('d-none');
    });
// Hacer funciones accesibles globalmente
window.renderGraficos = renderGraficos;
window.procesarDatos = procesarDatos;