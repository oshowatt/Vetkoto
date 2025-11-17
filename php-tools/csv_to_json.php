<?php
// php-tools/csv_to_json.php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Check if file is provided
if (!isset($_FILES['csv_file'])) {
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['csv_file']['tmp_name'];

if (!file_exists($file)) {
    echo json_encode(['error' => 'Invalid file']);
    exit;
}

$rows = [];
$header = null;

if (($handle = fopen($file, 'r')) !== false) {
    while (($data = fgetcsv($handle, 1000, ',')) !== false) {
        if (!$header) {
            $header = $data;
        } else {
            $rows[] = array_combine($header, $data);
        }
    }
    fclose($handle);
}

echo json_encode([
    "status" => "success",
    "total" => count($rows),
    "data" => $rows
]);





