<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

try {
    // Obtener datos JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Datos JSON inválidos');
    }

    $pdfData = $input['pdfData'] ?? null;
    $canvasData = $input['canvasData'] ?? null;
    $filename = $input['filename'] ?? 'edited_pdf_' . date('Y-m-d_H-i-s') . '.pdf';

    if (!$pdfData && !$canvasData) {
        throw new Exception('No se proporcionaron datos para guardar');
    }

    $saveDir = 'saved_files/';
    if (!file_exists($saveDir)) {
        mkdir($saveDir, 0777, true);
    }

    $response = [];

    // Guardar datos del canvas como JSON
    if ($canvasData) {
        $canvasFile = $saveDir . pathinfo($filename, PATHINFO_FILENAME) . '_canvas.json';
        if (file_put_contents($canvasFile, json_encode($canvasData))) {
            $response['canvasFile'] = $canvasFile;
        }
    }

    // Si se proporciona data de PDF, guardarlo
    if ($pdfData) {
        $pdfFile = $saveDir . $filename;
        if (file_put_contents($pdfFile, base64_decode($pdfData))) {
            $response['pdfFile'] = $pdfFile;
        }
    }

    // Guardar metadatos
    $metadata = [
        'timestamp' => time(),
        'originalFilename' => $filename,
        'canvasFile' => $response['canvasFile'] ?? null,
        'pdfFile' => $response['pdfFile'] ?? null,
        'version' => '1.0'
    ];

    $metadataFile = $saveDir . pathinfo($filename, PATHINFO_FILENAME) . '_metadata.json';
    file_put_contents($metadataFile, json_encode($metadata));

    echo json_encode([
        'success' => true,
        'message' => 'Archivo guardado correctamente',
        'filename' => $filename,
        'files' => $response,
        'metadata' => $metadata
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
