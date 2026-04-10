class PDFEditor {
    constructor() {
        this.currentTool = 'select';
        this.currentPage = 1;
        this.totalPages = 0;
        this.zoom = 1;
        this.pdfDocument = null;
        this.pdfPage = null;
        this.fabricCanvas = null;
        this.pdfCanvas = null;
        this.canvas = null;
        this.isDrawing = false;
        this.clipboard = null;
        this.history = [];
        this.historyIndex = -1;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeFabricCanvas();
        this.setupPDFJS();
    }

    setupPDFJS() {
        // Configurar PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    initializeFabricCanvas() {
        const container = document.querySelector('.pdf-container');
        this.fabricCanvas = new fabric.Canvas('fabricCanvas', {
            width: 800,
            height: 600,
            selection: true,
            preserveObjectStacking: true,
            backgroundColor: 'transparent',
            selectionColor: 'rgba(100, 150, 255, 0.3)',
            selectionBorderColor: '#667eea',
            selectionLineWidth: 2,
            allowTouchScrolling: false,
            skipTargetFind: false,
            perPixelTargetFind: true
        });

        // Configurar eventos del canvas
        this.setupCanvasEvents();
    }

    setupCanvasEvents() {
        // Eventos de dibujo
        this.fabricCanvas.on('mouse:down', (e) => this.onMouseDown(e));
        this.fabricCanvas.on('mouse:move', (e) => this.onMouseMove(e));
        this.fabricCanvas.on('mouse:up', (e) => this.onMouseUp(e));
        
        // Eventos de selección
        this.fabricCanvas.on('selection:created', (e) => this.onSelectionCreated(e));
        this.fabricCanvas.on('selection:updated', (e) => this.onSelectionUpdated(e));
        this.fabricCanvas.on('selection:cleared', (e) => this.onSelectionCleared(e));
        
        // Eventos de objeto
        this.fabricCanvas.on('object:added', () => this.saveState());
        this.fabricCanvas.on('object:removed', () => this.saveState());
        this.fabricCanvas.on('object:modified', () => this.saveState());

        // Soporte para eventos táctiles
        this.fabricCanvas.on('touch:start', (e) => this.onMouseDown(e));
        this.fabricCanvas.on('touch:move', (e) => this.onMouseMove(e));
        this.fabricCanvas.on('touch:end', (e) => this.onMouseUp(e));
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
            this.updateTextStyle('fill', e.target.value);
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
            this.toggleTextStyle('underline');
        });

        document.getElementById('strikethroughBtn').addEventListener('click', () => {
            this.toggleTextStyle('linethrough');
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
        document.getElementById('rotateLeftBtn').addEventListener('click', () => this.rotateSelection(-90));
        document.getElementById('rotateRightBtn').addEventListener('click', () => this.rotateSelection(90));
        document.getElementById('flipHorizontalBtn').addEventListener('click', () => this.flipSelection('horizontal'));
        document.getElementById('flipVerticalBtn').addEventListener('click', () => this.flipSelection('vertical'));
        document.getElementById('bringToFrontBtn').addEventListener('click', () => this.bringToFront());
        document.getElementById('sendToBackBtn').addEventListener('click', () => this.sendToBack());

        // Controles de página
        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());

        // Carga de imágenes
        document.getElementById('imageTool').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });

        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.loadImage(e.target.files[0]);
        });

        // Guardado
        document.getElementById('savePdfBtn').addEventListener('click', () => this.savePDF());
        document.getElementById('downloadPdfBtn').addEventListener('click', () => this.downloadPDF());

        // Carga de proyectos
        document.getElementById('loadProjectBtn').addEventListener('click', () => this.showProjectModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.hideProjectModal());
        document.querySelector('.close').addEventListener('click', () => this.hideProjectModal());
        
        // Información del servidor
        document.getElementById('serverInfoBtn').addEventListener('click', () => this.showServerInfoModal());
        document.getElementById('closeServerInfoBtn').addEventListener('click', () => this.hideServerInfoModal());
        
        // Cerrar modal al hacer clic fuera
        document.getElementById('projectModal').addEventListener('click', (e) => {
            if (e.target.id === 'projectModal') {
                this.hideProjectModal();
            }
        });
        
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
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.totalPages = this.pdfDocument.numPages;
            
            await this.renderPage(1);
            this.updatePageInfo();
            this.enableControls();
            
            this.showNotification('PDF cargado correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al cargar el PDF: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async renderPage(pageNum) {
        if (!this.pdfDocument) return;

        try {
            this.currentPage = pageNum;
            this.pdfPage = await this.pdfDocument.getPage(pageNum);
            
            const viewport = this.pdfPage.getViewport({ scale: this.zoom });
            
            // Configurar canvas PDF
            this.pdfCanvas = document.getElementById('pdfCanvas');
            const context = this.pdfCanvas.getContext('2d');
            this.pdfCanvas.height = viewport.height;
            this.pdfCanvas.width = viewport.width;
            
            // Limpiar canvas antes de renderizar
            context.clearRect(0, 0, this.pdfCanvas.width, this.pdfCanvas.height);
            
            // Renderizar página PDF
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await this.pdfPage.render(renderContext).promise;
            
            // Configurar canvas Fabric después de renderizar el PDF
            this.fabricCanvas.setDimensions({
                width: viewport.width,
                height: viewport.height
            });
            
            // Asegurar que el canvas Fabric esté exactamente superpuesto
            this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            this.fabricCanvas.renderAll();
            
            this.updatePageInfo();
            
            console.log(`Página ${pageNum} renderizada correctamente. Dimensiones: ${viewport.width}x${viewport.height}`);
        } catch (error) {
            console.error('Error al renderizar página:', error);
            this.showNotification('Error al cargar la página: ' + error.message, 'error');
        }
    }

    setTool(tool) {
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
        
        // Configurar canvas según la herramienta
        this.configureTool(tool);
        
        console.log(`Herramienta activada: ${tool}`);
    }

    configureTool(tool) {
        // Desactivar todas las funcionalidades primero
        this.fabricCanvas.isDrawingMode = false;
        this.fabricCanvas.selection = true;
        this.fabricCanvas.defaultCursor = 'default';
        this.fabricCanvas.hoverCursor = 'move';
        
        switch (tool) {
            case 'select':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = true;
                this.fabricCanvas.defaultCursor = 'default';
                this.fabricCanvas.hoverCursor = 'move';
                document.body.className = 'select-mode';
                break;
                
            case 'textSelection':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.fabricCanvas.defaultCursor = 'text';
                this.fabricCanvas.hoverCursor = 'text';
                document.body.className = 'text-selection-mode';
                this.enableTextSelection();
                break;
                
            case 'hand':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.fabricCanvas.defaultCursor = 'grab';
                this.fabricCanvas.hoverCursor = 'grab';
                document.body.className = 'hand-mode';
                this.enablePanMode();
                break;
                
            case 'textEdit':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.fabricCanvas.defaultCursor = 'text';
                this.fabricCanvas.hoverCursor = 'text';
                document.body.className = 'text-edit-mode';
                this.enableTextEditing();
                break;
                
            case 'textBox':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.fabricCanvas.defaultCursor = 'crosshair';
                this.fabricCanvas.hoverCursor = 'crosshair';
                document.body.className = 'textbox-mode';
                break;
                
            case 'textAdd':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.fabricCanvas.defaultCursor = 'crosshair';
                this.fabricCanvas.hoverCursor = 'crosshair';
                document.body.className = 'text-add-mode';
                break;
                
            case 'draw':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush.width = parseInt(document.getElementById('strokeWidth').value);
                this.fabricCanvas.freeDrawingBrush.color = document.getElementById('strokeColor').value;
                this.fabricCanvas.defaultCursor = 'crosshair';
                document.body.className = 'drawing-mode';
                break;
                
            case 'eraser':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush = new fabric.EraserBrush(this.fabricCanvas);
                this.fabricCanvas.freeDrawingBrush.width = parseInt(document.getElementById('strokeWidth').value);
                this.fabricCanvas.defaultCursor = 'crosshair';
                document.body.className = 'eraser-mode';
                break;
                
            case 'image':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = true;
                this.fabricCanvas.defaultCursor = 'copy';
                document.body.className = 'image-mode';
                break;
                
            case 'line':
            case 'rectangle':
            case 'circle':
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = false;
                this.fabricCanvas.defaultCursor = 'crosshair';
                document.body.className = 'shape-mode';
                break;
                
            case 'highlight':
                this.fabricCanvas.isDrawingMode = true;
                this.fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(this.fabricCanvas);
                this.fabricCanvas.freeDrawingBrush.width = 20;
                this.fabricCanvas.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.3)';
                this.fabricCanvas.defaultCursor = 'crosshair';
                document.body.className = 'highlight-mode';
                break;
                
            default:
                this.fabricCanvas.isDrawingMode = false;
                this.fabricCanvas.selection = true;
                document.body.className = 'default-mode';
        }
    }

    onMouseDown(e) {
        const pointer = this.fabricCanvas.getPointer(e.e);
        
        switch (this.currentTool) {
            case 'textAdd':
                this.addTextAtPosition(e);
                break;
            case 'textBox':
                this.startTextBoxDrawing(e);
                break;
            case 'textEdit':
                this.handleTextEditClick(e);
                break;
            case 'line':
            case 'rectangle':
            case 'circle':
                this.startShapeDrawing(e);
                break;
            case 'image':
                this.handleImageClick();
                break;
            case 'hand':
                this.startPanning(e);
                break;
            default:
                // Para herramientas de selección, dejar que Fabric maneje el evento
                break;
        }
    }

    startShapeDrawing(e) {
        const pointer = this.fabricCanvas.getPointer(e.e);
        this.isDrawing = true;
        this.startPoint = pointer;

        switch (this.currentTool) {
            case 'line':
                this.currentShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                    stroke: document.getElementById('strokeColor').value,
                    strokeWidth: parseInt(document.getElementById('strokeWidth').value),
                    originX: 'left',
                    originY: 'top'
                });
                break;
            case 'rectangle':
                this.currentShape = new fabric.Rect({
                    left: pointer.x,
                    top: pointer.y,
                    width: 0,
                    height: 0,
                    fill: 'transparent',
                    stroke: document.getElementById('strokeColor').value,
                    strokeWidth: parseInt(document.getElementById('strokeWidth').value),
                    originX: 'left',
                    originY: 'top'
                });
                break;
            case 'circle':
                this.currentShape = new fabric.Circle({
                    left: pointer.x,
                    top: pointer.y,
                    radius: 0,
                    fill: 'transparent',
                    stroke: document.getElementById('strokeColor').value,
                    strokeWidth: parseInt(document.getElementById('strokeWidth').value),
                    originX: 'left',
                    originY: 'top'
                });
                break;
        }

        if (this.currentShape) {
            this.fabricCanvas.add(this.currentShape);
        }
    }

    onMouseMove(e) {
        if (this.isDrawing && this.currentShape) {
            const pointer = this.fabricCanvas.getPointer(e.e);
            
            switch (this.currentTool) {
                case 'line':
                    this.currentShape.set({
                        x2: pointer.x,
                        y2: pointer.y
                    });
                    break;
                case 'rectangle':
                    const width = pointer.x - this.startPoint.x;
                    const height = pointer.y - this.startPoint.y;
                    this.currentShape.set({
                        width: Math.abs(width),
                        height: Math.abs(height),
                        left: width < 0 ? pointer.x : this.startPoint.x,
                        top: height < 0 ? pointer.y : this.startPoint.y
                    });
                    break;
                case 'circle':
                    const radius = Math.sqrt(
                        Math.pow(pointer.x - this.startPoint.x, 2) + 
                        Math.pow(pointer.y - this.startPoint.y, 2)
                    );
                    this.currentShape.set({
                        radius: radius
                    });
                    break;
            }
            
            this.fabricCanvas.renderAll();
        }
    }

    onMouseUp(e) {
        if (this.isDrawing && this.currentShape) {
            this.isDrawing = false;
            this.currentShape = null;
            this.saveState();
        }
    }

    addTextAtPosition(e) {
        const pointer = this.fabricCanvas.getPointer(e.e);
        const text = prompt('Ingrese el texto:');
        
        if (text) {
            const textObject = new fabric.Text(text, {
                left: pointer.x,
                top: pointer.y,
                fontFamily: document.getElementById('fontFamily').value,
                fontSize: parseInt(document.getElementById('fontSize').value),
                fill: document.getElementById('textColor').value,
                fontWeight: 'normal',
                fontStyle: 'normal',
                originX: 'left',
                originY: 'top'
            });
            
            this.fabricCanvas.add(textObject);
            this.fabricCanvas.setActiveObject(textObject);
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    loadImage(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                // Redimensionar imagen si es muy grande
                const maxWidth = 300;
                const maxHeight = 300;
                
                if (img.width > maxWidth || img.height > maxHeight) {
                    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
                    img.scale(scale);
                }
                
                // Posicionar en el centro del PDF visible
                const canvasCenterX = this.fabricCanvas.width / 2;
                const canvasCenterY = this.fabricCanvas.height / 2;
                
                img.set({
                    left: canvasCenterX - (img.width * img.scaleX) / 2,
                    top: canvasCenterY - (img.height * img.scaleY) / 2,
                    originX: 'center',
                    originY: 'center'
                });
                
                this.fabricCanvas.add(img);
                this.fabricCanvas.setActiveObject(img);
                this.fabricCanvas.renderAll();
                this.saveState();
            });
        };
        reader.readAsDataURL(file);
    }

    updateTextStyle(property, value) {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject && activeObject.type === 'text') {
            activeObject.set(property, value);
            this.fabricCanvas.renderAll();
        }
    }

    toggleTextStyle(property) {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject && activeObject.type === 'text') {
            let currentValue = activeObject.get(property);
            let newValue;
            
            switch (property) {
                case 'fontWeight':
                    newValue = currentValue === 'bold' ? 'normal' : 'bold';
                    break;
                case 'fontStyle':
                    newValue = currentValue === 'italic' ? 'normal' : 'italic';
                    break;
                case 'underline':
                    newValue = !currentValue;
                    break;
            }
            
            activeObject.set(property, newValue);
            this.fabricCanvas.renderAll();
        }
    }

    setDrawingColor(color) {
        this.fabricCanvas.freeDrawingBrush.color = color;
    }

    setDrawingWidth(width) {
        this.fabricCanvas.freeDrawingBrush.width = width;
    }

    copySelection() {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            this.clipboard = activeObject.clone();
            this.showNotification('Elemento copiado', 'success');
        }
    }

    cutSelection() {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            this.clipboard = activeObject.clone();
            this.fabricCanvas.remove(activeObject);
            this.showNotification('Elemento cortado', 'success');
        }
    }

    pasteSelection() {
        if (this.clipboard) {
            this.clipboard.clone((cloned) => {
                cloned.set({
                    left: cloned.left + 20,
                    top: cloned.top + 20
                });
                this.fabricCanvas.add(cloned);
                this.fabricCanvas.setActiveObject(cloned);
                this.fabricCanvas.renderAll();
            });
            this.showNotification('Elemento pegado', 'success');
        }
    }

    deleteSelection() {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            this.fabricCanvas.remove(activeObject);
            this.showNotification('Elemento eliminado', 'success');
        }
    }

    saveState() {
        const state = JSON.stringify(this.fabricCanvas.toJSON());
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex++;
        
        // Limitar historial a 50 estados
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.fabricCanvas.loadFromJSON(this.history[this.historyIndex], () => {
                this.fabricCanvas.renderAll();
            });
            this.showNotification('Deshecho', 'success');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.fabricCanvas.loadFromJSON(this.history[this.historyIndex], () => {
                this.fabricCanvas.renderAll();
            });
            this.showNotification('Rehecho', 'success');
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.renderPage(this.currentPage + 1);
        }
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 3);
        this.renderPage(this.currentPage);
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.5);
        this.renderPage(this.currentPage);
    }

    updatePageInfo() {
        document.getElementById('pageInfo').textContent = `${this.currentPage} / ${this.totalPages}`;
        document.getElementById('zoomInfo').textContent = `${Math.round(this.zoom * 100)}%`;
        
        document.getElementById('prevPageBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextPageBtn').disabled = this.currentPage >= this.totalPages;
    }

    enableControls() {
        document.getElementById('savePdfBtn').disabled = false;
        document.getElementById('downloadPdfBtn').disabled = false;
    }

    showLoading(show) {
        document.getElementById('loadingIndicator').style.display = show ? 'block' : 'none';
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
        // Ctrl+Z para deshacer
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }
        // Ctrl+Y o Ctrl+Shift+Z para rehacer
        else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            this.redo();
        }
        // Ctrl+C para copiar
        else if (e.ctrlKey && e.key === 'c') {
            e.preventDefault();
            this.copySelection();
        }
        // Ctrl+X para cortar
        else if (e.ctrlKey && e.key === 'x') {
            e.preventDefault();
            this.cutSelection();
        }
        // Ctrl+V para pegar
        else if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            this.pasteSelection();
        }
        // Delete para eliminar
        else if (e.key === 'Delete') {
            e.preventDefault();
            this.deleteSelection();
        }
        // Escape para cancelar selección
        else if (e.key === 'Escape') {
            this.fabricCanvas.discardActiveObject();
            this.fabricCanvas.renderAll();
        }
    }

    async savePDF() {
        if (!this.pdfDocument) {
            this.showNotification('No hay PDF cargado', 'error');
            return;
        }

        try {
            const canvasData = this.fabricCanvas.toJSON();
            const filename = prompt('Ingrese el nombre del archivo:', `proyecto_${new Date().toISOString().slice(0, 10)}`);
            
            if (!filename) return;

            const saveData = {
                canvasData: canvasData,
                filename: filename.endsWith('.pdf') ? filename : filename + '.pdf',
                pageNumber: this.currentPage,
                totalPages: this.totalPages,
                zoom: this.zoom
            };

            const response = await fetch('backend/save_pdf.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(saveData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Proyecto guardado correctamente', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showNotification('Error al guardar: ' + error.message, 'error');
        }
    }

    downloadPDF() {
        // Convertir canvas a imagen y descargar
        const dataURL = this.fabricCanvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2
        });
        
        const link = document.createElement('a');
        link.download = `pdf-edited-page-${this.currentPage}.png`;
        link.href = dataURL;
        link.click();
        
        this.showNotification('Imagen descargada', 'success');
    }

    onSelectionCreated(e) {
        // Manejar selección creada
    }

    onSelectionUpdated(e) {
        // Manejar selección actualizada
    }

    onSelectionCleared(e) {
        // Manejar selección limpiada
    }

    async showProjectModal() {
        const modal = document.getElementById('projectModal');
        modal.style.display = 'block';
        
        try {
            const response = await fetch('backend/load_project.php?action=list');
            const result = await response.json();
            
            if (result.success) {
                this.displayProjects(result.projects);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showProjectError('Error al cargar proyectos: ' + error.message);
        }
    }

    hideProjectModal() {
        document.getElementById('projectModal').style.display = 'none';
    }

    displayProjects(projects) {
        const projectList = document.getElementById('projectList');
        
        if (projects.length === 0) {
            projectList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📁</div>
                    <p>No hay proyectos guardados</p>
                </div>
            `;
            return;
        }

        projectList.innerHTML = projects.map(project => `
            <div class="project-item" data-filename="${project.filename}">
                <div class="project-name">${project.filename}</div>
                <div class="project-date">Guardado: ${project.date}</div>
                <div class="project-actions">
                    <button class="btn btn-primary" onclick="pdfEditor.loadProject('${project.filename}')">
                        Cargar
                    </button>
                    <button class="btn btn-secondary" onclick="pdfEditor.deleteProject('${project.filename}')">
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }

    showProjectError(message) {
        const projectList = document.getElementById('projectList');
        projectList.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <p>${message}</p>
            </div>
        `;
    }

    async loadProject(filename) {
        try {
            const response = await fetch(`backend/load_project.php?action=load&filename=${encodeURIComponent(filename)}`);
            const result = await response.json();
            
            if (result.success && result.canvasData) {
                this.fabricCanvas.loadFromJSON(result.canvasData, () => {
                    this.fabricCanvas.renderAll();
                    this.showNotification('Proyecto cargado correctamente', 'success');
                    this.hideProjectModal();
                });
            } else {
                throw new Error(result.message || 'Error al cargar el proyecto');
            }
        } catch (error) {
            this.showNotification('Error al cargar proyecto: ' + error.message, 'error');
        }
    }

    async deleteProject(filename) {
        if (!confirm(`¿Está seguro de que desea eliminar el proyecto "${filename}"?`)) {
            return;
        }

        try {
            const response = await fetch(`backend/load_project.php?action=delete&filename=${encodeURIComponent(filename)}`);
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Proyecto eliminado correctamente', 'success');
                this.showProjectModal(); // Recargar la lista
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            this.showNotification('Error al eliminar proyecto: ' + error.message, 'error');
        }
    }

    rotateSelection(angle) {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            activeObject.rotate(activeObject.angle + angle);
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    flipSelection(direction) {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            if (direction === 'horizontal') {
                activeObject.set('flipX', !activeObject.flipX);
            } else if (direction === 'vertical') {
                activeObject.set('flipY', !activeObject.flipY);
            }
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    bringToFront() {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            this.fabricCanvas.bringToFront(activeObject);
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    sendToBack() {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject) {
            this.fabricCanvas.sendToBack(activeObject);
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    showServerInfoModal() {
        document.getElementById('serverInfoModal').style.display = 'block';
    }

    hideServerInfoModal() {
        document.getElementById('serverInfoModal').style.display = 'none';
    }

    // Funciones para selección de texto
    enableTextSelection() {
        this.fabricCanvas.selection = false;
        this.fabricCanvas.perPixelTargetFind = true;
        this.fabricCanvas.targetFindTolerance = 5;
    }

    // Funciones para edición de texto
    enableTextEditing() {
        this.fabricCanvas.selection = false;
        this.fabricCanvas.perPixelTargetFind = true;
    }

    handleTextEditClick(e) {
        const pointer = this.fabricCanvas.getPointer(e.e);
        const activeObject = this.fabricCanvas.findTarget(e.e, false);
        
        if (activeObject && activeObject.type === 'text') {
            // Activar edición de texto existente
            this.fabricCanvas.setActiveObject(activeObject);
            activeObject.enterEditing();
            activeObject.selectAll();
            this.fabricCanvas.renderAll();
        } else {
            this.showNotification('Haz clic sobre un texto existente para editarlo', 'warning');
        }
    }

    // Funciones para cuadros de texto
    startTextBoxDrawing(e) {
        const pointer = this.fabricCanvas.getPointer(e.e);
        this.isDrawing = true;
        this.startPoint = pointer;

        this.currentTextBox = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'rgba(255, 255, 255, 0.9)',
            stroke: '#000000',
            strokeWidth: 1,
            originX: 'left',
            originY: 'top'
        });

        this.fabricCanvas.add(this.currentTextBox);
    }

    // Funciones para agregar texto
    addTextAtPosition(e) {
        const pointer = this.fabricCanvas.getPointer(e.e);
        const text = prompt('Ingrese el texto:');
        
        if (text && text.trim()) {
            const textObject = new fabric.Text(text, {
                left: pointer.x,
                top: pointer.y,
                fontFamily: document.getElementById('fontFamily').value,
                fontSize: parseInt(document.getElementById('fontSize').value),
                fill: document.getElementById('textColor').value,
                fontWeight: 'normal',
                fontStyle: 'normal',
                originX: 'left',
                originY: 'top',
                editable: true
            });
            
            this.fabricCanvas.add(textObject);
            this.fabricCanvas.setActiveObject(textObject);
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    // Funciones para manejo de imágenes
    handleImageClick() {
        document.getElementById('imageInput').click();
    }

    // Funciones para herramienta de mano (pan)
    enablePanMode() {
        this.fabricCanvas.selection = false;
        this.isPanning = false;
    }

    startPanning(e) {
        this.isPanning = true;
        this.lastPanPoint = this.fabricCanvas.getPointer(e.e);
    }

    // Funciones mejoradas de dibujo
    onMouseMove(e) {
        if (this.isDrawing && this.currentShape) {
            const pointer = this.fabricCanvas.getPointer(e.e);
            
            switch (this.currentTool) {
                case 'line':
                    this.currentShape.set({
                        x2: pointer.x,
                        y2: pointer.y
                    });
                    break;
                case 'rectangle':
                    const width = pointer.x - this.startPoint.x;
                    const height = pointer.y - this.startPoint.y;
                    this.currentShape.set({
                        width: Math.abs(width),
                        height: Math.abs(height),
                        left: width < 0 ? pointer.x : this.startPoint.x,
                        top: height < 0 ? pointer.y : this.startPoint.y
                    });
                    break;
                case 'circle':
                    const radius = Math.sqrt(
                        Math.pow(pointer.x - this.startPoint.x, 2) + 
                        Math.pow(pointer.y - this.startPoint.y, 2)
                    );
                    this.currentShape.set({
                        radius: radius
                    });
                    break;
            }
            
            this.fabricCanvas.renderAll();
        } else if (this.isDrawing && this.currentTextBox) {
            // Manejar dibujo de cuadro de texto
            const pointer = this.fabricCanvas.getPointer(e.e);
            const width = pointer.x - this.startPoint.x;
            const height = pointer.y - this.startPoint.y;
            
            this.currentTextBox.set({
                width: Math.abs(width),
                height: Math.abs(height),
                left: width < 0 ? pointer.x : this.startPoint.x,
                top: height < 0 ? pointer.y : this.startPoint.y
            });
            
            this.fabricCanvas.renderAll();
        } else if (this.isPanning && this.currentTool === 'hand') {
            // Manejar pan con herramienta de mano
            const pointer = this.fabricCanvas.getPointer(e.e);
            const deltaX = pointer.x - this.lastPanPoint.x;
            const deltaY = pointer.y - this.lastPanPoint.y;
            
            this.fabricCanvas.relativePan({ x: deltaX, y: deltaY });
            this.lastPanPoint = pointer;
        }
    }

    onMouseUp(e) {
        if (this.isDrawing && this.currentShape) {
            this.isDrawing = false;
            this.currentShape = null;
            this.saveState();
        } else if (this.isDrawing && this.currentTextBox) {
            this.isDrawing = false;
            this.finishTextBox();
        } else if (this.isPanning) {
            this.isPanning = false;
        }
    }

    finishTextBox() {
        if (this.currentTextBox) {
            const text = prompt('Ingrese el texto para el cuadro:');
            if (text && text.trim()) {
                const textObject = new fabric.Text(text, {
                    left: this.currentTextBox.left + 10,
                    top: this.currentTextBox.top + 10,
                    width: this.currentTextBox.width - 20,
                    fontSize: parseInt(document.getElementById('fontSize').value),
                    fontFamily: document.getElementById('fontFamily').value,
                    fill: document.getElementById('textColor').value,
                    textAlign: 'left',
                    originX: 'left',
                    originY: 'top'
                });
                
                // Agrupar el cuadro y el texto
                const group = new fabric.Group([this.currentTextBox, textObject], {
                    left: this.currentTextBox.left,
                    top: this.currentTextBox.top
                });
                
                this.fabricCanvas.remove(this.currentTextBox);
                this.fabricCanvas.add(group);
                this.fabricCanvas.setActiveObject(group);
            } else {
                this.fabricCanvas.remove(this.currentTextBox);
            }
            
            this.currentTextBox = null;
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }

    // Funciones para formato de texto
    toggleTextStyle(property) {
        const activeObject = this.fabricCanvas.getActiveObject();
        if (activeObject && activeObject.type === 'text') {
            let currentValue = activeObject.get(property);
            let newValue;
            
            switch (property) {
                case 'fontWeight':
                    newValue = currentValue === 'bold' ? 'normal' : 'bold';
                    break;
                case 'fontStyle':
                    newValue = currentValue === 'italic' ? 'normal' : 'italic';
                    break;
                case 'underline':
                    newValue = !currentValue;
                    break;
                case 'linethrough':
                    newValue = !currentValue;
                    break;
            }
            
            activeObject.set(property, newValue);
            this.fabricCanvas.renderAll();
            this.saveState();
        }
    }
}

// Variable global para acceso desde HTML
let pdfEditor;

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    pdfEditor = new PDFEditor();
});
