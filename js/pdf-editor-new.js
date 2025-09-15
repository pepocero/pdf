class PDFEditor {
    constructor() {
        this.currentTool = 'select';
        this.pdfDocument = null;
        this.pdfLibDoc = null;
        this.pdfPages = [];
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoom = 1;
        this.highlights = []; // Array para almacenar resaltados persistentes
        this.drawings = []; // Array para almacenar dibujos persistentes
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.selectedText = '';
        this.textSelections = [];
        this.isEditingText = false;
        this.editingElement = null;
        this.isDrawing = false;
        this.drawingPoints = [];
        this.drawings = [];
        this.isPanning = false;
        this.panStart = null;
        this.clipboard = null;
        this.history = [];
        this.historyIndex = -1;
        this.selectedElement = null;
        this.isAddingText = false;
        this.isEditingTextBox = false;
        this.selectedShape = null; // Para manejar formas seleccionadas
        this.isDraggingShape = false; // Para arrastrar formas
        this.dragOffset = { x: 0, y: 0 }; // Offset del arrastre
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPDFJS();
        this.checkPDFLibAvailability();
        this.loadHighlightsFromStorage();
        this.loadDrawingsFromStorage();
    }
    
    // Funciones para localStorage
    saveHighlightsToStorage() {
        try {
            localStorage.setItem('pdfEditor_highlights', JSON.stringify(this.highlights));
            console.log('Resaltados guardados en localStorage:', this.highlights.length);
        } catch (error) {
            console.error('Error guardando resaltados:', error);
        }
    }
    
    loadHighlightsFromStorage() {
        try {
            const saved = localStorage.getItem('pdfEditor_highlights');
            if (saved) {
                this.highlights = JSON.parse(saved);
                console.log('Resaltados cargados desde localStorage:', this.highlights.length);
                // Restaurar resaltados después de un pequeño delay para asegurar que el DOM esté listo
                setTimeout(() => {
                    this.restoreAllHighlights();
                }, 500);
            }
        } catch (error) {
            console.error('Error cargando resaltados:', error);
            this.highlights = [];
        }
    }
    
    clearHighlightsFromStorage() {
        try {
            localStorage.removeItem('pdfEditor_highlights');
            this.highlights = [];
            console.log('Resaltados eliminados de localStorage');
        } catch (error) {
            console.error('Error eliminando resaltados:', error);
        }
    }
    
    // Función para limpiar todos los resaltados del DOM
    clearAllHighlights() {
        // Limpiar del DOM
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
            if (overlay) {
                const highlights = overlay.querySelectorAll('.highlight-overlay');
                highlights.forEach(highlight => highlight.remove());
            }
        }
        
        // Limpiar del array
        this.highlights = [];
        
        console.log('Todos los resaltados limpiados del DOM y array');
    }
    
    // Funciones para dibujos con localStorage
    saveDrawingsToStorage() {
        try {
            localStorage.setItem('pdfEditor_drawings', JSON.stringify(this.drawings));
            console.log('Dibujos guardados en localStorage:', this.drawings.length);
        } catch (error) {
            console.error('Error guardando dibujos:', error);
        }
    }
    
    loadDrawingsFromStorage() {
        try {
            const saved = localStorage.getItem('pdfEditor_drawings');
            if (saved) {
                this.drawings = JSON.parse(saved);
                console.log('Dibujos cargados desde localStorage:', this.drawings.length);
                // Restaurar dibujos después de un pequeño delay
                setTimeout(() => {
                    this.restoreAllDrawings();
                }, 500);
            }
        } catch (error) {
            console.error('Error cargando dibujos:', error);
            this.drawings = [];
        }
    }
    
    clearDrawingsFromStorage() {
        try {
            localStorage.removeItem('pdfEditor_drawings');
            this.drawings = [];
            console.log('Dibujos eliminados de localStorage');
        } catch (error) {
            console.error('Error eliminando dibujos:', error);
        }
    }
    
    // Función para limpiar todos los dibujos del DOM
    clearAllDrawings() {
        // Limpiar del DOM
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
            if (overlay) {
                // Limpiar contenedores SVG completos
                const svgContainers = overlay.querySelectorAll('svg.drawing-container');
                svgContainers.forEach(container => container.remove());
                
                // Limpiar también los previews de dibujo
                const drawingPreviews = overlay.querySelectorAll('svg.drawing-preview');
                drawingPreviews.forEach(container => container.remove());
                
                // Limpiar también los previews de formas
                const shapePreviews = overlay.querySelectorAll('svg.shape-preview');
                shapePreviews.forEach(container => container.remove());
            }
        }
        
        // Limpiar del array
        this.drawings = [];
        
        console.log('Todos los dibujos limpiados del DOM y array');
    }
    
    // Función para restaurar todos los dibujos
    restoreAllDrawings() {
        if (!this.drawings || this.drawings.length === 0) return;
        
        console.log('Restaurando todos los dibujos:', this.drawings.length);
        
        this.drawings.forEach(drawingData => {
            const overlay = document.querySelector(`#page-${drawingData.pageNum} .pdf-page-overlay`);
            if (overlay) {
                // Verificar si el dibujo ya existe
                if (!document.getElementById(drawingData.id)) {
                    // Crear o obtener el contenedor SVG
                    let svgContainer = overlay.querySelector('svg.drawing-container');
                    if (!svgContainer) {
                        svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svgContainer.setAttribute('class', 'drawing-container');
                        svgContainer.style.position = 'absolute';
                        svgContainer.style.top = '0';
                        svgContainer.style.left = '0';
                        svgContainer.style.width = '100%';
                        svgContainer.style.height = '100%';
                        svgContainer.style.pointerEvents = 'none';
                        svgContainer.style.zIndex = '5';
                        overlay.appendChild(svgContainer);
                    }
                    
                    // Aplicar transform de escala al contenedor SVG
                    svgContainer.style.transform = `scale(${this.zoom})`;
                    svgContainer.style.transformOrigin = 'top left';
                    
                    let drawingElement;
                    
                    // Usar coordenadas originales (el SVG se escalará automáticamente)
                    
                    // Crear elemento según el tipo
                    if (drawingData.type === 'path') {
                        drawingElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        drawingElement.setAttribute('d', drawingData.pathData);
                        drawingElement.style.stroke = drawingData.stroke;
                        drawingElement.style.strokeWidth = drawingData.strokeWidth;
                        drawingElement.style.fill = drawingData.fill || 'none';
                    } else if (drawingData.type === 'line') {
                        drawingElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        drawingElement.setAttribute('x1', drawingData.x1);
                        drawingElement.setAttribute('y1', drawingData.y1);
                        drawingElement.setAttribute('x2', drawingData.x2);
                        drawingElement.setAttribute('y2', drawingData.y2);
                        drawingElement.style.stroke = drawingData.stroke;
                        drawingElement.style.strokeWidth = drawingData.strokeWidth;
                    } else if (drawingData.type === 'rectangle') {
                        drawingElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        drawingElement.setAttribute('x', drawingData.x);
                        drawingElement.setAttribute('y', drawingData.y);
                        drawingElement.setAttribute('width', drawingData.width);
                        drawingElement.setAttribute('height', drawingData.height);
                        drawingElement.style.stroke = drawingData.stroke;
                        drawingElement.style.strokeWidth = drawingData.strokeWidth;
                        drawingElement.style.fill = drawingData.fill || 'none';
                    } else if (drawingData.type === 'circle') {
                        drawingElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        drawingElement.setAttribute('cx', drawingData.cx);
                        drawingElement.setAttribute('cy', drawingData.cy);
                        drawingElement.setAttribute('r', drawingData.r);
                        drawingElement.style.stroke = drawingData.stroke;
                        drawingElement.style.strokeWidth = drawingData.strokeWidth;
                        drawingElement.style.fill = drawingData.fill || 'none';
                    }
                    
                    if (drawingElement) {
                        drawingElement.id = drawingData.id;
                        drawingElement.setAttribute('class', `drawing-${drawingData.type}`);
                        drawingElement.style.pointerEvents = 'auto';
                        drawingElement.style.cursor = 'pointer';
                        
                        // Agregar evento de click para borrar
                        drawingElement.addEventListener('click', (e) => {
                            console.log('Click detectado en dibujo restaurado:', drawingElement.id, 'herramienta actual:', this.currentTool);
                            if (this.currentTool === 'eraser') {
                                e.stopPropagation();
                                e.preventDefault();
                                this.removeDrawing(drawingElement.id);
                            }
                        });
                        
                        // También agregar mousedown para mejor detección
                        drawingElement.addEventListener('mousedown', (e) => {
                            console.log('Mousedown detectado en dibujo restaurado:', drawingElement.id, 'herramienta actual:', this.currentTool);
                            if (this.currentTool === 'eraser') {
                                e.stopPropagation();
                                e.preventDefault();
                                this.removeDrawing(drawingElement.id);
                            }
                        });
                        
                        svgContainer.appendChild(drawingElement);
                    }
                }
            }
        });
    }
    
    // Función para eliminar un dibujo específico
    removeDrawing(drawingId) {
        console.log('Intentando eliminar dibujo:', drawingId);
        console.log('Dibujos actuales en array:', this.drawings.length);
        console.log('Dibujos en DOM:', document.querySelectorAll('.drawing-path, .drawing-line, .drawing-rectangle, .drawing-circle').length);
        
        // Encontrar el dibujo en el array
        const index = this.drawings.findIndex(d => d.id === drawingId);
        console.log('Índice encontrado en array:', index);
        
        if (index !== -1) {
            // Eliminar del array
            this.drawings.splice(index, 1);
            // Guardar en localStorage
            this.saveDrawingsToStorage();
            console.log('Dibujo eliminado del array:', drawingId);
            console.log('Dibujos restantes en array:', this.drawings.length);
        } else {
            console.log('Dibujo no encontrado en array:', drawingId);
        }
        
        // Eliminar del DOM
        const drawingElement = document.getElementById(drawingId);
        console.log('Elemento encontrado en DOM:', drawingElement);
        
        if (drawingElement) {
            drawingElement.remove();
            this.showNotification('Dibujo eliminado', 'success');
            console.log('Dibujo eliminado del DOM:', drawingId);
            console.log('Dibujos restantes en DOM:', document.querySelectorAll('.drawing-path, .drawing-line, .drawing-rectangle, .drawing-circle').length);
        } else {
            console.log('Elemento no encontrado en DOM:', drawingId);
        }
    }
    
    // Función para restaurar todos los resaltados
    restoreAllHighlights() {
        if (!this.highlights || this.highlights.length === 0) return;
        
        console.log('Restaurando todos los resaltados:', this.highlights.length);
        
        this.highlights.forEach(highlightData => {
            const overlay = document.querySelector(`#page-${highlightData.pageNum} .pdf-page-overlay`);
            if (overlay) {
                // Verificar si el resaltado ya existe
                if (!document.getElementById(highlightData.id)) {
                    const highlightDiv = document.createElement('div');
                    highlightDiv.className = 'highlight-overlay';
                    highlightDiv.id = highlightData.id;
                    
                    // Ajustar coordenadas según el zoom actual
                    const zoomRatio = this.zoom / highlightData.zoom;
                    
                    highlightDiv.style.cssText = `
                        position: absolute;
                        left: ${highlightData.left * zoomRatio}px;
                        top: ${highlightData.top * zoomRatio}px;
                        width: ${highlightData.width * zoomRatio}px;
                        height: ${highlightData.height * zoomRatio}px;
                        background-color: rgba(255, 255, 0, 0.4);
                        border: none;
                        pointer-events: auto;
                        z-index: 10;
                        border-radius: 2px;
                        cursor: pointer;
                    `;
                    
                    // Agregar evento de click directo al highlight restaurado
                    highlightDiv.addEventListener('click', (e) => {
                        if (this.currentTool === 'eraser') {
                            e.stopPropagation();
                            this.removeHighlight(highlightDiv.id);
                        }
                    });
                    
                    overlay.appendChild(highlightDiv);
                }
            }
        });
    }

    checkPDFLibAvailability() {
        if (typeof PDFLib === 'undefined') {
            console.warn('PDF-lib no está disponible. Solo funcionará la visualización.');
            this.showNotification('PDF-lib no está disponible. Funcionalidad limitada.', 'warning');
        } else {
            console.log('PDF-lib está disponible correctamente.');
        }
    }

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    setupPDFJS() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    setupEventListeners() {
        // Carga de PDF
        document.getElementById('loadPdfBtn').addEventListener('click', () => {
            document.getElementById('pdfInput').click();
        });

        document.getElementById('pdfInput').addEventListener('change', (e) => {
            this.loadPDF(e.target.files[0]);
        });

        // Herramientas
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.closest('.tool-btn').dataset.tool);
            });
        });

        // Controles de texto
        document.getElementById('textColor').addEventListener('change', (e) => {
            this.updateTextStyle('color', e.target.value);
        });

        document.getElementById('fontSize').addEventListener('input', (e) => {
            this.updateTextStyle('fontSize', parseInt(e.target.value));
        });

        document.getElementById('fontFamily').addEventListener('change', (e) => {
            this.updateTextStyle('fontFamily', e.target.value);
        });

        document.getElementById('boldBtn').addEventListener('click', () => {
            this.toggleTextStyle('fontWeight');
        });

        document.getElementById('italicBtn').addEventListener('click', () => {
            this.toggleTextStyle('fontStyle');
        });

        document.getElementById('underlineBtn').addEventListener('click', () => {
            this.toggleTextStyle('textDecoration');
        });

        document.getElementById('strikethroughBtn').addEventListener('click', () => {
            this.toggleTextStyle('textDecoration');
        });

        // Navegación de páginas
        document.getElementById('prevPageBtn').addEventListener('click', () => {
            this.previousPage();
        });

        document.getElementById('nextPageBtn').addEventListener('click', () => {
            this.nextPage();
        });

        // Controles de dibujo
        document.getElementById('strokeColor').addEventListener('change', (e) => {
            this.setDrawingColor(e.target.value);
        });

        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            this.setDrawingWidth(parseInt(e.target.value));
        });

        // Herramientas de edición
        document.getElementById('copyBtn').addEventListener('click', () => this.copySelection());
        document.getElementById('cutBtn').addEventListener('click', () => this.cutSelection());
        document.getElementById('pasteBtn').addEventListener('click', () => this.pasteSelection());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteSelection());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());

        // Herramientas de transformación
        document.getElementById('rotateLeftBtn').addEventListener('click', () => this.rotateElement());
        document.getElementById('rotateRightBtn').addEventListener('click', () => this.rotateElement());
        document.getElementById('flipHorizontalBtn').addEventListener('click', () => this.flipHorizontal());
        document.getElementById('flipVerticalBtn').addEventListener('click', () => this.flipVertical());
        document.getElementById('bringToFrontBtn').addEventListener('click', () => this.bringToFront());
        document.getElementById('sendToBackBtn').addEventListener('click', () => this.sendToBack());

        // Controles de página
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetZoomBtn').addEventListener('click', () => this.resetZoom());

        // Carga de imágenes
        document.getElementById('imageTool').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });

        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.loadImageFile(e.target.files[0]);
        });

        // Guardado
        document.getElementById('downloadPdfBtn').addEventListener('click', () => this.downloadPDF());

        
        // Información del servidor
        document.getElementById('serverInfoBtn').addEventListener('click', () => this.showServerInfoModal());
        document.getElementById('closeServerInfoBtn').addEventListener('click', () => this.hideServerInfoModal());
        
        // Botón de prueba para selección de texto
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.testTextSelection();
            }
        });
        
        // Cerrar modales
        
        document.getElementById('serverInfoModal').addEventListener('click', (e) => {
            if (e.target.id === 'serverInfoModal') {
                this.hideServerInfoModal();
            }
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async loadPDF(file) {
        if (!file) return;

        this.showLoading(true);
        
        // Limpiar resaltados y dibujos anteriores al cargar nuevo PDF
        this.clearAllHighlights();
        this.clearHighlightsFromStorage();
        this.clearAllDrawings();
        this.clearDrawingsFromStorage();
        
        try {
            // Leer el archivo como ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Crear copias independientes del ArrayBuffer para cada librería
            // Usar diferentes métodos para evitar problemas de "detached"
            const arrayBufferForPDFJS = arrayBuffer.slice(0);
            const arrayBufferForPDFLib = new ArrayBuffer(arrayBuffer.byteLength);
            new Uint8Array(arrayBufferForPDFLib).set(new Uint8Array(arrayBuffer));
            
            // Cargar con PDF.js para visualización
            console.log('Cargando PDF con PDF.js...');
            this.pdfDocument = await pdfjsLib.getDocument({ data: arrayBufferForPDFJS }).promise;
            this.totalPages = this.pdfDocument.numPages;
            console.log(`PDF cargado con PDF.js. Páginas: ${this.totalPages}`);
            
            // Cargar con PDF-lib para manipulación (si está disponible)
            if (typeof PDFLib !== 'undefined') {
                try {
                    console.log('Cargando PDF con PDF-lib...');
                    
                    // Intentar con ArrayBuffer primero
                    this.pdfLibDoc = await PDFLib.PDFDocument.load(arrayBufferForPDFLib);
                    console.log('PDF cargado con PDF-lib correctamente');
                } catch (pdfLibError) {
                    console.warn('Error con ArrayBuffer, intentando con FileReader...');
                    try {
                        // Fallback: usar FileReader
                        const arrayBufferFromReader = await this.readFileAsArrayBuffer(file);
                        this.pdfLibDoc = await PDFLib.PDFDocument.load(arrayBufferFromReader);
                        console.log('PDF cargado con PDF-lib usando FileReader');
                    } catch (readerError) {
                        console.warn('Error con FileReader:', readerError);
                        this.pdfLibDoc = null;
                    }
                }
            } else {
                console.log('PDF-lib no está disponible, saltando carga...');
                this.pdfLibDoc = null;
            }
            
            await this.renderAllPages();
            this.createTextLayersForAllPages();
            this.updatePageInfo();
            this.enableControls();
            
            if (this.pdfLibDoc) {
                this.showNotification('PDF cargado correctamente', 'success');
            } else {
                this.showNotification('PDF cargado (solo visualización)', 'warning');
            }
        } catch (error) {
            this.showNotification('Error al cargar el PDF: ' + error.message, 'error');
            console.error('Error loading PDF:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async createTextLayersForAllPages() {
        if (!this.pdfDocument) return;
        
        try {
            // Limpiar capas existentes primero
            this.clearAllTextLayers();
            
            // Crear capas de texto para todas las páginas
            for (let pageNum = 1; pageNum <= this.pdfDocument.numPages; pageNum++) {
                try {
                    await this.createTextLayer(pageNum);
                } catch (error) {
                    console.warn(`Error creando capa de texto para página ${pageNum}:`, error);
                    // Continuar con la siguiente página
                }
            }
            console.log(`Capas de texto creadas para ${this.pdfDocument.numPages} páginas`);
        } catch (error) {
            console.error('Error general creando capas de texto:', error);
        }
    }
    
    clearAllTextLayers() {
        // Limpiar todas las capas de texto de todas las páginas
        const allPages = document.querySelectorAll('[id^="page-"]');
        allPages.forEach(pageContainer => {
            const textLayers = pageContainer.querySelectorAll('.precise-text-layer, .working-text-layer, .simple-text-layer, .textLayer');
            textLayers.forEach(layer => layer.remove());
        });
        console.log('Capas de texto existentes limpiadas');
    }

    async renderAllPages() {
        const container = document.getElementById('pdfContainer');
        container.innerHTML = '';
        
        this.pdfPages = [];
        
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.zoom });
            
            // Crear wrapper para la página
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'pdf-page-wrapper';
            pageWrapper.id = `page-${pageNum}`;
            
            // Crear canvas para el PDF
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas';
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Crear overlay para interacciones
            const overlay = document.createElement('div');
            overlay.className = 'pdf-page-overlay';
            overlay.style.width = viewport.width + 'px';
            overlay.style.height = viewport.height + 'px';
            
            // Renderizar página
            const context = canvas.getContext('2d');
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Agregar eventos al overlay
            this.setupPageEvents(overlay, pageNum);
            
            pageWrapper.appendChild(canvas);
            pageWrapper.appendChild(overlay);
            container.appendChild(pageWrapper);
            
            this.pdfPages.push({
                pageNum,
                canvas,
                overlay,
                viewport,
                page
            });
        }
        
        // Recrear capas de texto si la selección de texto está activa
        if (this.currentTool === 'textSelection') {
            // Esperar un poco para que se complete el renderizado
            setTimeout(() => {
                this.createTextLayersForAllPages();
            }, 100);
        }
    }

    setupPageEvents(overlay, pageNum) {
        overlay.addEventListener('mousedown', (e) => this.onPageMouseDown(e, pageNum));
        overlay.addEventListener('mousemove', (e) => this.onPageMouseMove(e, pageNum));
        overlay.addEventListener('mouseup', (e) => this.onPageMouseUp(e, pageNum));
        overlay.addEventListener('click', (e) => this.onPageClick(e, pageNum));
        overlay.addEventListener('dblclick', (e) => this.onPageDoubleClick(e, pageNum));
        
        // Eventos táctiles
        overlay.addEventListener('touchstart', (e) => this.onPageTouchStart(e, pageNum));
        overlay.addEventListener('touchmove', (e) => this.onPageTouchMove(e, pageNum));
        overlay.addEventListener('touchend', (e) => this.onPageTouchEnd(e, pageNum));
    }

    setTool(tool) {
        // Si se cambia de herramienta, desactivar selección de texto
        if (this.currentTool === 'textSelection' && tool !== 'textSelection') {
            this.disableAllTextSelection();
        }
        
        // Si se cambia de herramienta mientras se está dibujando, limpiar el preview
        if (this.isDrawing && tool !== 'draw') {
            this.clearDrawingPreview(this.currentPage);
            this.isDrawing = false;
            this.currentDrawing = [];
        }
        
        // Si se cambia de herramienta mientras se está dibujando una forma, limpiar el preview
        if (this.isDrawingShape && !['line', 'rectangle', 'circle'].includes(tool)) {
            this.clearShapePreview(this.currentPage);
            this.isDrawingShape = false;
            this.currentShape = null;
        }
        
        // Deseleccionar forma si se cambia de herramienta
        if (this.selectedShape && tool !== 'select') {
            this.deselectShape();
        }
        
        // Remover clase activa de todas las herramientas
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activar herramienta seleccionada
        const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }
        
        this.currentTool = tool;
        
        // Limpiar selecciones previas
        this.clearSelections();
        this.clearTextSelections();
        
        this.configureTool(tool);
        
        console.log(`Herramienta activada: ${tool}`);
    }
    
    disableAllTextSelection() {
        // Limpiar todas las capas de texto primero
        this.clearAllTextLayers();
        
        // Desactivar selección de texto en todas las páginas
        const allOverlays = document.querySelectorAll('.pdf-page-overlay');
        allOverlays.forEach(overlay => {
            if (overlay.classList.contains('text-selection-mode')) {
                overlay.classList.remove('text-selection-mode');
            }
        });
        
        // Limpiar cualquier selección existente
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        
        console.log('Selección de texto desactivada en todas las páginas');
    }

    clearTextSelections() {
        // Limpiar todas las selecciones de texto visuales
        document.querySelectorAll('.text-selection-overlay').forEach(selection => {
            selection.remove();
        });
        
        // Limpiar estado de selección
        this.isSelecting = false;
        this.selectedText = '';
        this.selectionStart = null;
        this.selectionEnd = null;
    }

    configureTool(tool) {
        // Cambiar cursor según la herramienta
        const overlays = document.querySelectorAll('.pdf-page-overlay');
        overlays.forEach(overlay => {
            overlay.className = 'pdf-page-overlay';
            
            // Configurar selección de texto nativa
            if (tool === 'textSelection') {
                this.enableTextSelection(overlay);
            } else {
                this.disableTextSelection(overlay);
            }
            
            switch (tool) {
                case 'select':
                    overlay.style.cursor = 'default';
                    break;
                case 'textSelection':
                    overlay.style.cursor = 'text';
                    break;
                case 'hand':
                    overlay.style.cursor = 'grab';
                    break;
                case 'textEdit':
                    overlay.style.cursor = 'text';
                    break;
                case 'textBox':
                    overlay.style.cursor = 'crosshair';
                    break;
                case 'textAdd':
                    overlay.style.cursor = 'crosshair';
                    break;
                case 'draw':
                case 'line':
                case 'rectangle':
                case 'circle':
                    overlay.style.cursor = 'crosshair';
                    break;
                case 'image':
                    overlay.style.cursor = 'copy';
                    break;
                case 'highlight':
                    overlay.style.cursor = 'crosshair';
                    break;
                case 'eraser':
                    overlay.style.cursor = 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2LjI0IDMuNTZMMjAuNDQgNy43NkMyMS4wMyA4LjM1IDIxLjAzIDkuMjggMjAuNDQgOS44N0wxMy41NCAxNi43N0MxMy4yNSAxNy4wNiAxMi44NSAxNy4yMiAxMi40NCAxNy4yMkg3LjU2QzYuOTcgMTcuMjIgNi41IDE2Ljc1IDYuNSAxNi4xNlY5Ljg0QzYuNSA5LjQzIDYuNjYgOS4wMyA2Ljk1IDguNzRMMTMuODUgMS44NEMxNC40NCAxLjI1IDE1LjM3IDEuMjUgMTUuOTYgMS44NEwxNi4yNCAzLjU2WiIgZmlsbD0iIzMzMzMzMyIvPgo8L3N2Zz4K"), auto';
                    break;
                default:
                    overlay.style.cursor = 'default';
            }
        });
    }

    enableTextSelection(overlay) {
        console.log('Overlay ID:', overlay.id);
        console.log('Overlay classes:', overlay.className);
        
        // Intentar diferentes métodos para obtener el número de página
        let pageNum = null;
        
        // Método 1: Buscar en el ID del overlay
        if (overlay.id) {
            const idParts = overlay.id.split('-');
            if (idParts.length >= 2) {
                pageNum = parseInt(idParts[1]);
            }
        }
        
        // Método 2: Buscar en el contenedor padre
        if (!pageNum || isNaN(pageNum)) {
            const parentContainer = overlay.closest('[id^="page-"]');
            if (parentContainer) {
                const parentIdParts = parentContainer.id.split('-');
                if (parentIdParts.length >= 2) {
                    pageNum = parseInt(parentIdParts[1]);
                }
            }
        }
        
        // Método 3: Buscar en todos los overlays y encontrar el índice
        if (!pageNum || isNaN(pageNum)) {
            const allOverlays = document.querySelectorAll('.pdf-page-overlay');
            for (let i = 0; i < allOverlays.length; i++) {
                if (allOverlays[i] === overlay) {
                    pageNum = i + 1; // Los números de página empiezan en 1
                    break;
                }
            }
        }
        
        console.log('Número de página detectado:', pageNum);
        
        // Agregar clase CSS para modo selección de texto
        overlay.classList.add('text-selection-mode');
        
        // Habilitar selección de texto solo en la capa de texto
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
        
        // Crear capa de texto simple y funcional
        if (pageNum && !isNaN(pageNum) && pageNum >= 1 && pageNum <= this.pdfDocument.numPages) {
            // Usar método preciso en lugar de PDF.js TextLayer
            this.createPreciseTextLayer(pageNum);
        } else {
            console.warn('Número de página inválido:', pageNum);
            console.warn('Total de páginas disponibles:', this.pdfDocument.numPages);
        }
    }

    async createWorkingTextLayer(pageNum) {
        try {
            console.log('Creando capa de texto para página:', pageNum);
            
            if (!this.pdfDocument) {
                console.error('PDF document no disponible');
                return;
            }
            
            const pageContainer = document.getElementById(`page-${pageNum}`);
            if (!pageContainer) {
                console.error('Contenedor de página no encontrado:', `page-${pageNum}`);
                return;
            }
            
            // Remover capas existentes
            const existingLayers = pageContainer.querySelectorAll('.working-text-layer, .simple-text-layer, .textLayer');
            existingLayers.forEach(layer => layer.remove());
            
            // Obtener página y viewport
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.zoom });
            
            // Crear contenedor de texto usando PDF.js TextLayer
            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            textLayerDiv.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                right: 0;
                bottom: 0;
                overflow: hidden;
                opacity: 0.2;
                line-height: 1;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                pointer-events: auto;
                z-index: 999;
                color: transparent;
                background: transparent;
                transform: scale(${this.zoom});
                transform-origin: top left;
            `;
            
            // Obtener contenido de texto
            const textContent = await page.getTextContent();
            
            // Crear la capa de texto usando PDF.js con viewport sin zoom
            const baseViewport = page.getViewport({ scale: 1 });
            const textLayer = new pdfjsLib.TextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: baseViewport, // Usar viewport base sin zoom
                textDivs: []
            });
            
            // Renderizar la capa de texto
            textLayer.render();
            
            console.log('Capa de texto PDF.js creada para página:', pageNum);
            
            // Agregar eventos de selección
            textLayerDiv.addEventListener('mouseup', () => {
                setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    if (selectedText) {
                        this.selectedText = selectedText;
                        console.log('Texto seleccionado:', selectedText);
                        this.showNotification(`Texto seleccionado: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`, 'success');
                    }
                }, 10);
            });
            
            // Agregar evento de teclado para copiar
            textLayerDiv.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    if (selectedText) {
                        e.preventDefault();
                        this.copyTextToClipboard(selectedText);
                    }
                }
            });
            
            pageContainer.appendChild(textLayerDiv);
            console.log('Capa de texto creada exitosamente para página:', pageNum);
            this.showNotification('Selección de texto activada', 'success');
            
        } catch (error) {
            console.error('Error creando capa de texto PDF.js:', error);
            // Fallback: crear capa simple
            this.createSimpleTextLayerFallback(pageNum);
        }
    }
    
    async createPreciseTextLayer(pageNum) {
        try {
            console.log('Creando capa de texto precisa para página:', pageNum);
            
            if (!this.pdfDocument) return;
            
            const pageContainer = document.getElementById(`page-${pageNum}`);
            if (!pageContainer) return;
            
            // Remover capas existentes
            const existingLayers = pageContainer.querySelectorAll('.working-text-layer, .simple-text-layer, .textLayer');
            existingLayers.forEach(layer => layer.remove());
            
            // Obtener página y viewports
            const page = await this.pdfDocument.getPage(pageNum);
            const baseViewport = page.getViewport({ scale: 1 });
            const scaledViewport = page.getViewport({ scale: this.zoom });
            
            // Obtener contenido de texto
            const textContent = await page.getTextContent();
            
            // Crear contenedor principal
            const textContainer = document.createElement('div');
            textContainer.className = 'precise-text-layer';
            textContainer.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: ${scaledViewport.width}px;
                height: ${scaledViewport.height}px;
                pointer-events: auto;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                cursor: text;
                background: transparent;
                z-index: 999;
                overflow: hidden;
            `;
            
            // Crear elementos de texto posicionados exactamente
            let textElementsCreated = 0;
            textContent.items.forEach((item, index) => {
                if (item.str && item.str.trim()) {
                    // Calcular posición exacta usando coordenadas base y aplicando zoom
                    const x = item.transform[4] * this.zoom;
                    const y = (baseViewport.height - item.transform[5] - Math.abs(item.transform[3])) * this.zoom;
                    
                    // Solo crear si está dentro de los límites
                    if (x >= 0 && y >= 0 && x < scaledViewport.width && y < scaledViewport.height) {
                        const textSpan = document.createElement('span');
                        textSpan.style.cssText = `
                            position: absolute;
                            left: ${x}px;
                            top: ${y}px;
                            color: rgba(0, 0, 0, 0.01);
                            font-size: ${Math.abs(item.transform[0]) * this.zoom}px;
                            font-family: Arial, sans-serif;
                            user-select: text;
                            -webkit-user-select: text;
                            -moz-user-select: text;
                            -ms-user-select: text;
                            pointer-events: auto;
                            cursor: text;
                            white-space: pre;
                            background: transparent;
                            transform: scale(${item.transform[0] / Math.abs(item.transform[0])}, ${item.transform[3] / Math.abs(item.transform[3])});
                            transform-origin: left top;
                        `;
                        textSpan.textContent = item.str;
                        textContainer.appendChild(textSpan);
                        textElementsCreated++;
                        
                        // Log para debugging (solo los primeros 5)
                        if (textElementsCreated <= 5) {
                            console.log(`Texto ${textElementsCreated}: "${item.str}" en (${x}, ${y}) - Zoom: ${this.zoom}x`);
                        }
                    }
                }
            });
            
            // Agregar eventos de selección
            textContainer.addEventListener('mouseup', () => {
                setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    if (selectedText) {
                        this.selectedText = selectedText;
                        console.log('Texto seleccionado (preciso):', selectedText);
                        this.showNotification(`Texto seleccionado: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`, 'success');
                    }
                }, 10);
            });
            
            // Agregar evento de teclado para copiar
            textContainer.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    if (selectedText) {
                        e.preventDefault();
                        this.copyTextToClipboard(selectedText);
                    }
                }
            });
            
            pageContainer.appendChild(textContainer);
            console.log(`Creados ${textElementsCreated} elementos de texto precisos para página ${pageNum}`);
            this.showNotification('Selección de texto precisa activada', 'success');
            
        } catch (error) {
            console.error(`Error creando capa de texto precisa para página ${pageNum}:`, error);
        }
    }
    
    async createSimpleTextLayerFallback(pageNum) {
        try {
            if (!this.pdfDocument) return;
            
            const page = await this.pdfDocument.getPage(pageNum);
            const pageContainer = document.getElementById(`page-${pageNum}`);
            if (!pageContainer) return;
            
            // Obtener contenido de texto
            const textContent = await page.getTextContent();
            
            // Crear contenedor simple
            const textContainer = document.createElement('div');
            textContainer.className = 'simple-text-layer';
            textContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                color: rgba(0, 0, 0, 0.01);
                font-size: 12px;
                line-height: 1.2;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                pointer-events: auto;
                cursor: text;
                padding: 10px;
                box-sizing: border-box;
                background: transparent;
                z-index: 999;
            `;
            
            // Extraer todo el texto
            let fullText = '';
            textContent.items.forEach(item => {
                if (item.str && item.str.trim()) {
                    fullText += item.str + ' ';
                }
            });
            
            textContainer.textContent = fullText.trim();
            
            // Agregar eventos
            textContainer.addEventListener('mouseup', () => {
                setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    if (selectedText) {
                        this.selectedText = selectedText;
                        console.log('Texto seleccionado (fallback):', selectedText);
                        this.showNotification(`Texto seleccionado: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`, 'success');
                    }
                }, 10);
            });
            
            pageContainer.appendChild(textContainer);
            console.log('Capa de texto fallback creada para página:', pageNum);
            
        } catch (error) {
            console.error(`Error creando capa de texto fallback para página ${pageNum}:`, error);
        }
    }

    async createSimpleTextLayer(pageNum) {
        try {
            if (!this.pdfDocument) return;
            
            const pageContainer = document.getElementById(`page-${pageNum}`);
            if (!pageContainer) return;
            
            // Remover capa existente
            const existingLayer = pageContainer.querySelector('.simple-text-layer');
            if (existingLayer) {
                existingLayer.remove();
            }
            
            // Crear capa de texto simple
            const textLayer = document.createElement('div');
            textLayer.className = 'simple-text-layer';
            textLayer.style.position = 'absolute';
            textLayer.style.top = '0';
            textLayer.style.left = '0';
            textLayer.style.width = '100%';
            textLayer.style.height = '100%';
            textLayer.style.pointerEvents = 'auto';
            textLayer.style.userSelect = 'text';
            textLayer.style.webkitUserSelect = 'text';
            textLayer.style.mozUserSelect = 'text';
            textLayer.style.msUserSelect = 'text';
            textLayer.style.zIndex = '10';
            textLayer.style.cursor = 'text';
            textLayer.style.background = 'transparent';
            
            // Obtener texto del PDF
            const page = await this.pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Crear elemento de texto seleccionable
            const textDiv = document.createElement('div');
            textDiv.style.position = 'absolute';
            textDiv.style.top = '0';
            textDiv.style.left = '0';
            textDiv.style.width = '100%';
            textDiv.style.height = '100%';
            textDiv.style.overflow = 'hidden';
            textDiv.style.userSelect = 'text';
            textDiv.style.webkitUserSelect = 'text';
            textDiv.style.mozUserSelect = 'text';
            textDiv.style.msUserSelect = 'text';
            textDiv.style.pointerEvents = 'auto';
            
            // Extraer todo el texto y colocarlo en una posición
            let fullText = '';
            textContent.items.forEach(item => {
                if (item.str && item.str.trim()) {
                    fullText += item.str + ' ';
                }
            });
            
            // Crear elemento de texto invisible pero seleccionable
            const textElement = document.createElement('div');
            textElement.textContent = fullText.trim();
            textElement.style.position = 'absolute';
            textElement.style.top = '10px';
            textElement.style.left = '10px';
            textElement.style.width = 'calc(100% - 20px)';
            textElement.style.height = 'calc(100% - 20px)';
            textElement.style.color = 'transparent';
            textElement.style.fontSize = '12px';
            textElement.style.lineHeight = '1.2';
            textElement.style.wordWrap = 'break-word';
            textElement.style.whiteSpace = 'pre-wrap';
            textElement.style.userSelect = 'text';
            textElement.style.webkitUserSelect = 'text';
            textElement.style.mozUserSelect = 'text';
            textElement.style.msUserSelect = 'text';
            textElement.style.pointerEvents = 'auto';
            textElement.style.cursor = 'text';
            
            textDiv.appendChild(textElement);
            textLayer.appendChild(textDiv);
            pageContainer.appendChild(textLayer);
            
            // Agregar evento para detectar selección
            textLayer.addEventListener('mouseup', () => {
                setTimeout(() => {
                    const selection = window.getSelection();
                    const selectedText = selection.toString().trim();
                    if (selectedText) {
                        this.selectedText = selectedText;
                        this.showNotification(`Texto seleccionado: "${selectedText}"`, 'success');
                    }
                }, 10);
            });
            
            console.log(`Capa de texto simple creada para página ${pageNum}`);
            
        } catch (error) {
            console.error(`Error creando capa de texto simple para página ${pageNum}:`, error);
        }
    }

    async createTextLayer(pageNum) {
        try {
            if (!this.pdfDocument) return;
            
            // Validar que la página existe
            if (pageNum < 1 || pageNum > this.pdfDocument.numPages) {
                console.warn(`Página ${pageNum} no existe. Total de páginas: ${this.pdfDocument.numPages}`);
                return;
            }
            
            const page = await this.pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.zoom });
            
            // Obtener el contenedor de la página
            const pageContainer = document.getElementById(`page-${pageNum}`);
            if (!pageContainer) {
                console.warn(`Contenedor de página ${pageNum} no encontrado`);
                return;
            }
            
            // Verificar si ya existe una capa de texto
            const existingTextLayer = pageContainer.querySelector('.textLayer');
            if (existingTextLayer) {
                console.log(`Capa de texto para página ${pageNum} ya existe`);
                return;
            }
            
            // Crear nueva capa de texto
            const textLayer = document.createElement('div');
            textLayer.className = 'textLayer';
            textLayer.style.position = 'absolute';
            textLayer.style.left = '0';
            textLayer.style.top = '0';
            textLayer.style.right = '0';
            textLayer.style.bottom = '0';
            textLayer.style.overflow = 'hidden';
            textLayer.style.opacity = '0.01'; // Casi invisible pero seleccionable
            textLayer.style.lineHeight = '1';
            textLayer.style.userSelect = 'text';
            textLayer.style.webkitUserSelect = 'text';
            textLayer.style.mozUserSelect = 'text';
            textLayer.style.msUserSelect = 'text';
            textLayer.style.pointerEvents = 'auto';
            textLayer.style.zIndex = '2';
            
            // Obtener contenido de texto
            const textContent = await page.getTextContent();
            const textLayerDiv = document.createElement('div');
            textLayerDiv.style.position = 'absolute';
            textLayerDiv.style.left = '0';
            textLayerDiv.style.top = '0';
            textLayerDiv.style.transformOrigin = '0% 0%';
            textLayerDiv.style.transform = `scale(${this.zoom})`;
            
            // Crear elementos de texto
            textContent.items.forEach((textItem, index) => {
                if (!textItem.str || textItem.str.trim() === '') return;
                
                const textElement = document.createElement('span');
                textElement.textContent = textItem.str;
                textElement.style.position = 'absolute';
                textElement.style.left = textItem.transform[4] + 'px';
                textElement.style.top = textItem.transform[5] + 'px';
                textElement.style.fontSize = Math.abs(textItem.transform[0]) + 'px';
                textElement.style.fontFamily = textItem.fontName || 'sans-serif';
                textElement.style.transform = `matrix(${textItem.transform[0]}, ${textItem.transform[1]}, ${textItem.transform[2]}, ${textItem.transform[3]}, 0, 0)`;
                textElement.style.transformOrigin = '0% 0%';
                textElement.style.whiteSpace = 'pre';
                textElement.style.color = 'transparent';
                textElement.style.userSelect = 'text';
                textElement.style.webkitUserSelect = 'text';
                textElement.style.mozUserSelect = 'text';
                textElement.style.msUserSelect = 'text';
                textElement.style.pointerEvents = 'auto';
                textElement.style.cursor = 'text';
                
                textLayerDiv.appendChild(textElement);
            });
            
            textLayer.appendChild(textLayerDiv);
            pageContainer.appendChild(textLayer);
            
            // Agregar evento global para detectar selección
            textLayer.addEventListener('mouseup', () => {
                setTimeout(() => {
                    const selectedText = window.getSelection().toString().trim();
                    if (selectedText) {
                        this.selectedText = selectedText;
                        this.showNotification(`Texto seleccionado: "${selectedText}"`, 'success');
                    }
                }, 10);
            });
            
            console.log(`Capa de texto creada exitosamente para página ${pageNum}`);
            
        } catch (error) {
            console.error(`Error creando capa de texto para página ${pageNum}:`, error);
        }
    }

    disableTextSelection(overlay) {
        // Usar la misma lógica para obtener el número de página
        let pageNum = null;
        
        // Método 1: Buscar en el ID del overlay
        if (overlay.id) {
            const idParts = overlay.id.split('-');
            if (idParts.length >= 2) {
                pageNum = parseInt(idParts[1]);
            }
        }
        
        // Método 2: Buscar en el contenedor padre
        if (!pageNum || isNaN(pageNum)) {
            const parentContainer = overlay.closest('[id^="page-"]');
            if (parentContainer) {
                const parentIdParts = parentContainer.id.split('-');
                if (parentIdParts.length >= 2) {
                    pageNum = parseInt(parentIdParts[1]);
                }
            }
        }
        
        // Método 3: Buscar por índice
        if (!pageNum || isNaN(pageNum)) {
            const allOverlays = document.querySelectorAll('.pdf-page-overlay');
            for (let i = 0; i < allOverlays.length; i++) {
                if (allOverlays[i] === overlay) {
                    pageNum = i + 1;
                    break;
                }
            }
        }
        
        console.log('Desactivando selección de texto para página:', pageNum);
        
        // Remover todas las capas de texto
        if (pageNum && !isNaN(pageNum) && pageNum >= 1 && pageNum <= this.pdfDocument.numPages) {
            const pageContainer = document.getElementById(`page-${pageNum}`);
            if (pageContainer) {
                const allTextLayers = pageContainer.querySelectorAll('.precise-text-layer, .working-text-layer, .textLayer, .simple-text-layer');
                allTextLayers.forEach(layer => {
                    layer.remove();
                });
                console.log('Capas de texto removidas para página:', pageNum);
            }
        }
        
        // Remover clase CSS
        overlay.classList.remove('text-selection-mode');
        
        // Deshabilitar selección de texto en todo el documento
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
        
        // Limpiar cualquier selección existente
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        
        console.log('Selección de texto desactivada');
    }

    showNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    async copyTextToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                this.showNotification('Texto copiado al portapapeles', 'success');
            } else {
                // Fallback para navegadores más antiguos
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    this.showNotification('Texto copiado al portapapeles', 'success');
                } catch (err) {
                    this.showNotification('Error al copiar texto', 'error');
                }
                
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Error al copiar:', err);
            this.showNotification('Error al copiar texto', 'error');
        }
    }

    testTextSelection() {
        console.log('=== PRUEBA DE SELECCIÓN DE TEXTO ===');
        console.log('PDF Document:', this.pdfDocument);
        console.log('Current Page:', this.currentPage);
        console.log('Total Pages:', this.pdfDocument ? this.pdfDocument.numPages : 'No disponible');
        
        // Buscar todas las páginas
        const allPages = document.querySelectorAll('[id^="page-"]');
        console.log('Páginas encontradas en DOM:', allPages.length);
        allPages.forEach(page => {
            console.log('Página DOM:', page.id);
        });
        
        // Buscar overlays
        const allOverlays = document.querySelectorAll('.pdf-page-overlay');
        console.log('Overlays encontrados:', allOverlays.length);
        allOverlays.forEach((overlay, index) => {
            console.log(`Overlay ${index + 1}:`, {
                id: overlay.id,
                className: overlay.className,
                parentId: overlay.parentElement ? overlay.parentElement.id : 'No parent'
            });
        });
        
        // Buscar capas de texto existentes
        const allTextLayers = document.querySelectorAll('.working-text-layer, .textLayer, .simple-text-layer');
        console.log('Capas de texto existentes:', allTextLayers.length);
        allTextLayers.forEach(layer => {
            console.log('Capa de texto:', layer.className, layer.style.zIndex);
        });
        
        this.showNotification('Información de debug en consola (Ctrl+T para probar)', 'info');
    }

    onPageMouseDown(e, pageNum) {
        const rect = e.target.getBoundingClientRect();
        // Para resaltados, usar coordenadas absolutas (sin dividir por zoom)
        const xAbsolute = e.clientX - rect.left;
        const yAbsolute = e.clientY - rect.top;
        // Para dibujos, usar coordenadas normalizadas (divididas por zoom)
        const xNormalized = xAbsolute / this.zoom;
        const yNormalized = yAbsolute / this.zoom;
        
        switch (this.currentTool) {
            case 'textSelection':
                // No hacer nada - permitir selección nativa del navegador
                break;
            case 'hand':
                this.startPanning(e);
                break;
            case 'textEdit':
                this.handleTextEditClick(xNormalized, yNormalized, pageNum);
                break;
            case 'textBox':
                this.startTextBoxDrawing(xNormalized, yNormalized, pageNum);
                break;
            case 'textAdd':
                this.addTextAtPosition(xNormalized, yNormalized, pageNum);
                break;
            case 'draw':
                this.startDrawing(xNormalized, yNormalized, pageNum);
                break;
            case 'line':
            case 'rectangle':
            case 'circle':
                this.startShapeDrawing(xNormalized, yNormalized, pageNum);
                break;
            case 'highlight':
                this.startHighlighting(xAbsolute, yAbsolute, pageNum);
                break;
            case 'eraser':
                // Los highlights manejan sus propios clicks
                break;
        }
    }

    onPageMouseMove(e, pageNum) {
        const rect = e.target.getBoundingClientRect();
        // Para resaltados, usar coordenadas absolutas (sin dividir por zoom)
        const xAbsolute = e.clientX - rect.left;
        const yAbsolute = e.clientY - rect.top;
        // Para dibujos, usar coordenadas normalizadas (divididas por zoom)
        const xNormalized = xAbsolute / this.zoom;
        const yNormalized = yAbsolute / this.zoom;
        
        switch (this.currentTool) {
            case 'textSelection':
                // No hacer nada - permitir selección nativa del navegador
                break;
            case 'hand':
                this.updatePanning(e);
                break;
            case 'draw':
                this.updateDrawing(xNormalized, yNormalized, pageNum);
                break;
            case 'line':
            case 'rectangle':
            case 'circle':
                this.updateShapeDrawing(xNormalized, yNormalized, pageNum);
                break;
            case 'highlight':
                this.updateHighlighting(xAbsolute, yAbsolute, pageNum);
                break;
        }
    }

    onPageMouseUp(e, pageNum) {
        const rect = e.target.getBoundingClientRect();
        // Para resaltados, usar coordenadas absolutas (sin dividir por zoom)
        const xAbsolute = e.clientX - rect.left;
        const yAbsolute = e.clientY - rect.top;
        // Para dibujos, usar coordenadas normalizadas (divididas por zoom)
        const xNormalized = xAbsolute / this.zoom;
        const yNormalized = yAbsolute / this.zoom;
        
        switch (this.currentTool) {
            case 'textSelection':
                // No hacer nada - permitir selección nativa del navegador
                break;
            case 'hand':
                this.finishPanning();
                break;
            case 'draw':
                this.finishDrawing(pageNum);
                break;
            case 'line':
            case 'rectangle':
            case 'circle':
                this.finishShapeDrawing(pageNum);
                break;
            case 'highlight':
                this.finishHighlighting(pageNum);
                break;
        }
    }

    onPageClick(e, pageNum) {
        // Manejar clics simples
        if (this.currentTool === 'image') {
            this.loadImage();
            return;
        }
        
        // Si está en modo selección y se hace clic en una imagen
        if (this.currentTool === 'select') {
            if (e.target.tagName === 'IMG' || e.target.classList.contains('draggable-image')) {
                this.selectElement(e.target);
                return;
            }
        }
        
        // Si se hace clic en el fondo (no en un elemento), deseleccionar todo
        if (e.target.classList.contains('pdf-page-overlay')) {
            this.clearSelections();
        }
    }

    onPageDoubleClick(e, pageNum) {
        // Manejar doble clic para edición de texto
        if (this.currentTool === 'textEdit') {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleTextEditClick(x, y, pageNum);
        }
    }

    // Funciones para selección de texto
    startTextSelection(x, y, pageNum) {
        this.isSelecting = true;
        this.selectionStart = { x, y, pageNum };
        this.selectionEnd = { x, y, pageNum };
        this.createTextSelectionOverlay(x, y, x, y, pageNum);
    }

    updateTextSelection(x, y, pageNum) {
        if (this.isSelecting) {
            this.selectionEnd = { x, y, pageNum };
            this.updateTextSelectionOverlay(pageNum);
        }
    }

    async finishTextSelection(x, y, pageNum) {
        if (this.isSelecting) {
            this.selectionEnd = { x, y, pageNum };
            this.isSelecting = false;
            
            // Extraer texto real del área seleccionada
            await this.extractTextFromSelection(pageNum);
        }
    }

    async extractTextFromSelection(pageNum) {
        try {
            if (!this.pdfDocument) return;
            
            const page = await this.pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Obtener las coordenadas de la selección
            const selectionOverlay = document.querySelector(`#selection-${pageNum}`);
            if (!selectionOverlay) return;
            
            const overlayRect = selectionOverlay.getBoundingClientRect();
            const canvas = document.querySelector(`#page-${pageNum} canvas`);
            const canvasRect = canvas.getBoundingClientRect();
            
            // Calcular coordenadas relativas al canvas
            const startX = this.selectionStart.x;
            const startY = this.selectionStart.y;
            const endX = this.selectionEnd.x;
            const endY = this.selectionEnd.y;
            
            // Crear área de selección
            const selectionRect = {
                left: Math.min(startX, endX),
                top: Math.min(startY, endY),
                right: Math.max(startX, endX),
                bottom: Math.max(startY, endY)
            };
            
            // Extraer texto que intersecta con el área de selección
            let selectedText = '';
            const items = textContent.items;
            
            for (const item of items) {
                if (this.isTextInSelection(item, selectionRect, page)) {
                    selectedText += item.str + ' ';
                }
            }
            
            this.selectedText = selectedText.trim();
            
            if (this.selectedText) {
                this.showNotification(`Texto seleccionado: "${this.selectedText}"`, 'success');
            } else {
                this.showNotification('No se encontró texto en el área seleccionada', 'warning');
            }
            
        } catch (error) {
            console.error('Error extrayendo texto:', error);
            this.showNotification('Error al extraer texto del PDF', 'error');
        }
    }

    isTextInSelection(textItem, selectionRect, page) {
        // Convertir coordenadas del texto a coordenadas del canvas
        const transform = textItem.transform;
        const x = transform[4];
        const y = transform[5];
        const width = textItem.width;
        const height = textItem.height || 12; // Altura por defecto
        
        // Verificar si el texto intersecta con el área de selección
        return !(x > selectionRect.right || 
                x + width < selectionRect.left || 
                y > selectionRect.bottom || 
                y + height < selectionRect.top);
    }

    createTextSelectionOverlay(x1, y1, x2, y2, pageNum) {
        // Eliminar selección anterior si existe
        const existingSelection = document.querySelector(`#selection-${pageNum}`);
        if (existingSelection) {
            existingSelection.remove();
        }
        
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        const selectionDiv = document.createElement('div');
        selectionDiv.className = 'text-selection-overlay';
        selectionDiv.id = `selection-${pageNum}`;
        
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        // Solo crear si hay un área mínima de selección
        if (width < 5 || height < 5) return;
        
        selectionDiv.style.position = 'absolute';
        selectionDiv.style.left = left + 'px';
        selectionDiv.style.top = top + 'px';
        selectionDiv.style.width = width + 'px';
        selectionDiv.style.height = height + 'px';
        selectionDiv.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
        selectionDiv.style.border = '1px solid #007bff';
        selectionDiv.style.pointerEvents = 'none';
        selectionDiv.style.zIndex = '10';
        selectionDiv.style.borderRadius = '2px';
        
        overlay.appendChild(selectionDiv);
    }

    updateTextSelectionOverlay(pageNum) {
        const selectionDiv = document.querySelector(`#selection-${pageNum}`);
        if (selectionDiv && this.selectionStart && this.selectionEnd) {
            const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
            const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
            const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
            const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
            
            // Solo actualizar si hay un área mínima
            if (width >= 5 && height >= 5) {
                selectionDiv.style.left = left + 'px';
                selectionDiv.style.top = top + 'px';
                selectionDiv.style.width = width + 'px';
                selectionDiv.style.height = height + 'px';
            }
        }
    }

    extractSelectedText() {
        // Esta es una implementación simplificada
        // En una implementación real, necesitarías usar las APIs de PDF.js para extraer texto
        return "Texto seleccionado del PDF";
    }

    // Funciones para herramienta de mano (pan)
    startPanning(e) {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        document.body.style.cursor = 'grabbing';
    }

    updatePanning(e) {
        if (this.isPanning) {
            const deltaX = e.clientX - this.panStart.x;
            const deltaY = e.clientY - this.panStart.y;
            
            // Mover todas las páginas
            const pages = document.querySelectorAll('.pdf-page-wrapper');
            pages.forEach(page => {
                const currentTransform = page.style.transform || 'translate(0px, 0px)';
                const matches = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                const currentX = matches ? parseFloat(matches[1]) : 0;
                const currentY = matches ? parseFloat(matches[2]) : 0;
                
                page.style.transform = `translate(${currentX + deltaX}px, ${currentY + deltaY}px)`;
            });
            
            this.panStart = { x: e.clientX, y: e.clientY };
        }
    }

    finishPanning() {
        this.isPanning = false;
        document.body.style.cursor = '';
    }

    // Funciones para edición de texto
    handleTextEditClick(x, y, pageNum) {
        // Crear overlay de edición de texto
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        const editDiv = document.createElement('div');
        editDiv.className = 'text-editing-overlay';
        editDiv.id = `text-edit-${pageNum}`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'Editar texto aquí...';
        input.style.fontSize = document.getElementById('fontSize').value + 'px';
        input.style.fontFamily = document.getElementById('fontFamily').value;
        input.style.color = document.getElementById('textColor').value;
        
        editDiv.style.left = x + 'px';
        editDiv.style.top = y + 'px';
        
        editDiv.appendChild(input);
        overlay.appendChild(editDiv);
        
        input.focus();
        input.select();
        
        input.addEventListener('blur', () => {
            this.finishTextEditing(pageNum);
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishTextEditing(pageNum);
            }
        });
        
        this.isEditingText = true;
        this.editingElement = editDiv;
    }

    finishTextEditing(pageNum) {
        const editDiv = document.querySelector(`#text-edit-${pageNum}`);
        if (editDiv && editDiv.parentNode) {
            const input = editDiv.querySelector('input');
            const text = input.value;
            
            // Aquí deberías usar PDF-lib para agregar el texto al PDF
            console.log('Texto editado:', text);
            
            editDiv.remove();
            this.isEditingText = false;
            this.editingElement = null;
            this.showNotification('Texto editado correctamente', 'success');
        }
    }

    // Funciones para dibujo
    startDrawing(x, y, pageNum) {
        this.isDrawing = true;
        this.currentDrawing = [{ x, y }];
        this.currentDrawingPage = pageNum;
        console.log('Iniciando dibujo en:', x, y, 'página:', pageNum);
        
        // Agregar listener global para mouseup para asegurar que termine el dibujo
        this.globalMouseUpHandler = (e) => {
            if (this.isDrawing) {
                this.finishDrawing(this.currentDrawingPage);
                document.removeEventListener('mouseup', this.globalMouseUpHandler);
            }
        };
        document.addEventListener('mouseup', this.globalMouseUpHandler);
    }

    updateDrawing(x, y, pageNum) {
        if (this.isDrawing) {
            this.currentDrawing.push({ x, y });
            this.updateDrawingPreview(pageNum);
        }
    }
    
    // Función para mostrar preview del dibujo en tiempo real
    updateDrawingPreview(pageNum) {
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        if (!overlay || !this.currentDrawing || this.currentDrawing.length < 2) return;
        
        // Crear o obtener el contenedor SVG de preview
        let previewContainer = overlay.querySelector('svg.drawing-preview');
        if (!previewContainer) {
            previewContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            previewContainer.setAttribute('class', 'drawing-preview');
            previewContainer.style.position = 'absolute';
            previewContainer.style.top = '0';
            previewContainer.style.left = '0';
            previewContainer.style.width = '100%';
            previewContainer.style.height = '100%';
            previewContainer.style.pointerEvents = 'none';
            previewContainer.style.zIndex = '6';
            previewContainer.style.transform = `scale(${this.zoom})`;
            previewContainer.style.transformOrigin = 'top left';
            overlay.appendChild(previewContainer);
        }
        
        // Limpiar preview anterior
        previewContainer.innerHTML = '';
        
        // Crear path de preview
        if (this.currentDrawing.length > 1) {
            let pathData = `M ${this.currentDrawing[0].x} ${this.currentDrawing[0].y}`;
            for (let i = 1; i < this.currentDrawing.length; i++) {
                pathData += ` L ${this.currentDrawing[i].x} ${this.currentDrawing[i].y}`;
            }
            
            const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            previewPath.setAttribute('d', pathData);
            previewPath.style.stroke = '#000000';
            previewPath.style.strokeWidth = '2';
            previewPath.style.fill = 'none';
            previewPath.style.opacity = '0.7';
            
            previewContainer.appendChild(previewPath);
        }
    }

    finishDrawing(pageNum) {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // Limpiar preview antes de guardar el dibujo final
            this.clearDrawingPreview(pageNum);
            
            this.saveDrawingState(pageNum);
        }
    }
    
    // Función para limpiar el preview del dibujo
    clearDrawingPreview(pageNum) {
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        if (overlay) {
            const previewContainer = overlay.querySelector('svg.drawing-preview');
            if (previewContainer) {
                previewContainer.remove();
            }
        }
    }
    
    // Función para mostrar preview de formas en tiempo real
    updateShapePreview(pageNum) {
        if (!this.isDrawingShape || !this.currentShape) return;
        
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        if (!overlay) return;
        
        // Crear o obtener el contenedor SVG de preview para formas
        let previewContainer = overlay.querySelector('svg.shape-preview');
        if (!previewContainer) {
            previewContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            previewContainer.setAttribute('class', 'shape-preview');
            previewContainer.style.position = 'absolute';
            previewContainer.style.top = '0';
            previewContainer.style.left = '0';
            previewContainer.style.width = '100%';
            previewContainer.style.height = '100%';
            previewContainer.style.pointerEvents = 'none';
            previewContainer.style.zIndex = '6';
            previewContainer.style.transform = `scale(${this.zoom})`;
            previewContainer.style.transformOrigin = 'top left';
            overlay.appendChild(previewContainer);
        }
        
        // Limpiar preview anterior
        previewContainer.innerHTML = '';
        
        const { startX, startY, endX, endY, type } = this.currentShape;
        
        if (type === 'line') {
            // Crear línea de preview
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', startX);
            line.setAttribute('y1', startY);
            line.setAttribute('x2', endX);
            line.setAttribute('y2', endY);
            line.style.stroke = document.getElementById('strokeColor').value || '#000000';
            line.style.strokeWidth = document.getElementById('strokeWidth').value || '2';
            line.style.fill = 'none';
            line.style.opacity = '0.7';
            
            previewContainer.appendChild(line);
            
        } else if (type === 'rectangle') {
            // Crear rectángulo de preview
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const x = Math.min(startX, endX);
            const y = Math.min(startY, endY);
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', width);
            rect.setAttribute('height', height);
            rect.style.stroke = document.getElementById('strokeColor').value || '#000000';
            rect.style.strokeWidth = document.getElementById('strokeWidth').value || '2';
            rect.style.fill = 'none';
            rect.style.opacity = '0.7';
            
            previewContainer.appendChild(rect);
            
        } else if (type === 'circle') {
            // Crear círculo de preview
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const centerX = startX;
            const centerY = startY;
            const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            
            circle.setAttribute('cx', centerX);
            circle.setAttribute('cy', centerY);
            circle.setAttribute('r', radius);
            circle.style.stroke = document.getElementById('strokeColor').value || '#000000';
            circle.style.strokeWidth = document.getElementById('strokeWidth').value || '2';
            circle.style.fill = 'none';
            circle.style.opacity = '0.7';
            
            previewContainer.appendChild(circle);
        }
    }
    
    // Función para limpiar el preview de formas
    clearShapePreview(pageNum) {
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        if (overlay) {
            const previewContainer = overlay.querySelector('svg.shape-preview');
            if (previewContainer) {
                previewContainer.remove();
            }
        }
    }
    
    // Función para verificar y actualizar elementos que cambian de página
    checkAndUpdateElementPage(element) {
        if (!element || !element.parentElement) return;
        
        const currentParent = element.parentElement;
        const currentPageNum = this.getPageNumberFromElement(currentParent);
        
        // Si el elemento está en una página válida
        if (currentPageNum && currentPageNum !== this.currentPage) {
            console.log(`Elemento movido a página ${currentPageNum}`);
            
            // Reaplicar funcionalidad al elemento en la nueva página
            this.reapplyElementFunctionality(element, currentPageNum);
            
            // Actualizar la página actual si es necesario
            if (this.selectedElement === element) {
                this.currentPage = currentPageNum;
            }
        }
    }
    
    // Función para obtener el número de página desde un elemento
    getPageNumberFromElement(element) {
        if (!element) return null;
        
        // Buscar el contenedor de página más cercano
        let pageElement = element;
        while (pageElement && !pageElement.id.startsWith('page-')) {
            pageElement = pageElement.parentElement;
        }
        
        if (pageElement && pageElement.id.startsWith('page-')) {
            const pageNum = parseInt(pageElement.id.replace('page-', ''));
            return isNaN(pageNum) ? null : pageNum;
        }
        
        return null;
    }
    
    // Función para obtener la página visible actualmente en el viewport
    getCurrentVisiblePage() {
        const pages = document.querySelectorAll('[id^="page-"]');
        let visiblePage = null;
        let maxVisibleArea = 0;
        
        pages.forEach(page => {
            const rect = page.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // Calcular qué porcentaje de la página es visible
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibleArea = visibleHeight * rect.width;
            
            if (visibleArea > maxVisibleArea) {
                maxVisibleArea = visibleArea;
                visiblePage = page;
            }
        });
        
        if (visiblePage) {
            const pageNum = parseInt(visiblePage.id.replace('page-', ''));
            return isNaN(pageNum) ? 1 : pageNum;
        }
        
        return this.currentPage || 1;
    }
    
    // Función para reaplicar funcionalidad a un elemento
    reapplyElementFunctionality(element, pageNum) {
        if (!element) return;
        
        console.log(`Reaplicando funcionalidad a elemento en página ${pageNum}`);
        
        // Asegurar que el elemento tenga las clases correctas
        if (element.tagName === 'IMG' && !element.classList.contains('draggable-image')) {
            element.classList.add('draggable-image');
        }
        
        // Reaplicar funcionalidad de arrastre si no la tiene
        if (!element.hasAttribute('data-draggable-applied')) {
            this.makeDraggable(element);
        }
        
        // Reaplicar funcionalidad de redimensionado para imágenes
        if (element.tagName === 'IMG' && !element.hasAttribute('data-resizable-applied')) {
            this.makeResizable(element);
            element.setAttribute('data-resizable-applied', 'true');
        }
        
        // Si el elemento está seleccionado, recrear las manijas de redimensionado
        if (element.classList.contains('selected') && !element.hasAttribute('data-resizable-applied')) {
            this.makeResizable(element);
        }
        
        // Agregar event listener para clic en la nueva página
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        if (overlay) {
            // Asegurar que el elemento tenga un ID único si no lo tiene
            if (!element.id) {
                element.id = 'element-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            }
            
            // El event listener ya está en el overlay, no necesitamos agregarlo de nuevo
            console.log(`Funcionalidad reaplicada a elemento ${element.id} en página ${pageNum}`);
        }
    }

    createDrawingOverlay(x, y, pageNum) {
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        const drawingDiv = document.createElement('div');
        drawingDiv.className = 'drawing-overlay';
        drawingDiv.id = `drawing-${pageNum}`;
        drawingDiv.style.position = 'absolute';
        drawingDiv.style.pointerEvents = 'none';
        drawingDiv.style.zIndex = '3';
        
        const canvas = document.createElement('canvas');
        canvas.width = overlay.offsetWidth;
        canvas.height = overlay.offsetHeight;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        drawingDiv.appendChild(canvas);
        overlay.appendChild(drawingDiv);
        
        this.drawingCanvas = canvas;
        this.drawingContext = canvas.getContext('2d');
        
        this.drawingContext.strokeStyle = document.getElementById('strokeColor').value;
        this.drawingContext.lineWidth = document.getElementById('strokeWidth').value;
        this.drawingContext.lineCap = 'round';
        this.drawingContext.lineJoin = 'round';
        
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(x, y);
    }

    updateDrawingOverlay(pageNum) {
        if (this.drawingContext && this.drawingPoints.length > 1) {
            const lastPoint = this.drawingPoints[this.drawingPoints.length - 1];
            this.drawingContext.lineTo(lastPoint.x, lastPoint.y);
            this.drawingContext.stroke();
        }
    }

    // Funciones para agregar texto
    addTextAtPosition(x, y, pageNum) {
        // Solo mostrar prompt si no hay texto siendo agregado actualmente
        if (this.isAddingText) return;
        
        this.isAddingText = true;
        const text = prompt('Ingrese el texto:');
        this.isAddingText = false;
        
        if (text && text.trim()) {
            const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
            const textDiv = document.createElement('div');
            textDiv.className = 'added-text draggable-text';
            textDiv.textContent = text;
            textDiv.style.position = 'absolute';
            textDiv.style.left = x + 'px';
            textDiv.style.top = y + 'px';
            textDiv.style.fontSize = document.getElementById('fontSize').value + 'px';
            textDiv.style.fontFamily = document.getElementById('fontFamily').value;
            textDiv.style.color = document.getElementById('textColor').value;
            textDiv.style.pointerEvents = 'auto';
            textDiv.style.zIndex = '4';
            textDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            textDiv.style.padding = '2px 5px';
            textDiv.style.borderRadius = '3px';
            textDiv.style.border = 'none';
            textDiv.style.cursor = 'move';
            textDiv.draggable = false;
            
            overlay.appendChild(textDiv);
            
            // Hacer el texto arrastrable
            this.makeDraggable(textDiv);
            
            // Hacer el texto editable con doble clic
            textDiv.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                textDiv.contentEditable = true;
                textDiv.focus();
                
                // Seleccionar todo el texto
                const range = document.createRange();
                range.selectNodeContents(textDiv);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
            
            // Guardar cambios al salir del modo edición
            textDiv.addEventListener('blur', () => {
                textDiv.contentEditable = false;
            });
            
            this.showNotification('Texto agregado correctamente', 'success');
        }
    }

    // Funciones para cargar imágenes
    loadImage(file = null) {
        if (!file) {
            // Abrir selector de archivos
            document.getElementById('imageInput').click();
            return;
        }

        this.loadImageFile(file);
    }

    async loadImageFile(file) {
        if (!file) return;

        try {
            const imageUrl = URL.createObjectURL(file);
            
            // Obtener la página visible actual
            const activePageNum = this.getCurrentVisiblePage();
            console.log(`Agregando imagen a página visible: ${activePageNum}`);
            
            // Crear elemento de imagen en la página visible actual
            const currentPage = document.querySelector(`#page-${activePageNum} .pdf-page-overlay`) || 
                               document.querySelector('.pdf-page-overlay');
            
            if (currentPage) {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.style.position = 'absolute';
                
                // Posicionar la imagen en el centro de la vista actual
                const containerRect = currentPage.getBoundingClientRect();
                const scrollTop = currentPage.scrollTop || 0;
                const scrollLeft = currentPage.scrollLeft || 0;
                
                // Calcular posición centrada en la vista actual
                const centerX = (containerRect.width / 2) - 100; // 100px para centrar (200px width / 2)
                const centerY = (containerRect.height / 2) - 100; // 100px para centrar (200px height / 2)
                
                img.style.left = centerX + 'px';
                img.style.top = centerY + 'px';
                img.style.maxWidth = '200px';
                img.style.maxHeight = '200px';
                img.style.zIndex = '4';
                img.style.pointerEvents = 'auto';
                img.style.border = 'none';
                img.style.borderRadius = '4px';
                img.style.cursor = 'move';
                img.className = 'draggable-image';
                img.draggable = false; // Deshabilitar drag nativo del navegador
                
                // Agregar la imagen al DOM primero
                currentPage.appendChild(img);
                
                // Hacer la imagen arrastrable y redimensionable DESPUÉS de agregarla
                this.makeDraggable(img);
                this.makeResizable(img);
                
                // Seleccionar automáticamente la imagen recién agregada
                this.selectElement(img);
                this.showNotification('Imagen agregada correctamente', 'success');
                
                // Cambiar automáticamente al modo selección después de insertar imagen
                setTimeout(() => {
                    this.setTool('select');
                }, 500);
            }
        } catch (error) {
            this.showNotification('Error al cargar la imagen: ' + error.message, 'error');
        }
    }

    makeDraggable(element) {
        // Evitar duplicar event listeners
        if (element.hasAttribute('data-draggable-applied')) {
            return;
        }
        
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        element.addEventListener('mousedown', (e) => {
            // Solo hacer draggable si no está en modo edición
            if (element.contentEditable === 'true' || element.tagName === 'TEXTAREA') {
                return;
            }
            
            // No hacer draggable si se hace clic en el handle de redimensionado
            if (e.target.classList.contains('resize-handle')) {
                return;
            }
            
            // Si es Ctrl+click o click simple, seleccionar el elemento
            if (e.ctrlKey || e.metaKey) {
                this.selectElement(element);
                return;
            }
            
            // Seleccionar elemento antes de arrastrar
            this.selectElement(element);
            
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(element.style.left) || 0;
            initialY = parseInt(element.style.top) || 0;
            element.style.cursor = 'grabbing';
            
            // Agregar clase para indicar que está siendo arrastrado
            element.classList.add('dragging');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                element.style.left = (initialX + deltaX) + 'px';
                element.style.top = (initialY + deltaY) + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'move';
                element.classList.remove('dragging');
                
                // Verificar si el elemento cambió de página
                this.checkAndUpdateElementPage(element);
            }
        });
        
        // Manejar eventos táctiles
        element.addEventListener('touchstart', (e) => {
            if (element.contentEditable === 'true' || element.tagName === 'TEXTAREA') {
                return;
            }
            
            e.preventDefault();
            const touch = e.touches[0];
            isDragging = true;
            startX = touch.clientX;
            startY = touch.clientY;
            initialX = parseInt(element.style.left) || 0;
            initialY = parseInt(element.style.top) || 0;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                const touch = e.touches[0];
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                element.style.left = (initialX + deltaX) + 'px';
                element.style.top = (initialY + deltaY) + 'px';
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                // Verificar si el elemento cambió de página
                this.checkAndUpdateElementPage(element);
            }
        });
        
        // Marcar que el elemento ya tiene funcionalidad de arrastre aplicada
        element.setAttribute('data-draggable-applied', 'true');
    }

    makeResizable(element) {
        // Remover manijas existentes si las hay
        this.removeResizeHandles(element);
        
        // Si ya tiene manijas aplicadas, no crear nuevas
        if (element.hasAttribute('data-resizable-applied')) {
            // Solo actualizar la posición de las manijas existentes
            const parent = element.parentElement;
            if (parent) {
                const existingHandle = parent.querySelector(`.resize-handle-external[data-target-id="${element.id}"]`);
                if (existingHandle) {
                    this.updateResizeHandlePosition(element, existingHandle);
                    return;
                }
            }
        }
        
        // Crear manija como elemento hermano en el mismo contenedor
        const parent = element.parentElement;
        if (!parent) {
            console.error('No se puede hacer redimensionable: elemento sin padre');
            return;
        }
        
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle-external';
        resizeHandle.dataset.targetId = element.id || 'img-' + Date.now();
        
        // Asignar ID al elemento si no lo tiene
        if (!element.id) {
            element.id = resizeHandle.dataset.targetId;
        }
        
        // Posicionar la manija basándose en la posición del elemento
        this.updateResizeHandlePosition(element, resizeHandle);
        
        parent.appendChild(resizeHandle);
        console.log('Manija de redimensionamiento externa creada');
        
        // Verificar que la manija se agregó correctamente
        const verifyHandle = parent.querySelector(`.resize-handle-external[data-target-id="${element.id}"]`);
        if (!verifyHandle) {
            console.error('Error: Manija no encontrada en DOM después de crear');
        }
        
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Obtener dimensiones actuales
            const rect = element.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
            
            document.body.style.userSelect = 'none';
            console.log('Iniciando redimensionamiento:', { startWidth, startHeight });
        });
        
        const handleMouseMove = (e) => {
            if (isResizing) {
                e.preventDefault();
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                // Calcular nuevas dimensiones
                let newWidth = Math.max(50, Math.min(800, startWidth + deltaX));
                let newHeight = Math.max(50, Math.min(600, startHeight + deltaY));
                
                // Para imágenes, mantener proporción si se mantiene Shift presionado
                if (e.shiftKey && element.tagName === 'IMG') {
                    const aspectRatio = startWidth / startHeight;
                    newHeight = newWidth / aspectRatio;
                }
                
                // Aplicar nuevas dimensiones
                element.style.width = newWidth + 'px';
                element.style.height = newHeight + 'px';
                element.style.maxWidth = 'none'; // Remover limitación de maxWidth
                element.style.maxHeight = 'none'; // Remover limitación de maxHeight
                
                // Actualizar posición de la manija
                this.updateResizeHandlePosition(element, resizeHandle);
                
                // Log para debugging
                if (Math.random() < 0.1) { // Log solo ocasionalmente para no saturar
                    console.log('Redimensionando:', { newWidth, newHeight, deltaX, deltaY });
                }
            }
        };
        
        const handleMouseUp = () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.userSelect = '';
                console.log('Redimensionamiento terminado');
                this.showNotification('Imagen redimensionada', 'success');
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Eventos táctiles
        resizeHandle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const touch = e.touches[0];
            isResizing = true;
            startX = touch.clientX;
            startY = touch.clientY;
            
            const rect = element.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
        });
        
        const handleTouchMove = (e) => {
            if (isResizing) {
                e.preventDefault();
                const touch = e.touches[0];
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                
                // Calcular nuevas dimensiones
                let newWidth = Math.max(50, Math.min(800, startWidth + deltaX));
                let newHeight = Math.max(50, Math.min(600, startHeight + deltaY));
                
                // Para imágenes, mantener proporción
                if (element.tagName === 'IMG') {
                    const aspectRatio = startWidth / startHeight;
                    newHeight = newWidth / aspectRatio;
                }
                
                element.style.width = newWidth + 'px';
                element.style.height = newHeight + 'px';
                element.style.maxWidth = 'none'; // Remover limitación de maxWidth
                element.style.maxHeight = 'none'; // Remover limitación de maxHeight
            }
        };
        
        const handleTouchEnd = () => {
            if (isResizing) {
                isResizing = false;
                this.showNotification('Imagen redimensionada', 'success');
            }
        };
        
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        
        // Marcar que el elemento ya tiene funcionalidad de redimensionado aplicada
        element.setAttribute('data-resizable-applied', 'true');
    }
    
    // Función para remover manijas existentes
    removeResizeHandles(element) {
        const parent = element.parentElement;
        if (parent) {
            const existingHandle = parent.querySelector(`.resize-handle-external[data-target-id="${element.id}"]`);
            if (existingHandle) {
                existingHandle.remove();
            }
        }
        
        // También remover manijas internas si las hay
        const internalHandle = element.querySelector('.resize-handle');
        if (internalHandle) {
            internalHandle.remove();
        }
    }
    
    // Función para actualizar la posición de la manija
    updateResizeHandlePosition(element, resizeHandle) {
        if (!element || !resizeHandle || !element.parentElement) {
            console.warn('No se puede actualizar posición de manija: elemento o manija no válidos');
            return;
        }
        
        // Usar las propiedades de estilo del elemento en lugar de getBoundingClientRect
        const elementLeft = parseInt(element.style.left) || 0;
        const elementTop = parseInt(element.style.top) || 0;
        const elementWidth = element.offsetWidth || element.clientWidth;
        const elementHeight = element.offsetHeight || element.clientHeight;
        
        // Calcular posición de la manija (esquina inferior derecha)
        const handleLeft = elementLeft + elementWidth - 12;
        const handleTop = elementTop + elementHeight - 12;
        
        resizeHandle.style.cssText = `
            position: absolute !important;
            left: ${handleLeft}px !important;
            top: ${handleTop}px !important;
            width: 12px !important;
            height: 12px !important;
            background-color: #007bff !important;
            cursor: se-resize !important;
            border-radius: 0 0 4px 0 !important;
            border: 1px solid #fff !important;
            z-index: 9999 !important;
            opacity: 1 !important;
            display: block !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
            pointer-events: auto !important;
        `;
        
        // Solo loggear ocasionalmente para evitar spam en consola
        if (Math.random() < 0.01) { // Solo 1% de las veces
            console.log('Posición de manija actualizada:', {
                elementPosition: { left: elementLeft, top: elementTop },
                elementSize: { width: elementWidth, height: elementHeight },
                handlePosition: { left: handleLeft, top: handleTop }
            });
        }
    }

    // Funciones para zoom
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 3);
        this.renderAllPages();
        // Restaurar resaltados y dibujos después de un pequeño delay
        setTimeout(() => {
            this.restoreAllHighlights();
            this.restoreAllDrawings();
        }, 100);
        this.updatePageInfo();
        console.log('Zoom aumentado a:', Math.round(this.zoom * 100) + '%');
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.5);
        this.renderAllPages();
        // Restaurar resaltados y dibujos después de un pequeño delay
        setTimeout(() => {
            this.restoreAllHighlights();
            this.restoreAllDrawings();
        }, 100);
        this.updatePageInfo();
        console.log('Zoom reducido a:', Math.round(this.zoom * 100) + '%');
    }

    resetZoom() {
        this.zoom = 1;
        this.renderAllPages();
        // Restaurar resaltados y dibujos después de un pequeño delay
        setTimeout(() => {
            this.restoreAllHighlights();
            this.restoreAllDrawings();
        }, 100);
        this.updatePageInfo();
        console.log('Zoom restablecido a: 100%');
        this.showNotification('Zoom restablecido al 100%', 'success');
    }

    updateZoomIndicator() {
        const zoomIndicator = document.getElementById('zoomInfo');
        if (zoomIndicator) {
            zoomIndicator.textContent = Math.round(this.zoom * 100) + '%';
            console.log('Zoom actualizado:', Math.round(this.zoom * 100) + '%');
        } else {
            console.warn('Elemento zoomInfo no encontrado');
        }
    }


    // Funciones para navegación de páginas
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.scrollToPage(this.currentPage);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.scrollToPage(this.currentPage);
        }
    }

    scrollToPage(pageNum) {
        const page = document.getElementById(`page-${pageNum}`);
        if (page) {
            page.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    updatePageInfo() {
        document.getElementById('pageInfo').textContent = `${this.currentPage} / ${this.totalPages}`;
        document.getElementById('zoomInfo').textContent = `${Math.round(this.zoom * 100)}%`;
        
        document.getElementById('prevPageBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage >= this.totalPages;
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePageInfo();
            this.scrollToCurrentPage();
            console.log('Navegando a página:', this.currentPage);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageInfo();
            this.scrollToCurrentPage();
            console.log('Navegando a página:', this.currentPage);
        }
    }

    scrollToCurrentPage() {
        const currentPageElement = document.getElementById(`page-${this.currentPage}`);
        if (currentPageElement) {
            currentPageElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    enableControls() {
        document.getElementById('downloadPdfBtn').disabled = false;
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    handleKeyboard(e) {
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        } else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            this.redo();
        } else if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            this.copySelection();
        } else if (e.ctrlKey && e.key === 'x') {
            e.preventDefault();
            this.cutSelection();
        } else if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            this.pasteSelection();
        } else if (e.key === 'Delete') {
            e.preventDefault();
            this.deleteSelection();
        } else if (e.key === 'Escape') {
            this.clearSelections();
            this.clearTextSelections();
        } else if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            this.selectAllText();
        }
    }

    // Funciones de utilidad mejoradas
    async copySelection() {
        if (this.selectedElement) {
            // Copiar elemento seleccionado
            this.clipboard = this.selectedElement.cloneNode(true);
            this.showNotification('Elemento copiado', 'success');
        } else if (this.selectedText) {
            // Copiar texto seleccionado
            try {
                await navigator.clipboard.writeText(this.selectedText);
                this.showNotification('Texto copiado al portapapeles', 'success');
            } catch (error) {
                // Fallback para navegadores que no soportan clipboard API
                this.fallbackCopyTextToClipboard(this.selectedText);
                this.showNotification('Texto copiado al portapapeles', 'success');
            }
        } else {
            this.showNotification('No hay nada seleccionado para copiar', 'warning');
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Error copiando texto:', err);
        }
        
        document.body.removeChild(textArea);
    }

    selectAllText() {
        // Seleccionar todo el texto de la página actual
        if (this.currentPage && this.pdfDocument) {
            const canvas = document.querySelector(`#page-${this.currentPage} canvas`);
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                this.startTextSelection(0, 0, this.currentPage);
                this.finishTextSelection(rect.width, rect.height, this.currentPage);
                this.showNotification('Todo el texto seleccionado', 'success');
            }
        }
    }

    cutSelection() {
        if (this.selectedElement) {
            // Cortar elemento seleccionado
            this.clipboard = this.selectedElement.cloneNode(true);
            this.selectedElement.remove();
            this.selectedElement = null;
            this.showNotification('Elemento cortado', 'success');
        } else if (this.selectedText) {
            // Cortar texto seleccionado
            navigator.clipboard.writeText(this.selectedText);
            this.clearSelections();
            this.showNotification('Texto cortado', 'success');
        } else {
            this.showNotification('No hay nada seleccionado para cortar', 'warning');
        }
    }

    pasteSelection() {
        if (this.clipboard && this.selectedElement) {
            // Pegar elemento en la posición del elemento seleccionado
            const parent = this.selectedElement.parentNode;
            const clonedElement = this.clipboard.cloneNode(true);
            clonedElement.style.left = (parseInt(this.selectedElement.style.left) + 20) + 'px';
            clonedElement.style.top = (parseInt(this.selectedElement.style.top) + 20) + 'px';
            parent.appendChild(clonedElement);
            this.makeDraggable(clonedElement);
            this.showNotification('Elemento pegado', 'success');
        } else if (this.clipboard) {
            // Pegar elemento en el centro de la primera página
            const firstPage = document.querySelector('.pdf-page-overlay');
            if (firstPage) {
                const clonedElement = this.clipboard.cloneNode(true);
                clonedElement.style.left = '100px';
                clonedElement.style.top = '100px';
                firstPage.appendChild(clonedElement);
                this.makeDraggable(clonedElement);
                this.showNotification('Elemento pegado', 'success');
            }
        } else {
            navigator.clipboard.readText().then(text => {
                this.showNotification('Texto pegado: ' + text, 'success');
            }).catch(() => {
                this.showNotification('No hay nada en el portapapeles', 'warning');
            });
        }
    }

    deleteSelection() {
        if (this.selectedShape) {
            // Eliminar forma seleccionada
            this.removeDrawing(this.selectedShape.id);
            this.deselectShape();
            this.showNotification('Forma eliminada', 'success');
        } else if (this.selectedElement) {
            // Eliminar elemento seleccionado
            this.selectedElement.remove();
            this.selectedElement = null;
            this.showNotification('Elemento eliminado', 'success');
        } else {
            this.clearSelections();
            this.showNotification('Selección eliminada', 'success');
        }
    }

    clearSelections() {
        document.querySelectorAll('.text-selection-overlay').forEach(el => el.remove());
        this.selectedText = '';
        this.selectedElement = null;
        
        // Deseleccionar forma si existe
        if (this.selectedShape) {
            this.deselectShape();
        }
        
        // Remover clases de selección
        document.querySelectorAll('.selected').forEach(el => {
            el.classList.remove('selected');
            
            // Remover manijas externas
            this.removeResizeHandles(el);
        });
        
        // Limpiar todas las manijas externas huérfanas
        document.querySelectorAll('.resize-handle-external').forEach(handle => {
            const targetId = handle.dataset.targetId;
            const target = document.getElementById(targetId);
            if (!target || !target.classList.contains('selected')) {
                handle.remove();
            }
        });
    }

    // Función para seleccionar elementos
    selectElement(element) {
        this.clearSelections();
        this.selectedElement = element;
        element.classList.add('selected');
        
        // Verificar si el elemento está en una página diferente
        const elementPageNum = this.getPageNumberFromElement(element);
        if (elementPageNum && elementPageNum !== this.currentPage) {
            this.currentPage = elementPageNum;
            console.log(`Elemento seleccionado en página ${elementPageNum}`);
        }
        
        console.log('Seleccionando elemento:', element.tagName, element.className);
        
        // Debugging: mostrar información del elemento y su contenedor
        const rect = element.getBoundingClientRect();
        console.log('Elemento rect:', {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            zIndex: window.getComputedStyle(element).zIndex
        });
        
        const parent = element.parentElement;
        if (parent) {
            const parentRect = parent.getBoundingClientRect();
            console.log('Parent rect:', {
                width: parentRect.width,
                height: parentRect.height,
                top: parentRect.top,
                left: parentRect.left,
                zIndex: window.getComputedStyle(parent).zIndex
            });
        }
        
        // Crear o actualizar manijas de redimensionamiento
        if (element.tagName === 'IMG') {
            console.log('Creando manijas externas para imagen con ID:', element.id);
            
            // Asegurar que el elemento tenga un ID
            if (!element.id) {
                element.id = 'img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                console.log('ID asignado al elemento:', element.id);
            }
            
            this.makeResizable(element);
            
            // Verificar que las manijas estén visibles después de la creación
            setTimeout(() => {
                const parent = element.parentElement;
                
                if (parent) {
                    const finalHandle = parent.querySelector(`.resize-handle-external[data-target-id="${element.id}"]`);
                    
                    if (finalHandle) {
                        // Actualizar posición de la manija
                        this.updateResizeHandlePosition(element, finalHandle);
                    } else {
                        console.warn('No se encontró manija externa después de la creación para elemento:', element.id);
                    }
                } else {
                    console.error('No se encontró parent del elemento');
                }
            }, 100);
        }
        
        this.showNotification('Elemento seleccionado', 'success');
    }

    undo() {
        this.showNotification('Deshacer', 'success');
    }

    redo() {
        this.showNotification('Rehacer', 'success');
    }

    // Funciones de transformación
    rotateElement() {
        if (this.selectedElement) {
            const currentTransform = this.selectedElement.style.transform || '';
            const currentRotation = this.getRotationFromTransform(currentTransform);
            const newRotation = (currentRotation + 90) % 360;
            
            this.selectedElement.style.transform = `rotate(${newRotation}deg)`;
            this.showNotification('Elemento rotado 90°', 'success');
        } else {
            this.showNotification('Selecciona un elemento para rotar', 'warning');
        }
    }

    flipHorizontal() {
        if (this.selectedElement) {
            const currentTransform = this.selectedElement.style.transform || '';
            const hasFlip = currentTransform.includes('scaleX(-1)');
            
            if (hasFlip) {
                this.selectedElement.style.transform = currentTransform.replace(' scaleX(-1)', '');
            } else {
                this.selectedElement.style.transform = currentTransform + ' scaleX(-1)';
            }
            this.showNotification('Elemento reflejado horizontalmente', 'success');
        } else {
            this.showNotification('Selecciona un elemento para reflejar', 'warning');
        }
    }

    flipVertical() {
        if (this.selectedElement) {
            const currentTransform = this.selectedElement.style.transform || '';
            const hasFlip = currentTransform.includes('scaleY(-1)');
            
            if (hasFlip) {
                this.selectedElement.style.transform = currentTransform.replace(' scaleY(-1)', '');
            } else {
                this.selectedElement.style.transform = currentTransform + ' scaleY(-1)';
            }
            this.showNotification('Elemento reflejado verticalmente', 'success');
        } else {
            this.showNotification('Selecciona un elemento para reflejar', 'warning');
        }
    }

    scaleUp() {
        if (this.selectedElement) {
            const currentTransform = this.selectedElement.style.transform || '';
            const currentScale = this.getScaleFromTransform(currentTransform);
            const newScale = Math.min(currentScale * 1.2, 3);
            
            this.selectedElement.style.transform = currentTransform.replace(/scale\([^)]*\)/, '') + ` scale(${newScale})`;
            this.showNotification(`Elemento escalado a ${Math.round(newScale * 100)}%`, 'success');
        } else {
            this.showNotification('Selecciona un elemento para escalar', 'warning');
        }
    }

    scaleDown() {
        if (this.selectedElement) {
            const currentTransform = this.selectedElement.style.transform || '';
            const currentScale = this.getScaleFromTransform(currentTransform);
            const newScale = Math.max(currentScale / 1.2, 0.3);
            
            this.selectedElement.style.transform = currentTransform.replace(/scale\([^)]*\)/, '') + ` scale(${newScale})`;
            this.showNotification(`Elemento escalado a ${Math.round(newScale * 100)}%`, 'success');
        } else {
            this.showNotification('Selecciona un elemento para escalar', 'warning');
        }
    }

    resetTransform() {
        if (this.selectedElement) {
            this.selectedElement.style.transform = '';
            this.showNotification('Transformación restablecida', 'success');
        } else {
            this.showNotification('Selecciona un elemento para restablecer', 'warning');
        }
    }

    getRotationFromTransform(transform) {
        const match = transform.match(/rotate\(([^)]*)\)/);
        return match ? parseFloat(match[1]) : 0;
    }

    getScaleFromTransform(transform) {
        const match = transform.match(/scale\(([^)]*)\)/);
        return match ? parseFloat(match[1]) : 1;
    }

    bringToFront() {
        if (this.selectedElement) {
            this.selectedElement.style.zIndex = '999';
            this.showNotification('Elemento traído al frente', 'success');
        } else {
            this.showNotification('Selecciona un elemento para traer al frente', 'warning');
        }
    }

    sendToBack() {
        if (this.selectedElement) {
            this.selectedElement.style.zIndex = '1';
            this.showNotification('Elemento enviado al fondo', 'success');
        } else {
            this.showNotification('Selecciona un elemento para enviar al fondo', 'warning');
        }
    }

    async savePDF() {
        try {
            if (!this.pdfLibDoc) {
                this.showNotification('PDF-lib no está disponible. Descargando imagen de la página actual.', 'warning');
                this.downloadCurrentPageAsImage();
                return;
            }

            // Mostrar indicador de carga
            this.showNotification('Generando PDF con modificaciones...', 'info');

            // Crear una copia del documento PDF-lib para modificar
            const modifiedPdfDoc = await this.pdfLibDoc.copy();
            
            // Agregar todas las imágenes al PDF
            await this.addImagesToPDF(modifiedPdfDoc);
            
            // Agregar todos los dibujos al PDF
            await this.addDrawingsToPDF(modifiedPdfDoc);
            
            // Agregar todos los resaltados al PDF
            await this.addHighlightsToPDF(modifiedPdfDoc);
            
            // Agregar todos los cuadros de texto al PDF
            await this.addTextBoxesToPDF(modifiedPdfDoc);

            // Generar el PDF final
            const pdfBytes = await modifiedPdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'edited-pdf.pdf';
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('PDF guardado correctamente con todas las modificaciones', 'success');
        } catch (error) {
            this.showNotification('Error al guardar PDF: ' + error.message, 'error');
            console.error('Error saving PDF:', error);
        }
    }

    downloadCurrentPageAsImage() {
        try {
            // Obtener la primera página visible como imagen
            const firstPage = document.querySelector('.pdf-page-canvas');
            if (firstPage) {
                const dataURL = firstPage.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = 'pdf-page.png';
                link.href = dataURL;
                link.click();
                this.showNotification('Imagen de página descargada', 'success');
            } else {
                this.showNotification('No hay páginas para descargar', 'error');
            }
        } catch (error) {
            this.showNotification('Error al descargar imagen: ' + error.message, 'error');
        }
    }

    downloadPDF() {
        this.savePDF();
    }

    // Función para agregar imágenes al PDF
    async addImagesToPDF(pdfDoc) {
        try {
            const images = document.querySelectorAll('.draggable-image');
            console.log(`Agregando ${images.length} imágenes al PDF`);
            
            for (const img of images) {
                try {
                    // Obtener la página donde está la imagen
                    const pageNum = this.getPageNumberFromElement(img);
                    if (!pageNum || pageNum < 1 || pageNum > this.totalPages) {
                        console.warn('Página inválida para imagen:', pageNum);
                        continue;
                    }
                    
                    // Obtener la página PDF
                    const page = pdfDoc.getPage(pageNum - 1); // PDF-lib usa índice base 0
                    
                    // Obtener dimensiones de la página
                    const { width: pageWidth, height: pageHeight } = page.getSize();
                    
                    // Obtener posición y tamaño de la imagen en el DOM
                    const imgRect = img.getBoundingClientRect();
                    const pageContainer = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
                    const containerRect = pageContainer.getBoundingClientRect();
                    
                    // Calcular posición relativa en la página
                    const x = imgRect.left - containerRect.left;
                    const y = containerRect.bottom - imgRect.bottom; // Invertir Y porque PDF usa coordenadas desde abajo
                    
                    // Ajustar por el zoom
                    const scaleFactor = this.zoom;
                    const scaledX = x / scaleFactor;
                    const scaledY = y / scaleFactor;
                    const scaledWidth = imgRect.width / scaleFactor;
                    const scaledHeight = imgRect.height / scaleFactor;
                    
                    // Convertir imagen a base64
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    ctx.drawImage(img, 0, 0);
                    const imageDataUrl = canvas.toDataURL('image/png');
                    
                    // Agregar imagen al PDF
                    const pngImage = await pdfDoc.embedPng(imageDataUrl);
                    page.drawImage(pngImage, {
                        x: scaledX,
                        y: scaledY,
                        width: scaledWidth,
                        height: scaledHeight,
                    });
                    
                    console.log(`Imagen agregada a página ${pageNum} en posición (${scaledX}, ${scaledY})`);
                } catch (error) {
                    console.error('Error agregando imagen al PDF:', error);
                }
            }
        } catch (error) {
            console.error('Error en addImagesToPDF:', error);
        }
    }

    // Función para agregar dibujos al PDF
    async addDrawingsToPDF(pdfDoc) {
        try {
            console.log(`Agregando ${this.drawings.length} dibujos al PDF`);
            
            for (const drawing of this.drawings) {
                try {
                    const pageNum = drawing.pageNum;
                    if (!pageNum || pageNum < 1 || pageNum > this.totalPages) {
                        console.warn('Página inválida para dibujo:', pageNum);
                        continue;
                    }
                    
                    const page = pdfDoc.getPage(pageNum - 1); // PDF-lib usa índice base 0
                    const { width: pageWidth, height: pageHeight } = page.getSize();
                    
                    // Los dibujos ya están almacenados con coordenadas originales (sin zoom)
                    const scaleFactor = 1; // No necesitamos ajustar porque ya son coordenadas originales
                    
                    if (drawing.type === 'path') {
                        // Dibujo a mano alzada - convertir path SVG a líneas PDF
                        const svgPath = drawing.pathData;
                        console.log(`Convirtiendo dibujo a mano alzada en página ${pageNum}`);
                        
                        // Parsear el path SVG y convertir a líneas
                        const pathCommands = this.parseSVGPath(svgPath);
                        if (pathCommands && pathCommands.length > 1) {
                            for (let i = 0; i < pathCommands.length - 1; i++) {
                                const start = pathCommands[i];
                                const end = pathCommands[i + 1];
                                
                                // Convertir coordenadas
                                const x1 = start.x / scaleFactor;
                                const y1 = (pageHeight - start.y / scaleFactor);
                                const x2 = end.x / scaleFactor;
                                const y2 = (pageHeight - end.y / scaleFactor);
                                
                                // Dibujar línea
                                page.drawLine({
                                    start: { x: x1, y: y1 },
                                    end: { x: x2, y: y2 },
                                    thickness: parseInt(drawing.strokeWidth) || 2,
                                    color: PDFLib.rgb(0, 0, 0),
                                });
                            }
                            console.log(`Dibujo path convertido a ${pathCommands.length - 1} líneas`);
                        }
                    } else if (drawing.type === 'line') {
                        // Línea
                        const x1 = drawing.x1 / scaleFactor;
                        const y1 = (pageHeight - drawing.y1 / scaleFactor);
                        const x2 = drawing.x2 / scaleFactor;
                        const y2 = (pageHeight - drawing.y2 / scaleFactor);
                        
                        page.drawLine({
                            start: { x: x1, y: y1 },
                            end: { x: x2, y: y2 },
                            thickness: parseInt(drawing.strokeWidth) || 2,
                            color: PDFLib.rgb(0, 0, 0), // Negro usando rgb()
                        });
                    } else if (drawing.type === 'rectangle') {
                        // Rectángulo
                        const x = drawing.x / scaleFactor;
                        const y = (pageHeight - drawing.y / scaleFactor) - (drawing.height / scaleFactor);
                        const width = drawing.width / scaleFactor;
                        const height = drawing.height / scaleFactor;
                        
                        page.drawRectangle({
                            x: x,
                            y: y,
                            width: width,
                            height: height,
                            borderColor: PDFLib.rgb(0, 0, 0), // Negro usando rgb()
                            borderWidth: parseInt(drawing.strokeWidth) || 2,
                        });
                    } else if (drawing.type === 'circle') {
                        // Círculo
                        const centerX = drawing.centerX / scaleFactor;
                        const centerY = (pageHeight - drawing.centerY / scaleFactor);
                        const radius = drawing.radius / scaleFactor;
                        
                        page.drawCircle({
                            x: centerX,
                            y: centerY,
                            size: radius,
                            borderColor: PDFLib.rgb(0, 0, 0), // Negro usando rgb()
                            borderWidth: parseInt(drawing.strokeWidth) || 2,
                        });
                    }
                    
                    console.log(`Dibujo ${drawing.type} agregado a página ${pageNum}`);
                } catch (error) {
                    console.error('Error agregando dibujo al PDF:', error);
                }
            }
        } catch (error) {
            console.error('Error en addDrawingsToPDF:', error);
        }
    }

    // Función para agregar resaltados al PDF
    async addHighlightsToPDF(pdfDoc) {
        try {
            console.log(`Agregando ${this.highlights.length} resaltados al PDF`);
            
            for (const highlight of this.highlights) {
                try {
                    const pageNum = highlight.pageNum;
                    if (!pageNum || pageNum < 1 || pageNum > this.totalPages) {
                        console.warn('Página inválida para resaltado:', pageNum);
                        continue;
                    }
                    
                    const page = pdfDoc.getPage(pageNum - 1); // PDF-lib usa índice base 0
                    const { width: pageWidth, height: pageHeight } = page.getSize();
                    
                    // Los resaltados ya están almacenados con coordenadas originales (sin zoom)
                    const scaleFactor = 1; // No necesitamos ajustar porque ya son coordenadas originales
                    
                    const x = highlight.left / scaleFactor;
                    const y = (pageHeight - highlight.top / scaleFactor) - (highlight.height / scaleFactor);
                    const width = highlight.width / scaleFactor;
                    const height = highlight.height / scaleFactor;
                    
                    // Validar que las coordenadas sean números válidos
                    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) || 
                        width <= 0 || height <= 0) {
                        console.warn('Coordenadas inválidas para resaltado:', { x, y, width, height, highlight });
                        continue;
                    }
                    
                    // Crear rectángulo de resaltado
                    page.drawRectangle({
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        color: PDFLib.rgb(1, 1, 0), // Amarillo usando rgb()
                        opacity: 0.3, // Semi-transparente
                    });
                    
                    console.log(`Resaltado agregado a página ${pageNum} en posición (${x}, ${y})`);
                } catch (error) {
                    console.error('Error agregando resaltado al PDF:', error);
                }
            }
        } catch (error) {
            console.error('Error en addHighlightsToPDF:', error);
        }
    }

    // Función para agregar cuadros de texto al PDF
    async addTextBoxesToPDF(pdfDoc) {
        try {
            const textBoxes = document.querySelectorAll('.text-box-container');
            console.log(`Agregando ${textBoxes.length} cuadros de texto al PDF`);
            
            for (const textBox of textBoxes) {
                try {
                    // Extraer información del cuadro de texto
                    const textArea = textBox.querySelector('textarea');
                    if (!textArea) continue;
                    
                    const text = textArea.value.trim();
                    if (!text) continue; // No agregar cuadros vacíos
                    
                    // Obtener posición y página
                    const rect = textBox.getBoundingClientRect();
                    const pageContainer = textBox.closest('.pdf-page-wrapper');
                    if (!pageContainer) continue;
                    
                    const pageNum = parseInt(pageContainer.id.replace('page-', ''));
                    if (!pageNum || pageNum < 1 || pageNum > this.totalPages) continue;
                    
                    const page = pdfDoc.getPage(pageNum - 1); // PDF-lib usa índice base 0
                    const { width: pageWidth, height: pageHeight } = page.getSize();
                    
                    // Calcular posición relativa al PDF
                    const overlay = pageContainer.querySelector('.pdf-page-overlay');
                    const overlayRect = overlay.getBoundingClientRect();
                    
                    const relativeX = (rect.left - overlayRect.left) / this.zoom;
                    const relativeY = (rect.top - overlayRect.top) / this.zoom;
                    
                    // Convertir coordenadas a sistema PDF-lib
                    const scaleFactor = pageWidth / overlayRect.width;
                    const x = relativeX * scaleFactor;
                    const y = pageHeight - (relativeY * scaleFactor) - (rect.height / this.zoom * scaleFactor);
                    
                    // Validar coordenadas
                    if (isNaN(x) || isNaN(y) || x < 0 || y < 0) {
                        console.warn('Coordenadas inválidas para cuadro de texto:', { x, y, textBox });
                        continue;
                    }
                    
                    // Agregar texto al PDF
                    page.drawText(text, {
                        x: x,
                        y: y,
                        size: parseInt(textArea.style.fontSize) || 12,
                        color: PDFLib.rgb(0, 0, 0), // Negro usando rgb()
                        font: await pdfDoc.embedFont('Helvetica'),
                    });
                    
                    console.log(`Cuadro de texto agregado a página ${pageNum}: "${text}"`);
                } catch (error) {
                    console.error('Error agregando cuadro de texto al PDF:', error);
                }
            }
        } catch (error) {
            console.error('Error en addTextBoxesToPDF:', error);
        }
    }



    // Función para parsear path SVG y convertir a puntos
    parseSVGPath(svgPath) {
        const points = [];
        
        // El path SVG tiene formato: "M x y L x y L x y ..."
        const commands = svgPath.split(/(?=[ML])/);
        
        for (const command of commands) {
            if (command.startsWith('M') || command.startsWith('L')) {
                const coords = command.substring(1).trim().split(/\s+/);
                if (coords.length >= 2) {
                    const x = parseFloat(coords[0]);
                    const y = parseFloat(coords[1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        points.push({ x, y });
                    }
                }
            }
        }
        
        return points;
    }

    // Funciones de modales (simplificadas)

    showServerInfoModal() {
        document.getElementById('serverInfoModal').style.display = 'block';
    }

    hideServerInfoModal() {
        document.getElementById('serverInfoModal').style.display = 'none';
    }

    // Funciones para estilos de texto (simplificadas)
    updateTextStyle(property, value) {
        // Implementar según necesidad
    }

    toggleTextStyle(property) {
        // Implementar según necesidad
    }

    setDrawingColor(color) {
        // Implementar según necesidad
    }

    setDrawingWidth(width) {
        // Implementar según necesidad
    }

    // Funciones de transformación (simplificadas)
    rotateSelection(angle) {
        this.showNotification('Rotar selección', 'success');
    }

    flipSelection(direction) {
        this.showNotification('Voltear selección', 'success');
    }

    bringToFront() {
        this.showNotification('Traer al frente', 'success');
    }

    sendToBack() {
        this.showNotification('Enviar atrás', 'success');
    }

    saveDrawingState(pageNum) {
        if (this.currentDrawing && this.currentDrawing.length > 0) {
            // Crear un path SVG con los puntos dibujados
            const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
            if (overlay) {
                // Crear o obtener el contenedor SVG
                let svgContainer = overlay.querySelector('svg.drawing-container');
                if (!svgContainer) {
                    svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svgContainer.setAttribute('class', 'drawing-container');
                    svgContainer.style.position = 'absolute';
                    svgContainer.style.top = '0';
                    svgContainer.style.left = '0';
                    svgContainer.style.width = '100%';
                    svgContainer.style.height = '100%';
                    svgContainer.style.pointerEvents = 'none';
                    svgContainer.style.zIndex = '5';
                    overlay.appendChild(svgContainer);
                }
                
                // Aplicar transform de escala al contenedor SVG
                svgContainer.style.transform = `scale(${this.zoom})`;
                svgContainer.style.transformOrigin = 'top left';
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.id = `drawing-path-${pageNum}-${Date.now()}`;
                path.setAttribute('class', 'drawing-path');
                
                // Crear el path data desde los puntos (mantener coordenadas originales)
                let pathData = '';
                if (this.currentDrawing.length > 0) {
                    console.log('Creando path con zoom:', this.zoom, 'puntos originales:', this.currentDrawing.length);
                    pathData = `M ${this.currentDrawing[0].x} ${this.currentDrawing[0].y}`;
                    console.log('Primer punto original:', this.currentDrawing[0].x, this.currentDrawing[0].y);
                    for (let i = 1; i < this.currentDrawing.length; i++) {
                        pathData += ` L ${this.currentDrawing[i].x} ${this.currentDrawing[i].y}`;
                    }
                }
                
                path.setAttribute('d', pathData);
                path.style.stroke = '#000000';
                path.style.strokeWidth = '2';
                path.style.fill = 'none';
                path.style.pointerEvents = 'auto';
                path.style.cursor = 'pointer';
                
                // Crear un path invisible más grueso para el área de click
                const clickPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                clickPath.setAttribute('d', pathData);
                clickPath.style.stroke = 'transparent';
                clickPath.style.strokeWidth = '12';
                clickPath.style.fill = 'none';
                clickPath.style.pointerEvents = 'auto';
                clickPath.style.cursor = 'pointer';
                
                // Agregar evento de click para borrar al path invisible
                clickPath.addEventListener('click', (e) => {
                    console.log('Click detectado en path:', path.id, 'herramienta actual:', this.currentTool);
                    console.log('Zoom actual:', this.zoom, 'Coordenadas click:', e.clientX, e.clientY);
                    if (this.currentTool === 'eraser') {
                        e.stopPropagation();
                        e.preventDefault();
                        this.removeDrawing(path.id);
                    }
                });
                
                // También agregar mousedown para mejor detección
                clickPath.addEventListener('mousedown', (e) => {
                    console.log('Mousedown detectado en path:', path.id, 'herramienta actual:', this.currentTool);
                    if (this.currentTool === 'eraser') {
                        e.stopPropagation();
                        e.preventDefault();
                        this.removeDrawing(path.id);
                    }
                });
                
                // Agregar ambos paths al contenedor
                svgContainer.appendChild(path);
                svgContainer.appendChild(clickPath);
                
                // Guardar en localStorage
                const drawingData = {
                    id: path.id,
                    type: 'path',
                    pageNum: pageNum,
                    pathData: pathData,
                    stroke: '#000000',
                    strokeWidth: '2',
                    fill: 'none',
                    zoom: this.zoom
                };
                
                this.drawings.push(drawingData);
                this.saveDrawingsToStorage();
                
                console.log('Dibujo guardado:', drawingData);
            }
        }
        
        this.currentDrawing = [];
    }

    startShapeDrawing(x, y, pageNum) {
        this.isDrawingShape = true;
        this.shapeStart = { x, y };
        this.currentShape = {
            type: this.currentTool,
            startX: x,
            startY: y,
            pageNum: pageNum
        };
        console.log('Iniciando forma:', this.currentTool, 'en:', x, y, 'página:', pageNum);
    }

    updateShapeDrawing(x, y, pageNum) {
        if (this.isDrawingShape && this.currentShape) {
            this.currentShape.endX = x;
            this.currentShape.endY = y;
            this.updateShapePreview(pageNum);
        }
    }

    finishShapeDrawing(pageNum) {
        if (this.isDrawingShape && this.currentShape) {
            this.isDrawingShape = false;
            
            // Limpiar preview antes de crear la forma final
            this.clearShapePreview(pageNum);
            
            this.createShapeElement(this.currentShape);
            this.currentShape = null;
        }
    }
    
    createShapeElement(shapeData) {
        const overlay = document.querySelector(`#page-${shapeData.pageNum} .pdf-page-overlay`);
        if (!overlay) return;
        
        // Crear o obtener el contenedor SVG
        let svgContainer = overlay.querySelector('svg.drawing-container');
        if (!svgContainer) {
            svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgContainer.setAttribute('class', 'drawing-container');
            svgContainer.style.position = 'absolute';
            svgContainer.style.top = '0';
            svgContainer.style.left = '0';
            svgContainer.style.width = '100%';
            svgContainer.style.height = '100%';
            svgContainer.style.pointerEvents = 'none';
            svgContainer.style.zIndex = '5';
            overlay.appendChild(svgContainer);
        }
        
        // Aplicar transform de escala al contenedor SVG
        svgContainer.style.transform = `scale(${this.zoom})`;
        svgContainer.style.transformOrigin = 'top left';
        
        let shapeElement;
        let drawingData;
        
        if (shapeData.type === 'line') {
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            
            shapeElement.setAttribute('x1', shapeData.startX);
            shapeElement.setAttribute('y1', shapeData.startY);
            shapeElement.setAttribute('x2', shapeData.endX);
            shapeElement.setAttribute('y2', shapeData.endY);
            shapeElement.style.stroke = document.getElementById('strokeColor').value || '#000000';
            shapeElement.style.strokeWidth = document.getElementById('strokeWidth').value || '2';
            
            drawingData = {
                id: `drawing-line-${shapeData.pageNum}-${Date.now()}`,
                type: 'line',
                pageNum: shapeData.pageNum,
                x1: shapeData.startX,
                y1: shapeData.startY,
                x2: shapeData.endX,
                y2: shapeData.endY,
                stroke: document.getElementById('strokeColor').value || '#000000',
                strokeWidth: document.getElementById('strokeWidth').value || '2',
                zoom: this.zoom
            };
            
        } else if (shapeData.type === 'rectangle') {
            const width = Math.abs(shapeData.endX - shapeData.startX);
            const height = Math.abs(shapeData.endY - shapeData.startY);
            const x = Math.min(shapeData.startX, shapeData.endX);
            const y = Math.min(shapeData.startY, shapeData.endY);
            
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            shapeElement.setAttribute('x', x);
            shapeElement.setAttribute('y', y);
            shapeElement.setAttribute('width', width);
            shapeElement.setAttribute('height', height);
            shapeElement.style.stroke = document.getElementById('strokeColor').value || '#000000';
            shapeElement.style.strokeWidth = document.getElementById('strokeWidth').value || '2';
            shapeElement.style.fill = 'none';
            
            drawingData = {
                id: `drawing-rectangle-${shapeData.pageNum}-${Date.now()}`,
                type: 'rectangle',
                pageNum: shapeData.pageNum,
                x: x,
                y: y,
                width: width,
                height: height,
                stroke: document.getElementById('strokeColor').value || '#000000',
                strokeWidth: document.getElementById('strokeWidth').value || '2',
                fill: 'none',
                zoom: this.zoom
            };
            
        } else if (shapeData.type === 'circle') {
            const radius = Math.sqrt(
                Math.pow(shapeData.endX - shapeData.startX, 2) + 
                Math.pow(shapeData.endY - shapeData.startY, 2)
            );
            
            shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shapeElement.setAttribute('cx', shapeData.startX);
            shapeElement.setAttribute('cy', shapeData.startY);
            shapeElement.setAttribute('r', radius);
            shapeElement.style.stroke = document.getElementById('strokeColor').value || '#000000';
            shapeElement.style.strokeWidth = document.getElementById('strokeWidth').value || '2';
            shapeElement.style.fill = 'none';
            
            drawingData = {
                id: `drawing-circle-${shapeData.pageNum}-${Date.now()}`,
                type: 'circle',
                pageNum: shapeData.pageNum,
                cx: shapeData.startX,
                cy: shapeData.startY,
                r: radius,
                stroke: document.getElementById('strokeColor').value || '#000000',
                strokeWidth: document.getElementById('strokeWidth').value || '2',
                fill: 'none',
                zoom: this.zoom
            };
        }
        
        if (shapeElement && drawingData) {
            shapeElement.id = drawingData.id;
            shapeElement.setAttribute('class', `drawing-${drawingData.type}`);
            shapeElement.style.pointerEvents = 'auto';
            shapeElement.style.cursor = 'pointer';
            
            // Agregar eventos para selección, movimiento y eliminación
            this.addShapeInteractivity(shapeElement, drawingData);
            
            svgContainer.appendChild(shapeElement);
            
            // Guardar en localStorage
            this.drawings.push(drawingData);
            this.saveDrawingsToStorage();
            
            console.log('Forma guardada:', drawingData);
        }
    }

    // Función para agregar interactividad a las formas
    addShapeInteractivity(shapeElement, drawingData) {
        // Evento de click para selección
            shapeElement.addEventListener('click', (e) => {
                    e.stopPropagation();
            this.selectShape(shapeElement, drawingData);
            });
            
        // Evento de mousedown para iniciar arrastre
            shapeElement.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
            
            if (this.currentTool === 'eraser') {
                    this.removeDrawing(shapeElement.id);
                return;
            }
            
            if (this.currentTool === 'select' || this.selectedShape === shapeElement) {
                this.startShapeDrag(e, shapeElement, drawingData);
            }
        });

        // Evento de touchstart para dispositivos móviles
        shapeElement.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            
            if (this.currentTool === 'eraser') {
                this.removeDrawing(shapeElement.id);
                return;
            }
            
            if (this.currentTool === 'select' || this.selectedShape === shapeElement) {
                this.startShapeDrag(e, shapeElement, drawingData);
            }
        }, { passive: false });
    }

    // Función para seleccionar una forma
    selectShape(shapeElement, drawingData) {
        // Deseleccionar forma anterior si existe
        if (this.selectedShape && this.selectedShape !== shapeElement) {
            this.deselectShape();
        }

        // Seleccionar nueva forma
        this.selectedShape = shapeElement;
        this.selectedElement = shapeElement;
        
        // Agregar clase de selección
        shapeElement.classList.add('selected-shape');
        
        // Crear handles de redimensionado si es necesario
        this.createShapeHandles(shapeElement, drawingData);
        
        console.log('Forma seleccionada:', shapeElement.id);
    }

    // Función para deseleccionar forma
    deselectShape() {
        if (this.selectedShape) {
            this.selectedShape.classList.remove('selected-shape');
            this.removeShapeHandles();
            this.selectedShape = null;
            this.selectedElement = null;
        }
    }

    // Función para iniciar arrastre de forma
    startShapeDrag(e, shapeElement, drawingData) {
        this.isDraggingShape = true;
        this.selectedShape = shapeElement;
        
        // Calcular offset considerando el zoom
        const rect = shapeElement.getBoundingClientRect();
        const overlay = document.querySelector(`#page-${drawingData.pageNum} .pdf-page-overlay`);
        const overlayRect = overlay.getBoundingClientRect();
        
        // Usar coordenadas del evento (táctil o mouse)
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Calcular posición relativa al overlay, considerando zoom
        const relativeX = (clientX - overlayRect.left) / this.zoom;
        const relativeY = (clientY - overlayRect.top) / this.zoom;
        
        // Calcular offset desde el centro de la forma
        const shapeCenterX = this.getShapeCenterX(shapeElement, drawingData);
        const shapeCenterY = this.getShapeCenterY(shapeElement, drawingData);
        
        this.dragOffset = {
            x: relativeX - shapeCenterX,
            y: relativeY - shapeCenterY
        };
        
        // Agregar eventos de movimiento y fin
        document.addEventListener('mousemove', this.handleShapeDrag.bind(this));
        document.addEventListener('mouseup', this.finishShapeDrag.bind(this));
        document.addEventListener('touchmove', this.handleShapeDrag.bind(this), { passive: false });
        document.addEventListener('touchend', this.finishShapeDrag.bind(this));
        
        e.preventDefault();
    }

    // Función para manejar el arrastre de forma
    handleShapeDrag(e) {
        if (!this.isDraggingShape || !this.selectedShape) return;
        
        e.preventDefault();
        
        // Encontrar los datos de la forma seleccionada
        const drawingData = this.drawings.find(d => d.id === this.selectedShape.id);
        if (!drawingData) return;
        
        const overlay = document.querySelector(`#page-${drawingData.pageNum} .pdf-page-overlay`);
        const overlayRect = overlay.getBoundingClientRect();
        
        // Usar coordenadas del evento (táctil o mouse)
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        // Calcular nueva posición considerando zoom
        const newX = (clientX - overlayRect.left) / this.zoom - this.dragOffset.x;
        const newY = (clientY - overlayRect.top) / this.zoom - this.dragOffset.y;
        
        // Actualizar posición de la forma según su tipo
        this.updateShapePosition(this.selectedShape, drawingData, newX, newY);
    }

    // Función para finalizar arrastre de forma
    finishShapeDrag(e) {
        if (this.isDraggingShape) {
            this.isDraggingShape = false;
            
            // Remover eventos
            document.removeEventListener('mousemove', this.handleShapeDrag.bind(this));
            document.removeEventListener('mouseup', this.finishShapeDrag.bind(this));
            document.removeEventListener('touchmove', this.handleShapeDrag.bind(this));
            document.removeEventListener('touchend', this.finishShapeDrag.bind(this));
            
            // Guardar cambios en localStorage
            this.saveDrawingsToStorage();
        }
    }

    // Función para obtener el centro X de una forma
    getShapeCenterX(shapeElement, drawingData) {
        switch (drawingData.type) {
            case 'line':
                return (drawingData.x1 + drawingData.x2) / 2;
            case 'rectangle':
                return drawingData.x + drawingData.width / 2;
            case 'circle':
                return drawingData.cx;
            default:
                return 0;
        }
    }

    // Función para obtener el centro Y de una forma
    getShapeCenterY(shapeElement, drawingData) {
        switch (drawingData.type) {
            case 'line':
                return (drawingData.y1 + drawingData.y2) / 2;
            case 'rectangle':
                return drawingData.y + drawingData.height / 2;
            case 'circle':
                return drawingData.cy;
            default:
                return 0;
        }
    }

    // Función para actualizar posición de forma
    updateShapePosition(shapeElement, drawingData, newX, newY) {
        const deltaX = newX - this.getShapeCenterX(shapeElement, drawingData);
        const deltaY = newY - this.getShapeCenterY(shapeElement, drawingData);
        
        switch (drawingData.type) {
            case 'line':
                // Actualizar datos
                drawingData.x1 += deltaX;
                drawingData.y1 += deltaY;
                drawingData.x2 += deltaX;
                drawingData.y2 += deltaY;
                
                // Actualizar elemento SVG
                shapeElement.setAttribute('x1', drawingData.x1);
                shapeElement.setAttribute('y1', drawingData.y1);
                shapeElement.setAttribute('x2', drawingData.x2);
                shapeElement.setAttribute('y2', drawingData.y2);
                break;
                
            case 'rectangle':
                // Actualizar datos
                drawingData.x += deltaX;
                drawingData.y += deltaY;
                
                // Actualizar elemento SVG
                shapeElement.setAttribute('x', drawingData.x);
                shapeElement.setAttribute('y', drawingData.y);
                break;
                
            case 'circle':
                // Actualizar datos
                drawingData.cx += deltaX;
                drawingData.cy += deltaY;
                
                // Actualizar elemento SVG
                shapeElement.setAttribute('cx', drawingData.cx);
                shapeElement.setAttribute('cy', drawingData.cy);
                break;
        }
        
        // Actualizar en el array de dibujos
        const index = this.drawings.findIndex(d => d.id === drawingData.id);
        if (index !== -1) {
            this.drawings[index] = drawingData;
        }
    }

    // Función para crear handles de redimensionado
    createShapeHandles(shapeElement, drawingData) {
        this.removeShapeHandles(); // Limpiar handles anteriores
        
        const handlesContainer = document.createElement('div');
        handlesContainer.className = 'shape-handles';
        handlesContainer.id = `handles-${shapeElement.id}`;
        
        // Crear handles según el tipo de forma
        if (drawingData.type === 'rectangle') {
            this.createRectangleHandles(handlesContainer, shapeElement, drawingData);
        } else if (drawingData.type === 'circle') {
            this.createCircleHandles(handlesContainer, shapeElement, drawingData);
        }
        
        // Agregar al overlay
        const overlay = document.querySelector(`#page-${drawingData.pageNum} .pdf-page-overlay`);
        if (overlay) {
            overlay.appendChild(handlesContainer);
        }
    }

    // Función para crear handles de rectángulo
    createRectangleHandles(container, shapeElement, drawingData) {
        const handles = [
            { pos: 'nw', x: drawingData.x, y: drawingData.y },
            { pos: 'ne', x: drawingData.x + drawingData.width, y: drawingData.y },
            { pos: 'sw', x: drawingData.x, y: drawingData.y + drawingData.height },
            { pos: 'se', x: drawingData.x + drawingData.width, y: drawingData.y + drawingData.height }
        ];
        
        handles.forEach(handle => {
            const handleEl = document.createElement('div');
            handleEl.className = `resize-handle resize-handle-${handle.pos}`;
            handleEl.style.position = 'absolute';
            handleEl.style.left = `${handle.x * this.zoom}px`;
            handleEl.style.top = `${handle.y * this.zoom}px`;
            handleEl.style.width = '8px';
            handleEl.style.height = '8px';
            handleEl.style.backgroundColor = '#007bff';
            handleEl.style.border = '1px solid white';
            handleEl.style.cursor = `${handle.pos}-resize`;
            handleEl.style.zIndex = '1000';
            
            container.appendChild(handleEl);
        });
    }

    // Función para crear handles de círculo
    createCircleHandles(container, shapeElement, drawingData) {
        const handleEl = document.createElement('div');
        handleEl.className = 'resize-handle resize-handle-radius';
        handleEl.style.position = 'absolute';
        handleEl.style.left = `${(drawingData.cx + drawingData.r) * this.zoom}px`;
        handleEl.style.top = `${drawingData.cy * this.zoom}px`;
        handleEl.style.width = '8px';
        handleEl.style.height = '8px';
        handleEl.style.backgroundColor = '#007bff';
        handleEl.style.border = '1px solid white';
        handleEl.style.cursor = 'ew-resize';
        handleEl.style.zIndex = '1000';
        
        container.appendChild(handleEl);
    }

    // Función para remover handles
    removeShapeHandles() {
        const existingHandles = document.querySelectorAll('.shape-handles');
        existingHandles.forEach(handle => handle.remove());
    }

    startHighlighting(x, y, pageNum) {
        this.isHighlighting = true;
        this.highlightStart = { x, y, pageNum };
        this.currentHighlight = this.createHighlightOverlay(x, y, x, y, pageNum);
        console.log('Iniciando resaltado en:', x, y, 'página:', pageNum);
    }

    updateHighlighting(x, y, pageNum) {
        if (this.isHighlighting && this.currentHighlight) {
            const startX = this.highlightStart.x;
            const startY = this.highlightStart.y;
            
            const left = Math.min(startX, x);
            const top = Math.min(startY, y);
            const width = Math.abs(x - startX);
            const height = Math.abs(y - startY);
            
            this.currentHighlight.style.left = left + 'px';
            this.currentHighlight.style.top = top + 'px';
            this.currentHighlight.style.width = width + 'px';
            this.currentHighlight.style.height = height + 'px';
        }
    }

    finishHighlighting(pageNum) {
        if (this.isHighlighting) {
            this.isHighlighting = false;
            if (this.currentHighlight) {
                // Solo guardar si el highlight tiene un tamaño mínimo
                const width = parseInt(this.currentHighlight.style.width);
                const height = parseInt(this.currentHighlight.style.height);
                
                if (width > 10 && height > 10) {
                    // Guardar en el array de resaltados persistentes
                    const left = parseFloat(this.currentHighlight.style.left) || 0;
                    const top = parseFloat(this.currentHighlight.style.top) || 0;
                    const width = parseFloat(this.currentHighlight.style.width) || 0;
                    const height = parseFloat(this.currentHighlight.style.height) || 0;
                    
                    // Validar que las coordenadas sean números válidos
                    if (isNaN(left) || isNaN(top) || isNaN(width) || isNaN(height)) {
                        console.warn('Coordenadas inválidas para resaltado:', { left, top, width, height });
                        this.currentHighlight.remove();
                        return;
                    }
                    
                    const highlightData = {
                        id: this.currentHighlight.id,
                        pageNum: pageNum,
                        left: left,
                        top: top,
                        width: width,
                        height: height,
                        zoom: this.zoom
                    };
                    
                    this.highlights.push(highlightData);
                    this.saveHighlightsToStorage();
                    this.showNotification('Texto resaltado', 'success');
                    console.log('Resaltado guardado:', highlightData);
                } else {
                    // Eliminar highlight muy pequeño
                    this.currentHighlight.remove();
                }
            }
            this.currentHighlight = null;
        }
    }

    createHighlightOverlay(x1, y1, x2, y2, pageNum) {
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        if (!overlay) return null;
        
        const highlightDiv = document.createElement('div');
        highlightDiv.className = 'highlight-overlay';
        highlightDiv.id = `highlight-${pageNum}-${Date.now()}`;
        
        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        highlightDiv.style.cssText = `
            position: absolute;
            left: ${left}px;
            top: ${top}px;
            width: ${width}px;
            height: ${height}px;
            background-color: rgba(255, 255, 0, 0.4);
            border: none;
            pointer-events: auto;
            z-index: 10;
            border-radius: 2px;
            cursor: pointer;
        `;
        
        // Agregar evento de click directo al highlight
        highlightDiv.addEventListener('click', (e) => {
            if (this.currentTool === 'eraser') {
                e.stopPropagation();
                this.removeHighlight(highlightDiv.id);
            }
        });
        
        overlay.appendChild(highlightDiv);
        console.log('Highlight creado:', highlightDiv.id, 'en posición:', left, top, 'tamaño:', width, height);
        
        return highlightDiv;
    }
    
    // Función para eliminar un resaltado específico
    removeHighlight(highlightId) {
        // Encontrar el resaltado en el array
        const index = this.highlights.findIndex(h => h.id === highlightId);
        if (index !== -1) {
            // Eliminar del array
            this.highlights.splice(index, 1);
            // Guardar en localStorage
            this.saveHighlightsToStorage();
            console.log('Resaltado eliminado del array:', highlightId);
        }
        
        // Eliminar del DOM
        const highlightElement = document.getElementById(highlightId);
        if (highlightElement) {
            highlightElement.remove();
            this.showNotification('Resaltado eliminado', 'success');
            console.log('Resaltado eliminado del DOM:', highlightId);
        }
    }

    updateHighlightOverlay(pageNum) {
        const highlightDiv = document.querySelector(`#highlight-${pageNum}`);
        if (highlightDiv && this.highlightPoints.length > 1) {
            const firstPoint = this.highlightPoints[0];
            const lastPoint = this.highlightPoints[this.highlightPoints.length - 1];
            
            const left = Math.min(firstPoint.x, lastPoint.x);
            const top = Math.min(firstPoint.y, lastPoint.y);
            const width = Math.abs(lastPoint.x - firstPoint.x);
            const height = Math.abs(lastPoint.y - firstPoint.y);
            
            highlightDiv.style.left = left + 'px';
            highlightDiv.style.top = top + 'px';
            highlightDiv.style.width = width + 'px';
            highlightDiv.style.height = height + 'px';
        }
    }

    saveHighlightState(pageNum) {
        // El resaltado ya está guardado como elemento DOM
        // Solo necesitamos asegurarnos de que sea clickeable para el borrador
        if (this.currentHighlight) {
            this.currentHighlight.style.pointerEvents = 'auto';
            console.log('Highlight guardado:', this.currentHighlight.id);
            
            // Los resaltados se manejan automáticamente con localStorage
        }
    }
    
    

    startTextBoxDrawing(x, y, pageNum) {
        // Solo crear si no hay un cuadro de texto siendo editado
        if (this.isEditingTextBox) return;
        
        this.isDrawingTextBox = true;
        this.isEditingTextBox = true;
        this.textBoxStart = { x, y, pageNum };
        
        const overlay = document.querySelector(`#page-${pageNum} .pdf-page-overlay`);
        const textBox = document.createElement('div');
        textBox.className = 'text-box-container';
        textBox.id = `textbox-${pageNum}-${Date.now()}`;
        textBox.style.position = 'absolute';
        textBox.style.left = x + 'px';
        textBox.style.top = y + 'px';
        textBox.style.width = '200px';
        textBox.style.height = '100px';
        textBox.style.border = 'none';
        textBox.style.borderRadius = '4px';
        textBox.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        textBox.style.zIndex = '4';
        textBox.style.padding = '10px';
        textBox.style.cursor = 'move';
        textBox.style.boxSizing = 'border-box';
        
        // Crear área de texto editable
        const textArea = document.createElement('textarea');
        textArea.placeholder = 'Escriba aquí...';
        textArea.style.width = '100%';
        textArea.style.height = '100%';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.resize = 'none';
        textArea.style.backgroundColor = 'transparent';
        textArea.style.fontSize = document.getElementById('fontSize').value + 'px';
        textArea.style.fontFamily = document.getElementById('fontFamily').value;
        textArea.style.color = document.getElementById('textColor').value;
        textArea.style.pointerEvents = 'auto';
        textArea.style.userSelect = 'text';
        
        // Prevenir que el clic en el textarea cree otro cuadro
        textArea.addEventListener('click', (e) => {
            e.stopPropagation();
            textArea.focus();
        });
        
        // Permitir edición inmediata
        textArea.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            textArea.focus();
        });
        
        // Permitir edición solo con doble clic
        textArea.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            textArea.focus();
        });
        
        // Manejar cambios en el texto
        textArea.addEventListener('input', (e) => {
            e.stopPropagation();
        });
        
        // Manejar teclas especiales
        textArea.addEventListener('keydown', (e) => {
            e.stopPropagation();
            // Permitir Escape para salir del modo edición
            if (e.key === 'Escape') {
                textArea.blur();
                this.isEditingTextBox = false;
            }
        });
        
        textBox.appendChild(textArea);
        overlay.appendChild(textBox);
        
        // Hacer el cuadro de texto arrastrable
        this.makeDraggable(textBox);
        
        // Permitir redimensionar
        this.makeResizable(textBox);
        
        // Enfocar el área de texto
        textArea.focus();
        
        this.isDrawingTextBox = false;
        this.showNotification('Cuadro de texto creado', 'success');
    }

    // Eventos táctiles (simplificados)
    onPageTouchStart(e, pageNum) {
        const touch = e.touches[0];
        const rect = e.target.getBoundingClientRect();
        // Para resaltados, usar coordenadas absolutas (sin dividir por zoom)
        const xAbsolute = touch.clientX - rect.left;
        const yAbsolute = touch.clientY - rect.top;
        // Para dibujos, usar coordenadas normalizadas (divididas por zoom)
        const xNormalized = xAbsolute / this.zoom;
        const yNormalized = yAbsolute / this.zoom;
        this.onPageMouseDown({ clientX: touch.clientX, clientY: touch.clientY, target: e.target }, pageNum);
    }

    onPageTouchMove(e, pageNum) {
        const touch = e.touches[0];
        const rect = e.target.getBoundingClientRect();
        // Para resaltados, usar coordenadas absolutas (sin dividir por zoom)
        const xAbsolute = touch.clientX - rect.left;
        const yAbsolute = touch.clientY - rect.top;
        // Para dibujos, usar coordenadas normalizadas (divididas por zoom)
        const xNormalized = xAbsolute / this.zoom;
        const yNormalized = yAbsolute / this.zoom;
        this.onPageMouseMove({ clientX: touch.clientX, clientY: touch.clientY, target: e.target }, pageNum);
    }

    onPageTouchEnd(e, pageNum) {
        const touch = e.changedTouches[0];
        const rect = e.target.getBoundingClientRect();
        // Para resaltados, usar coordenadas absolutas (sin dividir por zoom)
        const xAbsolute = touch.clientX - rect.left;
        const yAbsolute = touch.clientY - rect.top;
        // Para dibujos, usar coordenadas normalizadas (divididas por zoom)
        const xNormalized = xAbsolute / this.zoom;
        const yNormalized = yAbsolute / this.zoom;
        this.onPageMouseUp({ clientX: touch.clientX, clientY: touch.clientY, target: e.target }, pageNum);
    }
}

// Variable global para acceso desde HTML
let pdfEditor;

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco más para asegurar que todos los elementos estén disponibles
    setTimeout(() => {
        pdfEditor = new PDFEditor();
    }, 100);
});
