// Función para cargar los pedidos
function cargarPedidos() {
    fetch('/api/pedidos')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tablaPedidos tbody');
            tbody.innerHTML = '';
            
            data.forEach(pedido => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${pedido.id_pedido}</td>
                    <td>${new Date(pedido.fecha_pedido).toLocaleDateString()}</td>
                    <td>${pedido.cliente_nombre || 'Cliente no encontrado'}</td>
                    <td>${pedido.vestido_codigo || 'Vestido no encontrado'}</td>
                    <td>${pedido.nro_total_articulos}</td>
                    <td>$${pedido.monto.toFixed(2)}</td>
                    <td>
                        <span class="badge ${getEstadoBadgeClass(pedido.estado_pedido)}">
                            ${pedido.estado_pedido}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-warning btn-sm editar-pedido" data-id="${pedido.id_pedido}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm eliminar-pedido" data-id="${pedido.id_pedido}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Error al cargar pedidos:', error));
}

// Función para obtener clase CSS según estado
function getEstadoBadgeClass(estado) {
    switch(estado) {
        case 'Completado': return 'bg-success';
        case 'Pendiente': return 'bg-warning text-dark';
        case 'Cancelado': return 'bg-danger';
        case 'En Proceso': return 'bg-info';
        default: return 'bg-secondary';
    }
}

// Función para cargar clientes y vestidos en selects
function cargarOpcionesPedidos() {
    // Cargar clientes
    fetch('/api/clientes')
        .then(response => response.json())
        .then(clientes => {
            const selectCliente = document.getElementById('clientePedido');
            const selectEditCliente = document.getElementById('editClientePedido');
            
            selectCliente.innerHTML = '<option value="">Seleccionar cliente...</option>';
            selectEditCliente.innerHTML = '<option value="">Seleccionar cliente...</option>';
            
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id_cliente;
                option.textContent = `${cliente.nombre_cliente} (${cliente.tipo_cliente})`;
                
                selectCliente.appendChild(option.cloneNode(true));
                selectEditCliente.appendChild(option.cloneNode(true));
            });
        });
    
    // Cargar vestidos
    fetch('/api/vestidos')
        .then(response => response.json())
        .then(vestidos => {
            const selectVestido = document.getElementById('vestidoPedido');
            const selectEditVestido = document.getElementById('editVestidoPedido');
            
            selectVestido.innerHTML = '<option value="">Seleccionar vestido...</option>';
            selectEditVestido.innerHTML = '<option value="">Seleccionar vestido...</option>';
            
            vestidos.forEach(vestido => {
                const option = document.createElement('option');
                option.value = vestido.id_vestido;
                option.textContent = `${vestido.tipo_vestido} (${vestido.color}, Talla ${vestido.talla}) - $${vestido.costo_venta.toFixed(2)}`;
                
                selectVestido.appendChild(option.cloneNode(true));
                selectEditVestido.appendChild(option.cloneNode(true));
            });
        });
}

// Evento para guardar nuevo pedido
document.getElementById('btnGuardarPedido').addEventListener('click', function() {
    const pedidoData = {
        fecha_pedido: document.getElementById('fechaPedido').value,
        id_cliente: document.getElementById('clientePedido').value,
        id_vestido: document.getElementById('vestidoPedido').value,
        nro_total_articulos: document.getElementById('cantidadPedido').value,
        monto: document.getElementById('montoPedido').value,
        estado_pedido: document.getElementById('estadoPedido').value
    };

    fetch('/api/pedidos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pedidoData)
    })
    .then(response => response.json())
    .then(data => {
        if(data.error) {
            alert(`Error: ${data.error}`);
        } else {
            $('#agregarPedidoModal').modal('hide');
            document.getElementById('formAgregarPedido').reset();
            cargarPedidos();
            alert('Pedido registrado correctamente');
        }
    })
    .catch(error => console.error('Error:', error));
});

// Función para abrir el modal de edición con los datos del pedido
function abrirModalEditarPedido(idPedido) {
    fetch(`/api/pedidos/${idPedido}`)
        .then(response => response.json())
        .then(pedido => {
            // Llenar el formulario con los datos del pedido
            document.getElementById('editIdPedido').value = pedido.id_pedido;
            document.getElementById('editFechaPedido').value = formatDateTimeForInput(pedido.fecha_pedido);
            document.getElementById('editEstadoPedido').value = pedido.estado_pedido;
            document.getElementById('editClientePedido').value = pedido.id_cliente;
            document.getElementById('editVestidoPedido').value = pedido.id_vestido;
            document.getElementById('editCantidadPedido').value = pedido.nro_total_articulos;
            document.getElementById('editMontoPedido').value = pedido.monto;
            
            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('editarPedidoModal'));
            modal.show();
        })
        .catch(error => console.error('Error al cargar pedido:', error));
}

// Formatear fecha para input datetime-local
function formatDateTimeForInput(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16);
}

// Evento para actualizar el pedido
document.getElementById('btnActualizarPedido').addEventListener('click', function() {
    const pedidoData = {
        fecha_pedido: document.getElementById('editFechaPedido').value,
        id_cliente: document.getElementById('editClientePedido').value,
        id_vestido: document.getElementById('editVestidoPedido').value,
        nro_total_articulos: document.getElementById('editCantidadPedido').value,
        monto: document.getElementById('editMontoPedido').value,
        estado_pedido: document.getElementById('editEstadoPedido').value
    };

    const idPedido = document.getElementById('editIdPedido').value;

    fetch(`/api/pedidos/${idPedido}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pedidoData)
    })
    .then(response => response.json())
    .then(data => {
        if(data.error) {
            alert(`Error: ${data.error}`);
        } else {
            $('#editarPedidoModal').modal('hide');
            cargarPedidos();
            alert('Pedido actualizado correctamente');
        }
    })
    .catch(error => console.error('Error:', error));
});

// Delegación de eventos para la tabla
document.querySelector('#tablaPedidos').addEventListener('click', function(e) {
    if(e.target.closest('.editar-pedido')) {
        const id = e.target.closest('.editar-pedido').dataset.id;
        abrirModalEditarPedido(id);
    }
    
    if(e.target.closest('.eliminar-pedido')) {
        const id = e.target.closest('.eliminar-pedido').dataset.id;
        if(confirm('¿Estás seguro de eliminar este pedido?')) {
            fetch(`/api/pedidos/${id}`, { method: 'DELETE' })
                .then(response => {
                    if(response.ok) {
                        cargarPedidos();
                        alert('Pedido eliminado correctamente');
                    }
                });
        }
    }
});

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarPedidos();
    cargarOpcionesPedidos();
    
    // Calcular automáticamente el monto cuando cambia el vestido o la cantidad
    document.getElementById('vestidoPedido').addEventListener('change', calcularMonto);
    document.getElementById('cantidadPedido').addEventListener('input', calcularMonto);
    
    document.getElementById('editVestidoPedido').addEventListener('change', calcularMontoEditar);
    document.getElementById('editCantidadPedido').addEventListener('input', calcularMontoEditar);
});

// Función para calcular monto al agregar pedido
function calcularMonto() {
    const vestidoId = document.getElementById('vestidoPedido').value;
    const cantidad = document.getElementById('cantidadPedido').value;
    
    if(vestidoId && cantidad) {
        fetch(`/api/vestidos/${vestidoId}`)
            .then(response => response.json())
            .then(vestido => {
                const monto = vestido.costo_venta * cantidad;
                document.getElementById('montoPedido').value = monto.toFixed(2);
            });
    }
}

// Función para calcular monto al editar pedido
function calcularMontoEditar() {
    const vestidoId = document.getElementById('editVestidoPedido').value;
    const cantidad = document.getElementById('editCantidadPedido').value;
    
    if(vestidoId && cantidad) {
        fetch(`/api/vestidos/${vestidoId}`)
            .then(response => response.json())
            .then(vestido => {
                const monto = vestido.costo_venta * cantidad;
                document.getElementById('editMontoPedido').value = monto.toFixed(2);
            });
    }
}