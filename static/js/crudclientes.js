// Evento para guardar nuevo cliente
document.getElementById('btnGuardarCliente').addEventListener('click', function(e) {
    // Prevenir el comportamiento por defecto del formulario
    e.preventDefault();
    
    // Obtener el formulario
    const form = document.getElementById('formAgregarCliente');
    
    // Validar el formulario
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
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
    .then(response => {
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }
        return response.json();
    })
    .then(data => {
        if(data.error) {
            alert(`Error: ${data.error}`);
        } else {
            // Cerrar el modal usando Bootstrap JS
            const modal = bootstrap.Modal.getInstance(document.getElementById('agregarClienteModal'));
            modal.hide();
            
            // Resetear el formulario
            form.reset();
            form.classList.remove('was-validated');
            
            // Recargar la lista de clientes
            cargarClientes();
            
            // Mostrar mensaje de éxito
            alert('Cliente agregado correctamente');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al agregar cliente: ' + error.message);
    });
});