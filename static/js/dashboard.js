// static/js/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos iniciales
    fetch('/api/pedido')
        .then(response => {
            if (!response.ok) throw new Error('Error en la respuesta');
            return response.json();
        })
        .then(data => {
            document.getElementById('loadingSpinner').classList.add('d-none');
            document.querySelector('.dashboard-container').classList.remove('d-none');
            
            procesarDatos(data);
            renderAllCharts(data);
            setupFilters(data);
            calcularKPIs(data);
            verificarAlertasInventario(data);
        });
});

function procesarDatos(data) {
    // Calcular estadísticas básicas
    const totalVentas = data.reduce((sum, p) => sum + parseFloat(p.monto), 0);
    const totalPedidos = data.length;
    const pedidosCompletados = data.filter(p => p.estado_pedido === 'Completado').length;
    
    // Actualizar las tarjetas de estadísticas
    document.getElementById('totalVentas').textContent = formatCurrency(totalVentas);
    document.getElementById('totalPedidos').textContent = totalPedidos;
    document.getElementById('pedidosCompletados').textContent = `${pedidosCompletados} (${Math.round((pedidosCompletados/totalPedidos)*100)}%)`;
}

function renderAllCharts(data) {
    // Paleta de colores elegante
    const palette = {
        primary: '#8a9a5b', // Verde oliva
        secondary: '#d4a373', // Oro
        accent: '#f9e9d9', // Crema
        dark: '#3c412e', // Carbón
        light: '#fffaf0', // Blanco hueso
        success: '#95E1D3', // Turquesa
        warning: '#FCE38A', // Amarillo
        danger: '#F38181' // Coral
    };

    // 1. Gráfico de ventas por cliente (TOP 10)
    renderTopClientesChart(data, palette);
    
    // 2. Gráfico de ingresos por tipo de vestido
    renderIngresosPorTipoChart(data, palette);
    
    // 3. Gráfico de inventario (Sunburst)
    renderInventarioSunburst(data, palette);
    
    // 4. Gráfico de ventas mensuales
    renderVentasMensualesChart(data, palette);
    
    // 5. Gráfico de comparación de ventas (Treemap)
    renderComparacionVentasChart(data, palette);
    
    // 6. Gráfico de análisis por talla y tipo
    renderAnalisisTallaTipoChart(data, palette);
    
    // 7. Gráfico de estado de pedidos
    renderEstadoPedidosChart(data, palette);
    
    // 8. Gráfico de frecuencia de compra
    renderFrecuenciaCompraChart(data, palette);
}

function renderTopClientesChart(data, palette) {
    const ctx = document.getElementById('topClientes').getContext('2d');
    
    // Agrupar por cliente
    const ventasPorCliente = {};
    data.forEach(p => {
        const cliente = p.nombre_cliente || 'Desconocido';
        ventasPorCliente[cliente] = (ventasPorCliente[cliente] || 0) + parseFloat(p.monto);
    });
    
    // Ordenar y tomar TOP 10
    const topClientes = Object.entries(ventasPorCliente)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topClientes.map(c => c[0]),
            datasets: [{
                label: 'Ventas Totales',
                data: topClientes.map(c => c[1]),
                backgroundColor: palette.primary,
                borderColor: palette.dark,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'TOP 10 Clientes',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
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

function renderIngresosPorTipoChart(data, palette) {
    const ctx = document.getElementById('ingresosPorTipo').getContext('2d');
    
    const ingresosPorTipo = {};
    data.forEach(p => {
        const tipo = p.tipo_vestido || 'Desconocido';
        ingresosPorTipo[tipo] = (ingresosPorTipo[tipo] || 0) + parseFloat(p.monto);
    });
    
    const tipos = Object.keys(ingresosPorTipo);
    const ingresos = Object.values(ingresosPorTipo);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: tipos,
            datasets: [{
                label: 'Ingresos',
                data: ingresos,
                backgroundColor: [
                    palette.primary,
                    palette.secondary,
                    palette.accent,
                    palette.dark,
                    palette.success
                ],
                borderColor: palette.dark,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Ingresos por Tipo de Vestido',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
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

function renderInventarioSunburst(data, palette) {
    const ctx = document.getElementById('inventarioSunburst').getContext('2d');
    
    // Agrupar por tipo y talla
    const inventario = {};
    data.forEach(p => {
        const tipo = p.tipo_vestido || 'Desconocido';
        const talla = p.talla || 'ND';
        
        if (!inventario[tipo]) inventario[tipo] = {};
        inventario[tipo][talla] = (inventario[tipo][talla] || 0) + (parseInt(p.cantidad_inventario) || 0);
    });
    
    // Convertir a formato para sunburst
    const sunburstData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: [],
            borderColor: palette.light,
            borderWidth: 1
        }]
    };
    
    let colorIndex = 0;
    const colors = [palette.primary, palette.secondary, palette.accent, palette.dark, palette.success];
    
    Object.entries(inventario).forEach(([tipo, tallas]) => {
        sunburstData.labels.push(tipo);
        const tipoTotal = Object.values(tallas).reduce((a, b) => a + b, 0);
        sunburstData.datasets[0].data.push(tipoTotal);
        sunburstData.datasets[0].backgroundColor.push(colors[colorIndex % colors.length]);
        colorIndex++;
        
        Object.entries(tallas).forEach(([talla, cantidad]) => {
            sunburstData.labels.push(`${tipo} - ${talla}`);
            sunburstData.datasets[0].data.push(cantidad);
            sunburstData.datasets[0].backgroundColor.push(
                Chart.helpers.color(colors[colorIndex % colors.length]).lighten(0.3).rgbString()
            );
        });
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: sunburstData,
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                title: {
                    display: true,
                    text: 'Inventario por Tipo y Talla',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
                    }
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function renderVentasMensualesChart(data, palette) {
    const ctx = document.getElementById('ventasMensuales').getContext('2d');
    
    // Agrupar por mes
    const ventasPorMes = {};
    data.forEach(p => {
        const fecha = new Date(p.fecha_pedido || Date.now());
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        const clave = `${año}-${mes}`;
        
        ventasPorMes[clave] = (ventasPorMes[clave] || 0) + parseFloat(p.monto);
    });
    
    // Ordenar por fecha
    const mesesOrdenados = Object.keys(ventasPorMes).sort();
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const labels = mesesOrdenados.map(clave => {
        const [año, mes] = clave.split('-');
        return `${nombresMeses[parseInt(mes)]} ${año}`;
    });
    
    const ventas = mesesOrdenados.map(clave => ventasPorMes[clave]);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas Mensuales',
                data: ventas,
                backgroundColor: palette.accent,
                borderColor: palette.primary,
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Ventas Mensuales',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
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

function renderComparacionVentasChart(data, palette) {
    const ctx = document.getElementById('comparacionVentas').getContext('2d');
    
    // Agrupar por tipo y talla
    const ventasPorTipoTalla = {};
    data.forEach(p => {
        const tipo = p.tipo_vestido || 'Desconocido';
        const talla = p.talla || 'ND';
        const clave = `${tipo}-${talla}`;
        
        ventasPorTipoTalla[clave] = (ventasPorTipoTalla[clave] || 0) + parseFloat(p.monto);
    });
    
    // Convertir a formato para treemap
    const treemapData = {
        labels: Object.keys(ventasPorTipoTalla),
        datasets: [{
            data: Object.values(ventasPorTipoTalla),
            backgroundColor: Array(Object.keys(ventasPorTipoTalla).length).fill().map((_, i) => 
                i % 2 === 0 ? palette.primary : palette.secondary
            ),
            borderColor: palette.light,
            borderWidth: 1
        }]
    };
    
    new Chart(ctx, {
        type: 'bar',
        data: treemapData,
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Comparación de Ventas por Tipo y Talla',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatCurrency(context.raw)}`;
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

function renderAnalisisTallaTipoChart(data, palette) {
    const ctx = document.getElementById('analisisTallaTipo').getContext('2d');
    
    // Agrupar por tipo y talla
    const ventasPorTipoTalla = {};
    data.forEach(p => {
        const tipo = p.tipo_vestido || 'Desconocido';
        const talla = p.talla || 'ND';
        
        if (!ventasPorTipoTalla[tipo]) ventasPorTipoTalla[tipo] = {};
        ventasPorTipoTalla[tipo][talla] = (ventasPorTipoTalla[tipo][talla] || 0) + parseFloat(p.monto);
    });
    
    // Obtener todas las tallas únicas
    const tallas = [...new Set(data.map(p => p.talla).filter(Boolean))].sort();
    
    // Preparar datos para el gráfico de radar
    const datasets = Object.entries(ventasPorTipoTalla).map(([tipo, tallasData]) => {
        return {
            label: tipo,
            data: tallas.map(t => tallasData[t] || 0),
            backgroundColor: Chart.helpers.color(palette.primary).alpha(0.2).rgbString(),
            borderColor: palette.primary,
            pointBackgroundColor: palette.primary,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: palette.primary
        };
    });
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: tallas,
            datasets: datasets.slice(0, 3) // Limitar a 3 tipos para mejor legibilidad
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Análisis de Ventas por Talla y Tipo',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label} - ${context.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
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

function renderEstadoPedidosChart(data, palette) {
    const ctx = document.getElementById('estadoPedidos').getContext('2d');
    
    // Contar por estado
    const conteoEstados = {};
    data.forEach(p => {
        const estado = p.estado_pedido || 'Desconocido';
        conteoEstados[estado] = (conteoEstados[estado] || 0) + 1;
    });
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(conteoEstados),
            datasets: [{
                data: Object.values(conteoEstados),
                backgroundColor: [
                    palette.success,
                    palette.warning,
                    palette.danger,
                    palette.accent
                ],
                borderColor: palette.light,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Estado de Pedidos',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
                    }
                }
            }
        }
    });
}

function renderFrecuenciaCompraChart(data, palette) {
    const ctx = document.getElementById('frecuenciaCompra').getContext('2d');
    
    // Agrupar compras por cliente
    const comprasPorCliente = {};
    data.forEach(p => {
        const cliente = p.nombre_cliente || 'Desconocido';
        comprasPorCliente[cliente] = (comprasPorCliente[cliente] || 0) + 1;
    });
    
    // Contar frecuencia
    const frecuencia = {};
    Object.values(comprasPorCliente).forEach(count => {
        frecuencia[count] = (frecuencia[count] || 0) + 1;
    });
    
    // Ordenar por número de compras
    const frecuenciasOrdenadas = Object.keys(frecuencia).sort((a, b) => a - b);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: frecuenciasOrdenadas.map(f => `${f} compra${f > 1 ? 's' : ''}`),
            datasets: [{
                label: 'Número de Clientes',
                data: frecuenciasOrdenadas.map(f => frecuencia[f]),
                backgroundColor: palette.secondary,
                borderColor: palette.dark,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Frecuencia de Compra de Clientes',
                    font: {
                        size: 16,
                        family: 'Playfair Display'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Clientes'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Número de Compras'
                    }
                }
            }
        }
    });
}

function setupFilters(data) {
    // Configurar filtro por fecha
    const fechaInicio = document.getElementById('fechaInicio');
    const fechaFin = document.getElementById('fechaFin');
    
    // Establecer fechas por defecto (últimos 3 meses)
    const hoy = new Date();
    const hace3Meses = new Date();
    hace3Meses.setMonth(hoy.getMonth() - 3);
    
    fechaInicio.valueAsDate = hace3Meses;
    fechaFin.valueAsDate = hoy;
    
    // Configurar evento de filtrado
    document.getElementById('aplicarFiltro').addEventListener('click', function() {
        const inicio = new Date(fechaInicio.value);
        const fin = new Date(fechaFin.value);
        
        const datosFiltrados = data.filter(p => {
            const fechaPedido = new Date(p.fecha_pedido || hoy);
            return fechaPedido >= inicio && fechaPedido <= fin;
        });
        
        // Actualizar gráficos con datos filtrados
        renderAllCharts(datosFiltrados);
        calcularKPIs(datosFiltrados);
    });
}

function calcularKPIs(data) {
    const totalPedidos = data.length;
    const pedidosCompletados = data.filter(p => p.estado_pedido === 'Completado').length;
    const pedidosPendientes = data.filter(p => p.estado_pedido === 'Pendiente').length;
    
    const tasaConversion = (pedidosCompletados / totalPedidos) * 100;
    const promedioCompra = data.reduce((sum, p) => sum + parseFloat(p.monto), 0) / totalPedidos;
    const porcentajeDevoluciones = (pedidosPendientes / totalPedidos) * 100;
    
    document.getElementById('tasaConversion').textContent = `${tasaConversion.toFixed(2)}%`;
    document.getElementById('promedioCompra').textContent = formatCurrency(promedioCompra);
    document.getElementById('porcentajeDevoluciones').textContent = `${porcentajeDevoluciones.toFixed(2)}%`;
}

function verificarAlertasInventario(data) {
    const alertasContainer = document.getElementById('alertasInventario');
    alertasContainer.innerHTML = '';
    
    // Agrupar por tipo y talla
    const inventario = {};
    data.forEach(p => {
        const tipo = p.tipo_vestido || 'Desconocido';
        const talla = p.talla || 'ND';
        
        if (!inventario[tipo]) inventario[tipo] = {};
        inventario[tipo][talla] = (inventario[tipo][talla] || 0) + (parseInt(p.cantidad_inventario) || 0);
    });
    
    // Verificar niveles bajos (< 5 unidades)
    let alertas = [];
    Object.entries(inventario).forEach(([tipo, tallas]) => {
        Object.entries(tallas).forEach(([talla, cantidad]) => {
            if (cantidad < 5) {
                alertas.push({
                    tipo,
                    talla,
                    cantidad
                });
            }
        });
    });
    
    if (alertas.length > 0) {
        const alertaHTML = `
            <div class="alert alert-warning">
                <h5><i class="fas fa-exclamation-triangle"></i> Alertas de Inventario Bajo</h5>
                <ul class="mb-0">
                    ${alertas.map(a => `
                        <li>${a.tipo} talla ${a.talla}: solo ${a.cantidad} unidades</li>
                    `).join('')}
                </ul>
            </div>
        `;
        alertasContainer.innerHTML = alertaHTML;
    } else {
        alertasContainer.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> Todos los items tienen suficiente inventario
            </div>
        `;
    }
}

function formatCurrency(value) {
    return '$' + parseFloat(value || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}