// Función para cargar materias primas en el select
function cargarMateriasPrimas() {
    fetch('/api/materias_primas')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('materiaPrima');
            select.innerHTML = '<option value="">Seleccionar materia prima...</option>';
            
            data.forEach(materia => {
                const option = document.createElement('option');
                option.value = materia.id;
                option.textContent = `${materia.nombre} (${materia.proveedor_nombre})`;
                select.appendChild(option);
            });
        });
}

// Evento para guardar nuevo vestido
document.getElementById('btnGuardarVestido').addEventListener('click', function() {
    const vestidoData = {
        codigo_unico: document.getElementById('codigoUnico').value,
        tipo_vestido: document.getElementById('tipoVestido').value,
        color: document.getElementById('color').value,
        talla: document.getElementById('talla').value,
        cantidad_inventario: document.getElementById('cantidad').value,
        costo_produccion: document.getElementById('costoProduccion').value,
        costo_venta: document.getElementById('precioVenta').value,
        materia_prima_id: document.getElementById('materiaPrima').value
    };

    fetch('/api/vestidos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(vestidoData)
    })
    .then(response => response.json())
    .then(data => {
        if(data.error) {
            alert(`Error: ${data.error}`);
        } else {
            $('#agregarVestidoModal').modal('hide');
            document.getElementById('formAgregarVestido').reset();
            cargarVestidos();
            alert('Vestido agregado correctamente');
        }
    })
    .catch(error => console.error('Error:', error));
});

// Al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarMateriasPrimas();
    
    // Delegación de eventos para botones de editar/eliminar
    document.querySelector('#tablaVestidos').addEventListener('click', function(e) {
        if(e.target.closest('.editar-vestido')) {
            const id = e.target.closest('.editar-vestido').dataset.id;
            // Lógica para editar
        }
        
        if(e.target.closest('.eliminar-vestido')) {
            const id = e.target.closest('.eliminar-vestido').dataset.id;
            if(confirm('¿Estás seguro de eliminar este vestido?')) {
                fetch(`/api/vestidos/${id}`, { method: 'DELETE' })
                    .then(response => {
                        if(response.ok) {
                            cargarVestidos();
                            alert('Vestido eliminado correctamente');
                        }
                    });
            }
        }
    });
});

// Función para abrir el modal de edición con los datos del vestido
function abrirModalEditar(idVestido) {
    fetch(`/api/vestidos/${idVestido}`)
        .then(response => response.json())
        .then(vestido => {
            // Llenar el formulario con los datos del vestido
            document.getElementById('editIdVestido').value = vestido.id;
            document.getElementById('editCodigoUnico').value = vestido.codigo_unico;
            document.getElementById('editTipoVestido').value = vestido.tipo_vestido;
            document.getElementById('editColor').value = vestido.color;
            document.getElementById('editTalla').value = vestido.talla;
            document.getElementById('editCantidad').value = vestido.cantidad_inventario;
            document.getElementById('editCostoProduccion').value = vestido.costo_produccion;
            document.getElementById('editPrecioVenta').value = vestido.costo_venta;
            document.getElementById('editMateriaPrima').value = vestido.materia_prima_id;
            
            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('editarVestidoModal'));
            modal.show();
        })
        .catch(error => console.error('Error al cargar vestido:', error));
}

// Evento para actualizar el vestido
document.getElementById('btnActualizarVestido').addEventListener('click', function() {
    const vestidoData = {
        codigo_unico: document.getElementById('editCodigoUnico').value,
        tipo_vestido: document.getElementById('editTipoVestido').value,
        color: document.getElementById('editColor').value,
        talla: document.getElementById('editTalla').value,
        cantidad_inventario: document.getElementById('editCantidad').value,
        costo_produccion: document.getElementById('editCostoProduccion').value,
        costo_venta: document.getElementById('editPrecioVenta').value,
        materia_prima_id: document.getElementById('editMateriaPrima').value
    };

    const idVestido = document.getElementById('editIdVestido').value;

    fetch(`/api/vestidos/${idVestido}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(vestidoData)
    })
    .then(response => response.json())
    .then(data => {
        if(data.error) {
            alert(`Error: ${data.error}`);
        } else {
            $('#editarVestidoModal').modal('hide');
            cargarVestidos();
            alert('Vestido actualizado correctamente');
        }
    })
    .catch(error => console.error('Error:', error));
});

// Actualizar la delegación de eventos para el botón editar
document.querySelector('#tablaVestidos').addEventListener('click', function(e) {
    if(e.target.closest('.editar-vestido')) {
        const id = e.target.closest('.editar-vestido').dataset.id;
        abrirModalEditar(id);
    }
    
    if(e.target.closest('.eliminar-vestido')) {
        const id = e.target.closest('.eliminar-vestido').dataset.id;
        if(confirm('¿Estás seguro de eliminar este vestido?')) {
            fetch(`/api/vestidos/${id}`, { method: 'DELETE' })
                .then(response => {
                    if(response.ok) {
                        cargarVestidos();
                        alert('Vestido eliminado correctamente');
                    }
                });
        }
    }
});