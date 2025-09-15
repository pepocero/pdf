# Editor PDF Avanzado

Una aplicación web completa para editar archivos PDF con múltiples herramientas y funcionalidades avanzadas.

## Características

### 🎨 Herramientas de Edición
- **Edición de texto**: Modificar texto existente en el PDF
- **Agregar texto**: Insertar nuevo texto en cualquier posición
- **Formateo de texto**: Negrita, cursiva, subrayado, diferentes fuentes y tamaños
- **Selección de texto**: Seleccionar, copiar, cortar y pegar elementos

### 🖼️ Gestión de Imágenes
- **Agregar imágenes**: Cargar imágenes desde el dispositivo
- **Redimensionar**: Cambiar el tamaño de las imágenes
- **Mover**: Reposicionar imágenes en el documento
- **Rotar**: Rotar imágenes según sea necesario

### ✏️ Herramientas de Dibujo
- **Dibujo a mano alzada**: Dibujar libremente sobre el PDF
- **Borrador**: Eliminar partes del dibujo
- **Colores personalizables**: Seleccionar colores para el dibujo
- **Grosor de línea**: Ajustar el grosor del trazo

### 📄 Gestión de Documentos
- **Carga de PDF**: Cargar archivos PDF desde el dispositivo
- **Navegación de páginas**: Moverse entre páginas del documento
- **Zoom**: Acercar y alejar el documento
- **Guardar proyecto**: Guardar el trabajo en progreso
- **Descargar**: Exportar el documento editado

### ⌨️ Atajos de Teclado
- `Ctrl + Z`: Deshacer
- `Ctrl + Y` / `Ctrl + Shift + Z`: Rehacer
- `Ctrl + C`: Copiar
- `Ctrl + X`: Cortar
- `Ctrl + V`: Pegar
- `Delete`: Eliminar elemento seleccionado
- `Escape`: Cancelar selección

### 📱 Soporte Móvil
- **Eventos táctiles**: Compatible con dispositivos móviles
- **Interfaz responsive**: Se adapta a diferentes tamaños de pantalla
- **Herramientas táctiles**: Optimizado para uso con dedos

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Librerías**: PDF.js, Fabric.js
- **Backend**: PHP 7.4+
- **Estilos**: CSS Grid, Flexbox, Animaciones CSS

## Instalación

1. **Requisitos del servidor**:
   - PHP 7.4 o superior
   - Servidor web (Apache, Nginx, o servidor de desarrollo PHP)
   - Extensión `fileinfo` habilitada

2. **Configuración**:
   ```bash
   # Clonar o descargar el proyecto
   cd pdf-editor
   
   # Crear directorios necesarios
   mkdir uploads saved_files
   chmod 777 uploads saved_files
   ```

3. **Configurar permisos**:
   - Asegurar que los directorios `uploads/` y `saved_files/` tengan permisos de escritura
   - En Linux/Mac: `chmod 777 uploads saved_files`
   - En Windows: Dar permisos completos a la carpeta del proyecto

## Estructura del Proyecto

```
pdf-editor/
├── index.html              # Página principal
├── css/
│   └── style.css          # Estilos CSS
├── js/
│   └── pdf-editor.js      # Lógica principal de la aplicación
├── backend/
│   ├── upload.php         # Manejo de carga de archivos
│   ├── save_pdf.php       # Guardado de proyectos
│   └── load_project.php   # Carga de proyectos guardados
├── uploads/               # Archivos temporales subidos
├── saved_files/          # Proyectos guardados
└── README.md
```

## Uso

### Cargar un PDF
1. Hacer clic en "Cargar PDF"
2. Seleccionar un archivo PDF del dispositivo
3. El PDF se cargará y mostrará en el editor

### Editar Texto
1. Seleccionar la herramienta "Texto" (T)
2. Hacer clic en el área donde desea agregar texto
3. Escribir el texto deseado
4. Usar los controles de formato para personalizar

### Agregar Imágenes
1. Seleccionar la herramienta "Imagen" (🖼)
2. Elegir una imagen del dispositivo
3. La imagen se colocará en el centro del documento
4. Arrastrar para mover, usar las esquinas para redimensionar

### Dibujar
1. Seleccionar la herramienta "Dibujar" (✏)
2. Elegir color y grosor del trazo
3. Dibujar directamente sobre el PDF
4. Usar la herramienta "Borrador" para eliminar partes

### Guardar Trabajo
1. Hacer clic en "Guardar PDF"
2. El proyecto se guardará en el servidor
3. Se puede recuperar más tarde usando la función de carga

## API del Backend

### POST /backend/upload.php
Carga archivos al servidor.

**Parámetros**: `file` (archivo)
**Respuesta**: JSON con información del archivo subido

### POST /backend/save_pdf.php
Guarda un proyecto PDF editado.

**Parámetros**: JSON con datos del canvas y PDF
**Respuesta**: JSON con confirmación de guardado

### GET /backend/load_project.php
Lista y carga proyectos guardados.

**Parámetros**:
- `action=list`: Lista todos los proyectos
- `action=load&filename=`: Carga un proyecto específico
- `action=delete&filename=`: Elimina un proyecto

## Personalización

### Cambiar Colores
Editar las variables CSS en `style.css`:
```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #4CAF50;
    --error-color: #f44336;
}
```

### Configurar Límites
En `backend/upload.php`:
```php
$maxFileSize = 50 * 1024 * 1024; // 50MB
$allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
```

## Solución de Problemas

### Error de Carga de PDF
- Verificar que el archivo sea un PDF válido
- Comprobar el tamaño del archivo (máximo 50MB)
- Asegurar que el servidor tenga suficiente memoria

### Problemas de Permisos
- Verificar permisos de escritura en `uploads/` y `saved_files/`
- Comprobar configuración de PHP para subida de archivos

### Problemas de Rendimiento
- Para PDFs grandes, considerar aumentar `memory_limit` en PHP
- Optimizar imágenes antes de subirlas

## Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crear una rama para la nueva funcionalidad
3. Hacer commit de los cambios
4. Hacer push a la rama
5. Abrir un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.

## Soporte

Para reportar bugs o solicitar nuevas funcionalidades, por favor abrir un issue en el repositorio del proyecto.
