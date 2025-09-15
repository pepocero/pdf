<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $action = $_GET['action'] ?? 'list';
    $saveDir = 'saved_files/';

    if (!file_exists($saveDir)) {
        mkdir($saveDir, 0777, true);
    }

    switch ($action) {
        case 'list':
            // Listar proyectos guardados
            $projects = [];
            $files = scandir($saveDir);
            
            foreach ($files as $file) {
                if (strpos($file, '_metadata.json') !== false) {
                    $metadataPath = $saveDir . $file;
                    $metadata = json_decode(file_get_contents($metadataPath), true);
                    if ($metadata) {
                        $projects[] = [
                            'filename' => $metadata['originalFilename'],
                            'timestamp' => $metadata['timestamp'],
                            'date' => date('Y-m-d H:i:s', $metadata['timestamp']),
                            'metadataFile' => $file,
                            'canvasFile' => $metadata['canvasFile'],
                            'pdfFile' => $metadata['pdfFile']
                        ];
                    }
                }
            }

            // Ordenar por timestamp descendente
            usort($projects, function($a, $b) {
                return $b['timestamp'] - $a['timestamp'];
            });

            echo json_encode([
                'success' => true,
                'projects' => $projects
            ]);
            break;

        case 'load':
            $filename = $_GET['filename'] ?? '';
            if (!$filename) {
                throw new Exception('Nombre de archivo requerido');
            }

            $baseName = pathinfo($filename, PATHINFO_FILENAME);
            $metadataFile = $saveDir . $baseName . '_metadata.json';
            $canvasFile = $saveDir . $baseName . '_canvas.json';
            $pdfFile = $saveDir . $filename;

            $response = ['success' => true];

            // Cargar metadatos
            if (file_exists($metadataFile)) {
                $response['metadata'] = json_decode(file_get_contents($metadataFile), true);
            }

            // Cargar datos del canvas
            if (file_exists($canvasFile)) {
                $response['canvasData'] = json_decode(file_get_contents($canvasFile), true);
            }

            // Cargar PDF si existe
            if (file_exists($pdfFile)) {
                $response['pdfData'] = base64_encode(file_get_contents($pdfFile));
            }

            echo json_encode($response);
            break;

        case 'delete':
            $filename = $_GET['filename'] ?? '';
            if (!$filename) {
                throw new Exception('Nombre de archivo requerido');
            }

            $baseName = pathinfo($filename, PATHINFO_FILENAME);
            $filesToDelete = [
                $saveDir . $baseName . '_metadata.json',
                $saveDir . $baseName . '_canvas.json',
                $saveDir . $filename
            ];

            $deletedFiles = [];
            foreach ($filesToDelete as $file) {
                if (file_exists($file)) {
                    if (unlink($file)) {
                        $deletedFiles[] = basename($file);
                    }
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Proyecto eliminado correctamente',
                'deletedFiles' => $deletedFiles
            ]);
            break;

        default:
            throw new Exception('Acción no válida');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
