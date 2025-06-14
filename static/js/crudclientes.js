// Función para cargar los clientes
function cargarClientes() {
    fetch('/api/clientes')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tablaClientes tbody');
            tbody.innerHTML = '';
            
            data.forEach(cliente => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cliente.id_cliente}</td>
                    <td>${cliente.nombre_cliente}</td>
                    <td>${cliente.tipo_cliente}</td>
                    <td>${cliente.telefono}</td>
                    <td>${cliente.gmail}</td>
                    <td>${cliente.historial_compra || 'Sin historial'}</td>
                    <td>
                        <button class="btn btn-warning btn-sm editar-cliente" data-id="${cliente.id_cliente}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm eliminar-cliente" data-id="${cliente.id_cliente}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => console.error('Error al cargar clientes:', error));
}

// Evento para guardar nuevo cliente
document.getElementById('btnGuardarCliente').addEventListener('click', function() {
    const clienteData = {
        nombre_cliente: document.getElementById('nombreCliente').value,
        tipo_cliente: document.getElementById('tipoCliente').value,
        telefono: document.getElementById('telefonoCliente').value,
        gmail: document.getElementById('emailCliente').value,
        historial_compra: document.getElementById('historialCliente').value
    };

    fetch('/api/clientes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(clienteData)
    })
    .then(response => response.json())
    .then(data => {
        if(data.error) {
            alert(`Error: ${data.error}`);
        } else {
            $('#agregarClienteModal').modal('hide');
            document.getElementById('formAgregarCliente').reset();
            cargarClientes();
            alert('Cliente agregado correctamente');
        }
    })
    .catch(error => console.error('Error:', error));
});

// Función para abrir el modal de edición con los datos del cliente
function abrirModalEditarCliente(idCliente) {
    fetch(`/api/clientes/${idCliente}`)
        .then(response => response.json())
        .then(cliente => {
            // Llenar el formulario con los datos del cliente
            document.getElementById('editIdCliente').value = cliente.id_cliente;
            document.getElementById('editNombreCliente').value = cliente.nombre_cliente;
            document.getElementById('editTipoCliente').value = cliente.tipo_cliente;
            document.getElementById('editTelefonoCliente').value = cliente.telefono;
            document.getElementById('editEmailCliente').value = cliente.gmail;
            document.getElementById('editHistorialCliente').value = cliente.historial_compra || '';
            
            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('editarClienteModal'));
            modal.show();
        })
        .catch(error => console.error('Error al cargar cliente:', error));
}

// Evento para actualizar el cliente
document.getElementById('btnActualizarCliente').addEventListener('click', function() {
    const clienteData = {
        nombre_cliente: document.getElementById('editNombreCliente').value,
        tipo_cliente: document.getElementById('editTipoCliente').value,
        telefono: document.getElementById('editTelefonoCliente').value,
        gmail: document.getElementById('editEmailCliente').value,
        historial_compra: document.getElementById('editHistorialCliente').value
    };

    const idCliente = document.getElementById('editIdCliente').value;

    fetch(`/api/clientes/${idCliente}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(clienteData)
    })
    .then(response => response.json())
    .then(data => {
        if(data.error) {
            alert(`Error: ${data.error}`);
        } else {
            $('#editarClienteModal').modal('hide');
            cargarClientes();
            alert('Cliente actualizado correctamente');
        }
    })
    .catch(error => console.error('Error:', error));
});

// Delegación de eventos para la tabla
document.querySelector('#tablaClientes').addEventListener('click', function(e) {
    if(e.target.closest('.editar-cliente')) {
        const id = e.target.closest('.editar-cliente').dataset.id;
        abrirModalEditarCliente(id);
    }
    
    if(e.target.closest('.eliminar-cliente')) {
        const id = e.target.closest('.eliminar-cliente').dataset.id;
        if(confirm('¿Estás seguro de eliminar este cliente?')) {
            fetch(`/api/clientes/${id}`, { method: 'DELETE' })
                .then(response => {
                    if(response.ok) {
                        cargarClientes();
                        alert('Cliente eliminado correctamente');
                    }
                });
        }
    }
});

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarClientes();
});