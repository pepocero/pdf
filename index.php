<?php
// Configuración PHP
session_start();
$maxFileSize = 50 * 1024 * 1024; // 50MB
$allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];

// Crear directorios si no existen
if (!file_exists('uploads')) {
    mkdir('uploads', 0777, true);
}
if (!file_exists('saved_files')) {
    mkdir('saved_files', 0777, true);
}

// Información del servidor
$serverInfo = [
    'maxFileSize' => ini_get('upload_max_filesize'),
    'memoryLimit' => ini_get('memory_limit'),
    'postMaxSize' => ini_get('post_max_size'),
    'phpVersion' => phpversion()
];
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor PDF Avanzado</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📄</text></svg>">
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js" onerror="this.onerror=null; this.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js'"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"></script>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar con herramientas -->
        <div class="toolbar" id="toolbar">
            <button class="toolbar-toggle" id="toolbarToggle" title="Alternar modo compacto"></button>
            
            <!-- Sección de Inicio -->
            <div class="toolbar-section expanded">
                <div class="toolbar-section-header">
                    <div class="toolbar-section-label">HOME</div>
                    <div class="toolbar-section-toggle">▼</div>
                </div>
                <div class="toolbar-section-content">
                    <div class="tool-group">
                        <button id="selectTool" class="tool-btn active" data-tool="select" data-tooltip="Seleccionar">
                            <span class="icon">↖</span>
                            <span class="tool-btn-text">Seleccionar</span>
                        </button>
                        <button id="handTool" class="tool-btn" data-tool="hand" data-tooltip="Mano">
                            <span class="icon">✋</span>
                            <span class="tool-btn-text">Mano</span>
                        </button>
                        <button id="textSelectionTool" class="tool-btn" data-tool="textSelection" data-tooltip="Seleccionar Texto">
                            <span class="icon">📝</span>
                            <span class="tool-btn-text">Seleccionar Texto</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sección de Insertar -->
            <div class="toolbar-section">
                <div class="toolbar-section-header">
                    <div class="toolbar-section-label">INSERT</div>
                    <div class="toolbar-section-toggle">▼</div>
                </div>
                <div class="toolbar-section-content">
                    <div class="tool-group">
                        <button id="textBoxTool" class="tool-btn" data-tool="textBox" data-tooltip="Cuadro de Texto">
                            <span class="icon">📄</span>
                            <span class="tool-btn-text">Cuadro de Texto</span>
                        </button>
                        <button id="textAddTool" class="tool-btn" data-tool="textAdd" data-tooltip="Agregar Texto">
                            <span class="icon">T+</span>
                            <span class="tool-btn-text">Agregar Texto</span>
                        </button>
                        <button id="imageTool" class="tool-btn" data-tool="image" data-tooltip="Imagen">
                            <span class="icon">🖼</span>
                            <span class="tool-btn-text">Imagen</span>
                        </button>
                        <button id="highlightTool" class="tool-btn" data-tool="highlight" data-tooltip="Resaltar">
                            <span class="icon">🖍</span>
                            <span class="tool-btn-text">Resaltar</span>
                        </button>
                        <button id="stampTool" class="tool-btn" data-tool="stamp" data-tooltip="Sello">
                            <span class="icon">🏷</span>
                            <span class="tool-btn-text">Sello</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sección de Dibujo -->
            <div class="toolbar-section">
                <div class="toolbar-section-header">
                    <div class="toolbar-section-label">DRAW</div>
                    <div class="toolbar-section-toggle">▼</div>
                </div>
                <div class="toolbar-section-content">
                    <div class="tool-group">
                        <button id="drawTool" class="tool-btn" data-tool="draw" data-tooltip="Dibujar">
                            <span class="icon">✏</span>
                            <span class="tool-btn-text">Dibujar</span>
                        </button>
                        <button id="lineTool" class="tool-btn" data-tool="line" data-tooltip="Línea">
                            <span class="icon">📏</span>
                            <span class="tool-btn-text">Línea</span>
                        </button>
                        <button id="rectangleTool" class="tool-btn" data-tool="rectangle" data-tooltip="Rectángulo">
                            <span class="icon">⬜</span>
                            <span class="tool-btn-text">Rectángulo</span>
                        </button>
                        <button id="circleTool" class="tool-btn" data-tool="circle" data-tooltip="Círculo">
                            <span class="icon">⭕</span>
                            <span class="tool-btn-text">Círculo</span>
                        </button>
                        <button id="eraserTool" class="tool-btn" data-tool="eraser" data-tooltip="Borrador">
                            <span class="icon">🧽</span>
                            <span class="tool-btn-text">Borrador</span>
                        </button>
                        <input type="color" id="strokeColor" value="#000000" title="Color del trazo">
                        <input type="range" id="strokeWidth" min="1" max="20" value="2" title="Grosor del trazo">
                    </div>
                </div>
            </div>

            <!-- Sección de Formato -->
            <div class="toolbar-section">
                <div class="toolbar-section-header">
                    <div class="toolbar-section-label">FORMAT</div>
                    <div class="toolbar-section-toggle">▼</div>
                </div>
                <div class="toolbar-section-content">
                    <div class="tool-group">
                        <input type="color" id="textColor" value="#000000" title="Color del texto">
                        <input type="range" id="fontSize" min="8" max="72" value="16" title="Tamaño de fuente">
                        <select id="fontFamily">
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Georgia">Georgia</option>
                        </select>
                        <button id="boldBtn" class="tool-btn" title="Negrita" data-tooltip="Negrita">
                            <span class="icon">B</span>
                            <span class="tool-btn-text">Negrita</span>
                        </button>
                        <button id="italicBtn" class="tool-btn" title="Cursiva" data-tooltip="Cursiva">
                            <span class="icon">I</span>
                            <span class="tool-btn-text">Cursiva</span>
                        </button>
                        <button id="underlineBtn" class="tool-btn" title="Subrayado" data-tooltip="Subrayado">
                            <span class="icon">U</span>
                            <span class="tool-btn-text">Subrayado</span>
                        </button>
                        <button id="strikethroughBtn" class="tool-btn" title="Tachado" data-tooltip="Tachado">
                            <span class="icon">S</span>
                            <span class="tool-btn-text">Tachado</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sección de Edición -->
            <div class="toolbar-section">
                <div class="toolbar-section-header">
                    <div class="toolbar-section-label">EDIT</div>
                    <div class="toolbar-section-toggle">▼</div>
                </div>
                <div class="toolbar-section-content">
                    <div class="tool-group">
                        <button id="textEditTool" class="tool-btn" data-tool="textEdit" data-tooltip="Editar Texto">
                            <span class="icon">✏</span>
                            <span class="tool-btn-text">Editar Texto</span>
                        </button>
                        <button id="copyBtn" class="tool-btn" title="Copiar" data-tooltip="Copiar">
                            <span class="icon">📋</span>
                            <span class="tool-btn-text">Copiar</span>
                        </button>
                        <button id="cutBtn" class="tool-btn" title="Cortar" data-tooltip="Cortar">
                            <span class="icon">✂</span>
                            <span class="tool-btn-text">Cortar</span>
                        </button>
                        <button id="pasteBtn" class="tool-btn" title="Pegar" data-tooltip="Pegar">
                            <span class="icon">📌</span>
                            <span class="tool-btn-text">Pegar</span>
                        </button>
                        <button id="deleteBtn" class="tool-btn" title="Eliminar" data-tooltip="Eliminar">
                            <span class="icon">🗑</span>
                            <span class="tool-btn-text">Eliminar</span>
                        </button>
                        <button id="undoBtn" class="tool-btn" title="Deshacer" data-tooltip="Deshacer">
                            <span class="icon">↶</span>
                            <span class="tool-btn-text">Deshacer</span>
                        </button>
                        <button id="redoBtn" class="tool-btn" title="Rehacer" data-tooltip="Rehacer">
                            <span class="icon">↷</span>
                            <span class="tool-btn-text">Rehacer</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sección de Movimiento -->
            <div class="toolbar-section">
                <div class="toolbar-section-header">
                    <div class="toolbar-section-label">MOVE</div>
                    <div class="toolbar-section-toggle">▼</div>
                </div>
                <div class="toolbar-section-content">
                    <div class="tool-group">
                        <button id="rotateLeftBtn" class="tool-btn" title="Rotar izquierda" data-tooltip="Rotar izquierda">
                            <span class="icon">↶</span>
                            <span class="tool-btn-text">Rotar Izq</span>
                        </button>
                        <button id="rotateRightBtn" class="tool-btn" title="Rotar derecha" data-tooltip="Rotar derecha">
                            <span class="icon">↷</span>
                            <span class="tool-btn-text">Rotar Der</span>
                        </button>
                        <button id="flipHorizontalBtn" class="tool-btn" title="Voltear horizontal" data-tooltip="Voltear horizontal">
                            <span class="icon">↔</span>
                            <span class="tool-btn-text">Voltear H</span>
                        </button>
                        <button id="flipVerticalBtn" class="tool-btn" title="Voltear vertical" data-tooltip="Voltear vertical">
                            <span class="icon">↕</span>
                            <span class="tool-btn-text">Voltear V</span>
                        </button>
                        <button id="bringToFrontBtn" class="tool-btn" title="Traer al frente" data-tooltip="Traer al frente">
                            <span class="icon">⬆</span>
                            <span class="tool-btn-text">Al Frente</span>
                        </button>
                        <button id="sendToBackBtn" class="tool-btn" title="Enviar atrás" data-tooltip="Enviar atrás">
                            <span class="icon">⬇</span>
                            <span class="tool-btn-text">Atrás</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Paginación compacta -->
            <div class="pagination-compact">
                <div class="pagination-compact-header">Paginación</div>
                <div class="pagination-controls">
                    <button id="prevPageBtn" class="pagination-btn" title="Página anterior" data-tooltip="Página anterior">‹</button>
                    <div id="pageInfo" class="pagination-info">1/1</div>
                    <button id="nextPageBtn" class="pagination-btn" title="Página siguiente" data-tooltip="Página siguiente">›</button>
                </div>
            </div>
        </div>

        <!-- Contenedor principal -->
        <div class="main-wrapper">
            <!-- Header -->
            <header class="app-header">
                <div class="header-left">
                    <button id="burgerMenuBtn" class="burger-menu" title="Abrir menú">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                    <h1>Editor PDF Avanzado</h1>
                </div>
                <div class="header-controls">

                    <a href="../utilidades.php" class="btn btn-home" title="Volver al Panel de Utilidades">
                        🏠 Inicio
                    </a>
                    <input type="file" id="pdfInput" accept=".pdf" style="display: none;">
                    <button id="loadPdfBtn" class="btn btn-primary">Cargar PDF</button>
                    <button id="downloadPdfBtn" class="btn btn-secondary" disabled>Descargar</button>
                    
                    <!-- Controles de Zoom -->
                    <div class="zoom-controls">
                        <button id="zoomOutBtn" class="zoom-btn" title="Alejar" data-tooltip="Alejar">-</button>
                        <span id="zoomInfo" class="zoom-info">100%</span>
                        <button id="zoomInBtn" class="zoom-btn" title="Acercar" data-tooltip="Acercar">+</button>
                        <button id="resetZoomBtn" class="zoom-btn" title="Restablecer zoom al 100%" data-tooltip="Restablecer zoom">⌂</button>
                    </div>
                    
                    <button id="serverInfoBtn" class="btn btn-info" title="Información del desarrollador">ℹ️</button>
                </div>
            </header>

            <!-- Main Content -->
            <div class="main-content">
                <div class="pdf-viewer">
                    <div id="pdfContainer" class="pdf-pages-container">
                        <div id="loadingIndicator" class="loading" style="display: none;">
                            <div class="spinner"></div>
                            <p>Cargando PDF...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Overlay para móviles -->
        <div id="sidebarOverlay" class="sidebar-overlay"></div>
    </div>


    <!-- Hidden file input for images -->
    <input type="file" id="imageInput" accept="image/*" style="display: none;">

    <!-- Modal para información del desarrollador -->
    <div id="serverInfoModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Editor PDF Avanzado</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="server-info">
                    <div class="info-item">
                        <strong>Desarrollado por:</strong> Pepocero
                    </div>
                    <div class="info-item">
                        <strong>Descripción:</strong> Editor PDF profesional con herramientas avanzadas para edición, dibujo, inserción de elementos y manipulación de documentos PDF.
                    </div>
                    <div class="info-item">
                        <strong>Características:</strong>
                        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li>Edición de texto y formato</li>
                            <li>Herramientas de dibujo avanzadas</li>
                            <li>Inserción de imágenes y elementos</li>
                            <li>Resaltado y anotaciones</li>
                            <li>Transformación de objetos</li>
                            <li>Navegación por páginas</li>
                            <li>Control de zoom</li>
                        </ul>
                    </div>
                    <div class="info-item">
                        <strong>Contacto:</strong> <a href="mailto:pepocero@gmail.com" style="color: #3b82f6; text-decoration: none;">pepocero@gmail.com</a>
                    </div>
                    <div class="info-item">
                        <strong>PHP Version:</strong> <?php echo $serverInfo['phpVersion']; ?>
                    </div>
                    <div class="info-item">
                        <strong>Tamaño máximo de archivo:</strong> <?php echo $serverInfo['maxFileSize']; ?>
                    </div>
                    <div class="info-item">
                        <strong>Límite de memoria:</strong> <?php echo $serverInfo['memoryLimit']; ?>
                    </div>
                    <div class="info-item">
                        <strong>POST máximo:</strong> <?php echo $serverInfo['postMaxSize']; ?>
                    </div>
                    <div class="info-item">
                        <strong>Directorio de uploads:</strong> <?php echo is_writable('uploads') ? '✅ Escribible' : '❌ No escribible'; ?>
                    </div>
                    <div class="info-item">
                        <strong>Directorio de guardado:</strong> <?php echo is_writable('saved_files') ? '✅ Escribible' : '❌ No escribible'; ?>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="closeServerInfoBtn" class="btn btn-secondary">Cerrar</button>
            </div>
        </div>
    </div>

    <script src="js/pdf-editor-new.js"></script>
    <script>
        // Funcionalidad del sidebar (Escritorio y Móvil)
        document.addEventListener('DOMContentLoaded', function() {
            const toolbar = document.getElementById('toolbar');
            const toggleBtn = document.getElementById('toolbarToggle');
            const burgerBtn = document.getElementById('burgerMenuBtn');
            const overlay = document.getElementById('sidebarOverlay');
            
            // Toggle para Escritorio (Modo compacto)
            if (toggleBtn) {
                toggleBtn.addEventListener('click', function() {
                    toolbar.classList.toggle('compact');
                    const isCompact = toolbar.classList.contains('compact');
                    localStorage.setItem('toolbarCompact', isCompact);
                });
            }
            
            // Toggle Universal (Burger Menu)
            if (burgerBtn) {
                burgerBtn.addEventListener('click', function() {
                    if (window.innerWidth <= 768) {
                        toolbar.classList.toggle('mobile-open');
                        overlay.classList.toggle('active');
                    } else {
                        toolbar.classList.toggle('compact');
                        const isCompact = toolbar.classList.contains('compact');
                        localStorage.setItem('toolbarCompact', isCompact);
                    }
                });
            }
            
            // Cerrar menú móvil al hacer clic en el overlay
            if (overlay) {
                overlay.addEventListener('click', function() {
                    toolbar.classList.remove('mobile-open');
                    overlay.classList.remove('active');
                });
            }
            
            // Cerrar menú móvil al hacer clic en cualquier botón de herramienta (opcional, para conveniencia)
            const toolBtns = document.querySelectorAll('.tool-btn');
            toolBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    if (window.innerWidth <= 768) {
                        toolbar.classList.remove('mobile-open');
                        overlay.classList.remove('active');
                    }
                });
            });

            
            // Cargar preferencia guardada de escritorio
            const savedCompact = localStorage.getItem('toolbarCompact');
            if (savedCompact === 'true') {
                toolbar.classList.add('compact');
            }
            
            // Funcionalidad de submenús desplegables
            const sectionHeaders = document.querySelectorAll('.toolbar-section-header');
            sectionHeaders.forEach(header => {
                header.addEventListener('click', function() {
                    const section = this.parentElement;
                    section.classList.toggle('expanded');
                });
            });
        });

    </script>
</body>
</html>
