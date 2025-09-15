<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de subida de archivos
$uploadDir = 'uploads/';
$maxFileSize = 50 * 1024 * 1024; // 50MB
$allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];

// Crear directorio de uploads si no existe
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!isset($_FILES['file'])) {
            throw new Exception('No se recibió ningún archivo');
        }

        $file = $_FILES['file'];
        
        // Validar errores de subida
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Error en la subida del archivo: ' . $file['error']);
        }

        // Validar tamaño
        if ($file['size'] > $maxFileSize) {
            throw new Exception('El archivo es demasiado grande. Máximo: 50MB');
        }

        // Validar tipo
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedTypes)) {
            throw new Exception('Tipo de archivo no permitido');
        }

        // Generar nombre único
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '_' . time() . '.' . $extension;
        $filepath = $uploadDir . $filename;

        // Mover archivo
        if (!move_uploaded_file($file['tmp_name'], $filepath)) {
            throw new Exception('Error al guardar el archivo');
        }

        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'message' => 'Archivo subido correctamente',
            'filename' => $filename,
            'filepath' => $filepath,
            'size' => $file['size'],
            'type' => $mimeType
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Listar archivos subidos
        $files = [];
        if (is_dir($uploadDir)) {
            $dirFiles = scandir($uploadDir);
            foreach ($dirFiles as $file) {
                if ($file !== '.' && $file !== '..') {
                    $filepath = $uploadDir . $file;
                    $files[] = [
                        'name' => $file,
                        'path' => $filepath,
                        'size' => filesize($filepath),
                        'modified' => filemtime($filepath)
                    ];
                }
            }
        }

        echo json_encode([
            'success' => true,
            'files' => $files
        ]);

    } else {
        throw new Exception('Método no permitido');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
