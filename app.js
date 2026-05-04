/**
 * ============================================
 * SISTEMA DE REGISTRO DE INCIDENCIAS TÉCNICAS
 * Lógica completa - Dashboard y transformación
 * ============================================
 * CORREGIDO: Dashboard, Registro histórico y Transformar estado funcionando
 */

// ========================
// MODELO DE DATOS
// ========================
let incidencias = [];
let chartInstance = null;

// ========================
// INICIALIZACIÓN (simula SQLite con localStorage)
// ========================
function cargarDatosIniciales() {
    const stored = localStorage.getItem("incidenciasPastelDB");
    
    if (stored) {
        incidencias = JSON.parse(stored);
        console.log("Datos cargados desde localStorage:", incidencias.length);
    } else {
        // Datos de ejemplo iniciales
        const hoy = new Date().toISOString().split('T')[0];
        const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const hace2 = new Date(Date.now() - 172800000).toISOString().split('T')[0];
        
        incidencias = [
            {
                id: 1,
                descripcion: "Servidor de base de datos central caído, afecta todas las operaciones",
                categoria: "Critica",
                estado: "Pendiente",
                fechaRegistro: hoy,
                fechaResolucion: null,
                tiempoRespuestaHoras: null
            },
            {
                id: 2,
                descripcion: "Error de login en el portal de clientes - reintentos fallidos",
                categoria: "Critica",
                estado: "Resuelto",
                fechaRegistro: ayer,
                fechaResolucion: hoy,
                tiempoRespuestaHoras: 23.5
            },
            {
                id: 3,
                descripcion: "Sugerencia de mejora en la interfaz de reportes gerenciales",
                categoria: "Leve",
                estado: "Resuelto",
                fechaRegistro: hace2,
                fechaResolucion: ayer,
                tiempoRespuestaHoras: 14.2
            },
            {
                id: 4,
                descripcion: "Impresora de tickets en punto de venta no responde",
                categoria: "Leve",
                estado: "Pendiente",
                fechaRegistro: hoy,
                fechaResolucion: null,
                tiempoRespuestaHoras: null
            },
            {
                id: 5,
                descripcion: "API de pagos presenta latencia superior a 5 segundos",
                categoria: "Critica",
                estado: "Pendiente",
                fechaRegistro: hoy,
                fechaResolucion: null,
                tiempoRespuestaHoras: null
            }
        ];
        guardarEnLocal();
    }
    renderizarCompleto();
}

function guardarEnLocal() {
    localStorage.setItem("incidenciasPastelDB", JSON.stringify(incidencias));
    console.log("Datos guardados en localStorage");
}

// ========================
// VALIDACIÓN ANTI RUIDO
// ========================
function validarEntrada(descripcion, categoria) {
    if (!descripcion || descripcion.trim().length < 10) {
        return { valido: false, mensaje: "❌ La descripción debe tener al menos 10 caracteres (evitar ruido semántico)." };
    }
    if (!categoria || (categoria !== "Critica" && categoria !== "Leve")) {
        return { valido: false, mensaje: "❌ Seleccione una categoría: Crítica (A) o Leve (B)." };
    }
    return { valido: true, mensaje: "" };
}

// Registrar nueva incidencia
function registrarIncidencia(descripcion, categoria, fechaReg) {
    const valid = validarEntrada(descripcion, categoria);
    if (!valid.valido) return { success: false, msg: valid.mensaje };
    
    let fechaRegistro = fechaReg;
    if (!fechaRegistro) {
        fechaRegistro = new Date().toISOString().split('T')[0];
    }
    
    const nuevoId = incidencias.length > 0 ? Math.max(...incidencias.map(i => i.id)) + 1 : 1;
    const nueva = {
        id: nuevoId,
        descripcion: descripcion.trim(),
        categoria: categoria,
        estado: "Pendiente",
        fechaRegistro: fechaRegistro,
        fechaResolucion: null,
        tiempoRespuestaHoras: null
    };
    incidencias.push(nueva);
    guardarEnLocal();
    return { success: true, msg: `✅ Incidencia #${nuevoId} registrada correctamente.` };
}

// ========================
// PROCESAMIENTO: Transformar Pendiente -> Resuelto
// ========================
function calcularHorasRespuesta(fechaReg, fechaRes) {
    const reg = new Date(fechaReg);
    const res = new Date(fechaRes);
    const diffHoras = (res - reg) / (1000 * 60 * 60);
    return parseFloat(diffHoras.toFixed(2));
}

function resolverIncidencia(id) {
    console.log("Resolviendo incidencia:", id);
    const incidencia = incidencias.find(inc => inc.id === id);
    if (!incidencia) {
        console.log("Incidencia no encontrada");
        return false;
    }
    if (incidencia.estado === "Resuelto") {
        document.getElementById("msgResolver").innerHTML = '<i class="fas fa-info-circle"></i> Esta incidencia ya estaba resuelta.';
        return false;
    }
    
    const hoy = new Date().toISOString().split('T')[0];
    incidencia.estado = "Resuelto";
    incidencia.fechaResolucion = hoy;
    const tiempo = calcularHorasRespuesta(incidencia.fechaRegistro, hoy);
    incidencia.tiempoRespuestaHoras = tiempo;
    guardarEnLocal();
    
    document.getElementById("msgResolver").innerHTML = `<span class="text-success"><i class="fas fa-check"></i> Incidencia #${id} resuelta en ${tiempo} horas.</span>`;
    renderizarCompleto();
    return true;
}

// ========================
// MÉTRICAS DASHBOARD (Atributo Oportunidad)
// ========================
function contarPendientesHoy() {
    const hoyStr = new Date().toISOString().split('T')[0];
    const pendientesHoy = incidencias.filter(inc => inc.estado === "Pendiente" && inc.fechaRegistro === hoyStr);
    console.log("Pendientes hoy:", pendientesHoy.length);
    return pendientesHoy.length;
}

function tiempoPromedioRespuesta() {
    const resueltas = incidencias.filter(inc => inc.estado === "Resuelto" && inc.tiempoRespuestaHoras !== null && inc.tiempoRespuestaHoras > 0);
    if (resueltas.length === 0) return 0;
    const suma = resueltas.reduce((acc, inc) => acc + inc.tiempoRespuestaHoras, 0);
    const promedio = suma / resueltas.length;
    console.log("Tiempo promedio:", promedio.toFixed(1));
    return parseFloat(promedio.toFixed(1));
}

// ========================
// RENDERIZADO DE INTERFAZ
// ========================
function actualizarSelectPendientes() {
    const select = document.getElementById("selectResolver");
    if (!select) return;
    
    const pendientes = incidencias.filter(inc => inc.estado === "Pendiente");
    select.innerHTML = '<option value="">-- Incidencias pendientes --</option>';
    
    if (pendientes.length === 0) {
        select.innerHTML = '<option disabled>✨ No hay incidencias pendientes</option>';
    } else {
        pendientes.forEach(inc => {
            const option = document.createElement("option");
            option.value = inc.id;
            const preview = inc.descripcion.length > 40 ? inc.descripcion.substring(0, 40) + "…" : inc.descripcion;
            option.textContent = `#${inc.id} - ${preview} (${inc.categoria === "Critica" ? "Crítica" : "Leve"})`;
            select.appendChild(option);
        });
    }
    console.log("Select actualizado con", pendientes.length, "pendientes");
}

function renderizarTabla() {
    const tbody = document.getElementById("tablaBody");
    if (!tbody) return;
    
    if (incidencias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">📭 No hay incidencias registradas</td></tr>';
        return;
    }
    
    // Ordenar por ID descendente (más reciente primero)
    const ordenadas = [...incidencias].sort((a, b) => b.id - a.id);
    tbody.innerHTML = "";
    
    ordenadas.forEach(inc => {
        const badgeCat = inc.categoria === "Critica" 
            ? '<span class="badge-critica"><i class="fas fa-exclamation-triangle me-1"></i>Crítica (A)</span>'
            : '<span class="badge-leve"><i class="fas fa-feather-alt me-1"></i>Leve (B)</span>';
        
        const badgeEst = inc.estado === "Pendiente"
            ? '<span class="badge-pendiente">⏳ Pendiente</span>'
            : '<span class="badge-resuelto">✅ Resuelto</span>';
        
        const tiempoResp = inc.tiempoRespuestaHoras ? `${inc.tiempoRespuestaHoras.toFixed(1)} h` : (inc.estado === "Pendiente" ? "—" : "—");
        const fechaRes = inc.fechaResolucion || "—";
        
        const fila = `
            <tr>
                <td class="fw-semibold">${inc.id}</td>
                <td>${inc.descripcion.substring(0, 65)}${inc.descripcion.length > 65 ? '…' : ''}</td>
                <td>${badgeCat}</td>
                <td>${badgeEst}</td>
                <td>${inc.fechaRegistro}</td>
                <td>${fechaRes}</td>
                <td>${tiempoResp}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', fila);
    });
    console.log("Tabla renderizada con", incidencias.length, "incidencias");
}

function actualizarKPIs() {
    const pendientesHoy = contarPendientesHoy();
    const tiempoProm = tiempoPromedioRespuesta();
    
    document.getElementById("kpiPendientesHoy").innerText = pendientesHoy;
    document.getElementById("kpiTiempoPromedio").innerHTML = tiempoProm;
    console.log("KPIs actualizados - Pendientes Hoy:", pendientesHoy, "Tiempo Promedio:", tiempoProm);
}

function renderizarGrafico() {
    const pendCrit = incidencias.filter(i => i.estado === "Pendiente" && i.categoria === "Critica").length;
    const pendLeve = incidencias.filter(i => i.estado === "Pendiente" && i.categoria === "Leve").length;
    const resCrit = incidencias.filter(i => i.estado === "Resuelto" && i.categoria === "Critica").length;
    const resLeve = incidencias.filter(i => i.estado === "Resuelto" && i.categoria === "Leve").length;
    
    console.log("Gráfico - PendCrit:", pendCrit, "PendLeve:", pendLeve, "ResCrit:", resCrit, "ResLeve:", resLeve);
    
    const ctx = document.getElementById('chartIncidencias').getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['🔴 Críticas (A)', '🟢 Leves (B)'],
            datasets: [
                {
                    label: 'Pendientes',
                    data: [pendCrit, pendLeve],
                    backgroundColor: '#ecc8af',
                    borderRadius: 12,
                    barPercentage: 0.65
                },
                {
                    label: 'Resueltas',
                    data: [resCrit, resLeve],
                    backgroundColor: '#bdd9cc',
                    borderRadius: 12,
                    barPercentage: 0.65
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { 
                    position: 'top', 
                    labels: { font: { size: 11, family: 'Segoe UI' } } 
                },
                tooltip: { 
                    backgroundColor: '#fff6ed', 
                    titleColor: '#b27044', 
                    bodyColor: '#7e5a3e' 
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 }, 
                    grid: { color: '#f0e2d4' }, 
                    title: { display: true, text: 'Número de incidencias', color: '#b68862' } 
                },
                x: { ticks: { color: '#9b765a' } }
            }
        }
    });
}

function renderizarCompleto() {
    console.log("=== Renderizando completo ===");
    actualizarSelectPendientes();
    renderizarTabla();
    actualizarKPIs();
    renderizarGrafico();
}

// ========================
// EVENTOS Y LISTENERS
// ========================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM cargado - Inicializando sistema");
    cargarDatosIniciales();
    
    // Formulario de registro
    const form = document.getElementById("formIncidencia");
    const alertaDiv = document.getElementById("alertaForm");
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("Formulario enviado");
        
        const desc = document.getElementById("descripcion").value;
        const cat = document.getElementById("categoria").value;
        let fecha = document.getElementById("fechaRegistro").value;
        if (!fecha) fecha = new Date().toISOString().split('T')[0];
        
        const resultado = registrarIncidencia(desc, cat, fecha);
        
        if (resultado.success) {
            document.getElementById("descripcion").value = "";
            document.getElementById("categoria").value = "";
            document.getElementById("fechaRegistro").value = "";
            alertaDiv.innerHTML = `<div class="alert-pastel-success p-2 rounded-3">${resultado.msg}</div>`;
            setTimeout(() => { alertaDiv.innerHTML = ""; }, 2500);
            renderizarCompleto();
        } else {
            alertaDiv.innerHTML = `<div class="alert-pastel-danger p-2 rounded-3">${resultado.msg}</div>`;
            setTimeout(() => { if(alertaDiv.innerHTML.includes(resultado.msg)) alertaDiv.innerHTML = ""; }, 2800);
        }
    });
    
    // Botón resolver incidencia
    const btnResolver = document.getElementById("btnResolver");
    const selectResolver = document.getElementById("selectResolver");
    
    btnResolver.addEventListener("click", () => {
        console.log("Botón resolver clickeado");
        const idSel = selectResolver.value;
        if (!idSel) {
            document.getElementById("msgResolver").innerHTML = '<span class="text-warning">⚠️ Elige una incidencia pendiente.</span>';
            setTimeout(() => {
                if(document.getElementById("msgResolver").innerHTML.includes("Elige")) {
                    document.getElementById("msgResolver").innerHTML = "";
                }
            }, 2000);
            return;
        }
        resolverIncidencia(parseInt(idSel));
    });
    
    // Botón refrescar
    document.getElementById("btnRecargarTabla").addEventListener("click", () => {
        console.log("Refrescando dashboard");
        renderizarCompleto();
        const temp = document.createElement("div");
        temp.className = "alert-pastel-success position-fixed bottom-0 end-0 m-3 p-2 px-3 rounded-3 shadow";
        temp.style.zIndex = "9999";
        temp.innerHTML = "<i class='fas fa-sync-alt me-1'></i> Dashboard actualizado";
        document.body.appendChild(temp);
        setTimeout(() => temp.remove(), 1500);
    });
});