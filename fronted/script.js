const STORAGE_KEY = "gestor_trabajos_academicos_v1";

// Aquí se guardan todos los trabajos
let trabajos = cargarTrabajos();
let trabajoEditando = null;

// Función corta para seleccionar elementos del HTML
const $ = (selector) => document.querySelector(selector);

// Elementos principales de la página
const elementos = {
    modal: $("#modalTrabajo"),
    formulario: $("#formTrabajo"),
    tabla: $("#tablaTrabajos"),
    template: $("#templateFila"),
    estadoVacio: $("#estadoVacio"),

    buscar: $("#buscar"),
    filtroEstado: $("#filtroEstado"),
    filtroPrioridad: $("#filtroPrioridad"),
    ordenar: $("#ordenar"),

    calendario: $("#calendario"),
    alertas: $("#alertas"),

    statPendientes: $("#statPendientes"),
    statProceso: $("#statProceso"),
    statUrgentes: $("#statUrgentes"),
    statCobrar: $("#statCobrar"),
    statMes: $("#statMes"),
    statEntregados: $("#statEntregados"),

    finTotal: $("#finTotal"),
    finRecibido: $("#finRecibido"),
    finPendiente: $("#finPendiente")
};


// ======================================================
// GUARDAR Y CARGAR INFORMACIÓN
// ======================================================

function cargarTrabajos() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}


function guardarTrabajos() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(trabajos)
    );
}


// ======================================================
// FECHAS
// ======================================================

function obtenerFechaHoy() {

    const fecha = new Date();

    const fechaLocal = new Date(
        fecha.getTime() - fecha.getTimezoneOffset() * 60000
    );

    return fechaLocal
        .toISOString()
        .split("T")[0];
}


function fechaBonita(fechaISO) {

    if (!fechaISO) {
        return "Sin fecha";
    }

    const partes = fechaISO
        .split("-")
        .map(Number);

    const año = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    const fecha = new Date(
        año,
        mes - 1,
        dia
    );

    return new Intl.DateTimeFormat(
        "es-CO",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(fecha);
}


function obtenerFechaHoraEntrega(trabajo) {

    const hora =
        trabajo.horaEntrega || "23:59";

    return new Date(
        `${trabajo.fechaEntrega}T${hora}:00`
    );
}


function diasRestantes(trabajo) {

    const ahora = new Date();

    const entrega =
        obtenerFechaHoraEntrega(trabajo);

    const diferencia =
        entrega - ahora;

    return diferencia / 86400000;
}


// ======================================================
// DINERO
// ======================================================

function moneda(valor) {

    return new Intl.NumberFormat(
        "es-CO",
        {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }
    ).format(
        Number(valor || 0)
    );
}


function calcularSaldo(trabajo) {

    const valor =
        Number(trabajo.valor || 0);

    const abono =
        Number(trabajo.abono || 0);

    return Math.max(
        0,
        valor - abono
    );
}


// ======================================================
// PRIORIDAD AUTOMÁTICA
// ======================================================

function calcularPrioridad(trabajo) {

    // Si ya está terminado no tiene prioridad
    if (
        trabajo.estado === "Entregado" ||
        trabajo.estado === "Cancelado"
    ) {
        return "Baja";
    }


    // Si el usuario escogió prioridad manual
    if (trabajo.prioridadManual) {
        return trabajo.prioridadManual;
    }


    const dias =
        diasRestantes(trabajo);


    if (dias < 0) {
        return "Vencido";
    }


    if (dias <= 1) {
        return "Urgente";
    }


    if (dias <= 2) {
        return "Alta";
    }


    if (dias <= 5) {
        return "Media";
    }


    return "Baja";
}


// ======================================================
// TEXTO DE TIEMPO RESTANTE
// ======================================================

function obtenerTiempoRestante(trabajo) {

    if (trabajo.estado === "Entregado") {
        return "Entregado";
    }


    if (trabajo.estado === "Cancelado") {
        return "Cancelado";
    }


    const ahora =
        new Date();


    const entrega =
        obtenerFechaHoraEntrega(trabajo);


    const diferencia =
        entrega - ahora;


    const horas =
        diferencia / 3600000;


    if (horas < 0) {

        const dias =
            Math.abs(horas) / 24;


        if (dias < 1) {
            return "Vencido hoy";
        }


        return `Vencido hace ${Math.floor(dias)} día(s)`;
    }


    if (horas < 24) {

        return `Faltan ${Math.max(
            1,
            Math.ceil(horas)
        )} hora(s)`;
    }


    const dias =
        Math.ceil(
            horas / 24
        );


    return `Faltan ${dias} día(s)`;
}


// ======================================================
// CONVERTIR TEXTO PARA CLASES CSS
// ======================================================

function convertirClase(texto) {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            "-"
        );
}


// ======================================================
// PESO DE PRIORIDADES
// ======================================================

function pesoPrioridad(prioridad) {

    const prioridades = {
        "Vencido": 0,
        "Urgente": 1,
        "Alta": 2,
        "Media": 3,
        "Baja": 4
    };


    return prioridades[prioridad] ?? 5;
}


// ======================================================
// FILTRAR Y ORDENAR TRABAJOS
// ======================================================

function obtenerTrabajosFiltrados() {

    const busqueda =
        elementos.buscar.value
            .trim()
            .toLowerCase();


    const estado =
        elementos.filtroEstado.value;


    const prioridad =
        elementos.filtroPrioridad.value;


    const orden =
        elementos.ordenar.value;


    let lista =
        trabajos.filter(
            (trabajo) => {

                const texto =
                    `
                    ${trabajo.cliente}
                    ${trabajo.materia}
                    ${trabajo.actividad}
                    ${trabajo.universidad || ""}
                    `
                        .toLowerCase();


                const prioridadTrabajo =
                    calcularPrioridad(trabajo);


                const coincideBusqueda =
                    !busqueda ||
                    texto.includes(busqueda);


                const coincideEstado =
                    !estado ||
                    trabajo.estado === estado;


                const coincidePrioridad =
                    !prioridad ||
                    prioridadTrabajo === prioridad;


                return (
                    coincideBusqueda &&
                    coincideEstado &&
                    coincidePrioridad
                );
            }
        );


    lista.sort(
        (a, b) => {

            // Orden por fecha de entrega
            if (
                orden === "fechaEntrega"
            ) {

                return (
                    obtenerFechaHoraEntrega(a) -
                    obtenerFechaHoraEntrega(b)
                );
            }


            // Orden de llegada
            if (
                orden === "fechaLlegada"
            ) {

                return a.fechaLlegada.localeCompare(
                    b.fechaLlegada
                );
            }


            // Mayor precio
            if (
                orden === "valorDesc"
            ) {

                return (
                    Number(b.valor) -
                    Number(a.valor)
                );
            }


            // Mayor deuda
            if (
                orden === "saldoDesc"
            ) {

                return (
                    calcularSaldo(b) -
                    calcularSaldo(a)
                );
            }


            // ORDEN AUTOMÁTICO POR PRIORIDAD

            const prioridadA =
                pesoPrioridad(
                    calcularPrioridad(a)
                );


            const prioridadB =
                pesoPrioridad(
                    calcularPrioridad(b)
                );


            if (
                prioridadA !== prioridadB
            ) {

                return (
                    prioridadA -
                    prioridadB
                );
            }


            // Si tienen la misma prioridad:
            // primero el que se entrega antes

            const diferenciaEntrega =
                obtenerFechaHoraEntrega(a) -
                obtenerFechaHoraEntrega(b);


            if (
                diferenciaEntrega !== 0
            ) {

                return diferenciaEntrega;
            }


            // Finalmente orden de llegada

            return a.fechaLlegada.localeCompare(
                b.fechaLlegada
            );
        }
    );


    return lista;
}


// ======================================================
// MOSTRAR TABLA
// ======================================================

function mostrarTabla() {

    const lista =
        obtenerTrabajosFiltrados();


    elementos.tabla.innerHTML = "";


    elementos.estadoVacio.classList.toggle(
        "hidden",
        lista.length > 0
    );


    lista.forEach(
        (trabajo) => {

            const fragmento =
                elementos.template.content.cloneNode(
                    true
                );


            const fila =
                fragmento.querySelector("tr");


            const prioridad =
                calcularPrioridad(trabajo);


            // PRIORIDAD

            const etiquetaPrioridad =
                fila.querySelector(
                    ".priority-badge"
                );


            etiquetaPrioridad.textContent =
                prioridad;


            etiquetaPrioridad.classList.add(
                `priority-${convertirClase(prioridad)}`
            );


            // CLIENTE

            fila.querySelector(
                ".cliente"
            ).textContent =
                trabajo.cliente;


            fila.querySelector(
                ".universidad"
            ).textContent =
                `${trabajo.universidad || "Sin universidad"} · ${trabajo.whatsapp || "Sin WhatsApp"}`;


            // MATERIA

            fila.querySelector(
                ".materia"
            ).textContent =
                trabajo.materia;


            fila.querySelector(
                ".actividad"
            ).textContent =
                `${trabajo.tipo || "Trabajo"} · ${trabajo.actividad}`;


            // ENTREGA

            fila.querySelector(
                ".entrega"
            ).textContent =
                `${fechaBonita(trabajo.fechaEntrega)} ${trabajo.horaEntrega || ""}`;


            fila.querySelector(
                ".restante"
            ).textContent =
                obtenerTiempoRestante(trabajo);


            // DINERO

            fila.querySelector(
                ".valor"
            ).textContent =
                moneda(trabajo.valor);


            fila.querySelector(
                ".saldo"
            ).textContent =
                moneda(
                    calcularSaldo(trabajo)
                );


            // ESTADO

            const estado =
                fila.querySelector(
                    ".status-badge"
                );


            estado.textContent =
                trabajo.estado;


            estado.classList.add(
                `status-${convertirClase(trabajo.estado)}`
            );


            // BOTÓN WHATSAPP

            const botonWhatsApp =
                fila.querySelector(
                    ".whatsapp-btn"
                );


            botonWhatsApp.disabled =
                !trabajo.whatsapp;


            botonWhatsApp.addEventListener(
                "click",
                () => {
                    abrirWhatsApp(trabajo);
                }
            );


            // BOTÓN EDITAR

            fila.querySelector(
                ".edit-btn"
            ).addEventListener(
                "click",
                () => {
                    abrirEditarTrabajo(
                        trabajo.id
                    );
                }
            );


            // BOTÓN ENTREGADO

            fila.querySelector(
                ".done-btn"
            ).addEventListener(
                "click",
                () => {
                    marcarEntregado(
                        trabajo.id
                    );
                }
            );


            // BOTÓN ELIMINAR

            fila.querySelector(
                ".delete-btn"
            ).addEventListener(
                "click",
                () => {
                    eliminarTrabajo(
                        trabajo.id
                    );
                }
            );


            elementos.tabla.appendChild(
                fragmento
            );
        }
    );
}


// ======================================================
// ESTADÍSTICAS
// ======================================================

function mostrarEstadisticas() {

    const pendientes =
        trabajos.filter(
            trabajo =>
                trabajo.estado === "Pendiente"
        ).length;


    const enProceso =
        trabajos.filter(
            trabajo =>
                trabajo.estado === "En proceso"
        ).length;


    const entregados =
        trabajos.filter(
            trabajo =>
                trabajo.estado === "Entregado"
        ).length;


    const activos =
        trabajos.filter(
            trabajo =>
                trabajo.estado !== "Entregado" &&
                trabajo.estado !== "Cancelado"
        );


    const urgentes =
        activos.filter(
            trabajo => {

                const prioridad =
                    calcularPrioridad(trabajo);


                return (
                    prioridad === "Vencido" ||
                    prioridad === "Urgente"
                );
            }
        ).length;


    let total = 0;

    let recibido = 0;

    let pendienteCobrar = 0;


    trabajos.forEach(
        trabajo => {

            if (
                trabajo.estado !== "Cancelado"
            ) {

                total +=
                    Number(
                        trabajo.valor || 0
                    );


                recibido +=
                    Number(
                        trabajo.abono || 0
                    );


                pendienteCobrar +=
                    calcularSaldo(trabajo);
            }
        }
    );


    // INGRESOS DEL MES

    const fechaActual =
        new Date();


    const mesActual =
        fechaActual.getMonth();


    const añoActual =
        fechaActual.getFullYear();


    const ingresosMes =
        trabajos
            .filter(
                trabajo => {

                    const fecha =
                        new Date(
                            `${trabajo.fechaLlegada}T12:00:00`
                        );


                    return (
                        fecha.getMonth() === mesActual &&
                        fecha.getFullYear() === añoActual &&
                        trabajo.estado !== "Cancelado"
                    );
                }
            )
            .reduce(
                (total, trabajo) =>
                    total +
                    Number(
                        trabajo.abono || 0
                    ),
                0
            );


    elementos.statPendientes.textContent =
        pendientes;


    elementos.statProceso.textContent =
        enProceso;


    elementos.statUrgentes.textContent =
        urgentes;


    elementos.statCobrar.textContent =
        moneda(pendienteCobrar);


    elementos.statMes.textContent =
        moneda(ingresosMes);


    elementos.statEntregados.textContent =
        entregados;


    elementos.finTotal.textContent =
        moneda(total);


    elementos.finRecibido.textContent =
        moneda(recibido);


    elementos.finPendiente.textContent =
        moneda(pendienteCobrar);
}


// ======================================================
// ALERTAS
// ======================================================

function mostrarAlertas() {

    const activos =
        trabajos.filter(
            trabajo =>
                trabajo.estado !== "Entregado" &&
                trabajo.estado !== "Cancelado"
        );


    const vencidos =
        activos.filter(
            trabajo =>
                calcularPrioridad(trabajo) ===
                "Vencido"
        ).length;


    const proximas24Horas =
        activos.filter(
            trabajo => {

                const dias =
                    diasRestantes(trabajo);


                return (
                    dias >= 0 &&
                    dias <= 1
                );
            }
        ).length;


    const pendienteCobrar =
        trabajos
            .filter(
                trabajo =>
                    trabajo.estado !== "Cancelado"
            )
            .reduce(
                (total, trabajo) =>
                    total +
                    calcularSaldo(trabajo),
                0
            );


    let mensajes = "";


    if (vencidos > 0) {

        mensajes += `
            <div class="alert alert-danger">
                🚨 Tienes ${vencidos} trabajo(s) vencido(s).
                Revísalos primero.
            </div>
        `;
    }


    if (proximas24Horas > 0) {

        mensajes += `
            <div class="alert alert-warning">
                ⚠️ Tienes ${proximas24Horas}
                entrega(s) dentro de las próximas 24 horas.
            </div>
        `;
    }


    if (pendienteCobrar > 0) {

        mensajes += `
            <div class="alert alert-success">
                💰 Tienes
                ${moneda(pendienteCobrar)}
                pendientes por cobrar.
            </div>
        `;
    }


    elementos.alertas.innerHTML =
        mensajes;
}


// ======================================================
// CALENDARIO
// ======================================================

function mostrarCalendario() {

    const proximos =
        trabajos
            .filter(
                trabajo =>
                    trabajo.estado !== "Entregado" &&
                    trabajo.estado !== "Cancelado"
            )
            .sort(
                (a, b) =>
                    obtenerFechaHoraEntrega(a) -
                    obtenerFechaHoraEntrega(b)
            )
            .slice(
                0,
                7
            );


    if (
        proximos.length === 0
    ) {

        elementos.calendario.innerHTML = `
            <div class="empty-state">
                <p>
                    No hay entregas pendientes.
                </p>
            </div>
        `;

        return;
    }


    elementos.calendario.innerHTML =
        proximos
            .map(
                trabajo => {

                    return `
                        <div class="calendar-item">

                            <strong>
                                ${fechaBonita(trabajo.fechaEntrega)}
                                ·
                                ${trabajo.horaEntrega || "23:59"}
                            </strong>

                            <span>
                                ${trabajo.materia}
                            </span>

                            <small>
                                ${trabajo.cliente}
                                ·
                                ${trabajo.actividad}
                            </small>

                        </div>
                    `;
                }
            )
            .join("");
}


// ======================================================
// ACTUALIZAR TODA LA PÁGINA
// ======================================================

function actualizarPagina() {

    mostrarTabla();

    mostrarEstadisticas();

    mostrarAlertas();

    mostrarCalendario();
}


// ======================================================
// ABRIR NUEVO TRABAJO
// ======================================================

function abrirNuevoTrabajo() {

    trabajoEditando = null;


    $("#modalTitulo").textContent =
        "Nuevo trabajo";


    elementos.formulario.reset();


    $("#trabajoId").value =
        "";


    $("#universidad").value =
        "UNAD";


    $("#fechaLlegada").value =
        obtenerFechaHoy();


    $("#fechaEntrega").value =
        obtenerFechaHoy();


    $("#horaEntrega").value =
        "23:59";


    $("#abono").value =
        0;


    $("#estado").value =
        "Pendiente";


    $("#prioridadManual").value =
        "";


    elementos.modal.showModal();
}


// ======================================================
// EDITAR TRABAJO
// ======================================================

function abrirEditarTrabajo(id) {

    const trabajo =
        trabajos.find(
            trabajo =>
                trabajo.id === id
        );


    if (!trabajo) {
        return;
    }


    trabajoEditando =
        id;


    $("#modalTitulo").textContent =
        "Editar trabajo";


    $("#trabajoId").value =
        trabajo.id;


    $("#cliente").value =
        trabajo.cliente;


    $("#whatsapp").value =
        trabajo.whatsapp || "";


    $("#universidad").value =
        trabajo.universidad || "";


    $("#materia").value =
        trabajo.materia;


    $("#actividad").value =
        trabajo.actividad;


    $("#tipo").value =
        trabajo.tipo || "Tarea";


    $("#fechaLlegada").value =
        trabajo.fechaLlegada;


    $("#fechaEntrega").value =
        trabajo.fechaEntrega;


    $("#horaEntrega").value =
        trabajo.horaEntrega || "23:59";


    $("#valor").value =
        trabajo.valor;


    $("#abono").value =
        trabajo.abono || 0;


    $("#estado").value =
        trabajo.estado;


    $("#prioridadManual").value =
        trabajo.prioridadManual || "";


    $("#notas").value =
        trabajo.notas || "";


    elementos.modal.showModal();
}


// ======================================================
// CERRAR MODAL
// ======================================================

function cerrarModal() {

    elementos.modal.close();
}


// ======================================================
// LEER DATOS DEL FORMULARIO
// ======================================================

function obtenerDatosFormulario() {

    return {

        id:
            trabajoEditando ||
            crypto.randomUUID(),

        cliente:
            $("#cliente").value.trim(),

        whatsapp:
            $("#whatsapp")
                .value
                .replace(/\D/g, ""),

        universidad:
            $("#universidad")
                .value
                .trim(),

        materia:
            $("#materia")
                .value
                .trim(),

        actividad:
            $("#actividad")
                .value
                .trim(),

        tipo:
            $("#tipo").value,

        fechaLlegada:
            $("#fechaLlegada").value,

        fechaEntrega:
            $("#fechaEntrega").value,

        horaEntrega:
            $("#horaEntrega").value ||
            "23:59",

        valor:
            Number(
                $("#valor").value || 0
            ),

        abono:
            Number(
                $("#abono").value || 0
            ),

        estado:
            $("#estado").value,

        prioridadManual:
            $("#prioridadManual").value,

        notas:
            $("#notas")
                .value
                .trim(),

        actualizado:
            new Date().toISOString()
    };
}


// ======================================================
// VALIDAR DATOS
// ======================================================

function validarTrabajo(trabajo) {

    if (
        !trabajo.cliente ||
        !trabajo.materia ||
        !trabajo.actividad ||
        !trabajo.fechaLlegada ||
        !trabajo.fechaEntrega
    ) {

        alert(
            "Completa los campos obligatorios."
        );

        return false;
    }


    if (
        trabajo.valor < 0 ||
        trabajo.abono < 0
    ) {

        alert(
            "Los valores no pueden ser negativos."
        );

        return false;
    }


    if (
        trabajo.abono >
        trabajo.valor
    ) {

        alert(
            "El abono no puede ser mayor que el valor total."
        );

        return false;
    }


    return true;
}


// ======================================================
// GUARDAR TRABAJO
// ======================================================

function guardarFormulario(evento) {

    evento.preventDefault();


    const trabajo =
        obtenerDatosFormulario();


    if (
        !validarTrabajo(trabajo)
    ) {
        return;
    }


    const posicion =
        trabajos.findIndex(
            item =>
                item.id === trabajo.id
        );


    if (
        posicion >= 0
    ) {

        trabajos[posicion] = {
            ...trabajos[posicion],
            ...trabajo
        };

    } else {

        trabajos.push(
            trabajo
        );
    }


    guardarTrabajos();


    cerrarModal();


    actualizarPagina();
}


// ======================================================
// MARCAR COMO ENTREGADO
// ======================================================

function marcarEntregado(id) {

    const trabajo =
        trabajos.find(
            trabajo =>
                trabajo.id === id
        );


    if (!trabajo) {
        return;
    }


    trabajo.estado =
        "Entregado";


    guardarTrabajos();


    actualizarPagina();
}


// ======================================================
// ELIMINAR TRABAJO
// ======================================================

function eliminarTrabajo(id) {

    const trabajo =
        trabajos.find(
            trabajo =>
                trabajo.id === id
        );


    if (!trabajo) {
        return;
    }


    const confirmar =
        confirm(
            `¿Seguro que quieres eliminar el trabajo de ${trabajo.cliente}?`
        );


    if (!confirmar) {
        return;
    }


    trabajos =
        trabajos.filter(
            trabajo =>
                trabajo.id !== id
        );


    guardarTrabajos();


    actualizarPagina();
}


// ======================================================
// WHATSAPP
// ======================================================

function abrirWhatsApp(trabajo) {

    if (
        !trabajo.whatsapp
    ) {
        return;
    }


    let numero =
        trabajo.whatsapp
            .replace(/\D/g, "");


    // Si es un número colombiano de 10 dígitos
    // agregamos automáticamente +57

    if (
        numero.length === 10
    ) {

        numero =
            "57" + numero;
    }


    const mensaje =
        `Hola ${trabajo.cliente}. Te escribo sobre tu actividad de ${trabajo.materia}: ${trabajo.actividad}.`;


    const enlace =
        `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;


    window.open(
        enlace,
        "_blank"
    );
}


// ======================================================
// EVENTOS DE LOS BOTONES
// ======================================================

$("#btnNuevo").addEventListener(
    "click",
    abrirNuevoTrabajo
);


$("#btnCerrarModal").addEventListener(
    "click",
    cerrarModal
);


$("#btnCancelar").addEventListener(
    "click",
    cerrarModal
);


elementos.formulario.addEventListener(
    "submit",
    guardarFormulario
);


// ======================================================
// BUSCADOR
// ======================================================

elementos.buscar.addEventListener(
    "input",
    mostrarTabla
);


// ======================================================
// FILTROS
// ======================================================

elementos.filtroEstado.addEventListener(
    "change",
    mostrarTabla
);


elementos.filtroPrioridad.addEventListener(
    "change",
    mostrarTabla
);


elementos.ordenar.addEventListener(
    "change",
    mostrarTabla
);


// ======================================================
// LIMPIAR FILTROS
// ======================================================

$("#btnLimpiarFiltros").addEventListener(
    "click",
    function () {

        elementos.buscar.value =
            "";


        elementos.filtroEstado.value =
            "";


        elementos.filtroPrioridad.value =
            "";


        elementos.ordenar.value =
            "prioridad";


        mostrarTabla();
    }
);


// ======================================================
// INICIAR LA PÁGINA
// ======================================================

actualizarPagina();