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

// Check if file exists and is readable
if (!file_exists($file) || !is_readable($file)) {
    echo json_encode(['error' => 'Invalid file']);
    exit;
}

$rows = [];
$header = null;

// Open the file and read it line by line
if (($handle = fopen($file, 'r')) !== false) {
    // Read the first line to get the headers
    $header = fgetcsv($handle, 1000, ',');
    
    if ($header === false) {
        echo json_encode(['error' => 'Unable to read header from CSV']);
        fclose($handle);
        exit;
    }

    // Read each subsequent line and combine it with the headers
    while (($data = fgetcsv($handle, 1000, ',')) !== false) {
        $rows[] = array_combine($header, $data); // Combine header with the data row
    }

    fclose($handle);
} else {
    echo json_encode(['error' => 'Failed to open file']);
    exit;
}

// Return the data in JSON format
echo json_encode([
    "status" => "success",
    "total" => count($rows),
    "data" => $rows
]);
