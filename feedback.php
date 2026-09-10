<?php
declare(strict_types=1);

$config = require __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POST required']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';

if (strlen($raw) > (int)$config['max_body_bytes']) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'Payload too large']);
    exit;
}

$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

$feedback = [
    'timestamp'   => gmdate('c'),
    'device'      => isset($data['device']) ? (string)$data['device'] : '',
    'android'     => isset($data['android']) ? (string)$data['android'] : '',
    'app_version' => isset($data['app_version']) ? (string)$data['app_version'] : '',
    'status'      => isset($data['status']) ? (string)$data['status'] : '',
    'message'     => isset($data['message']) ? (string)$data['message'] : '',
];

$file = $config['storage_file'];
$dir = dirname($file);

if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$fp = fopen($file, 'c+');

if (!$fp) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Storage unavailable']);
    exit;
}

flock($fp, LOCK_EX);
rewind($fp);
$contents = stream_get_contents($fp);
$list = $contents ? json_decode($contents, true) : [];

if (!is_array($list)) {
    $list = [];
}

$list[] = $feedback;

// Keep the latest 1000 entries.
if (count($list) > 1000) {
    $list = array_slice($list, -1000);
}

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['ok' => true, 'message' => 'Feedback received']);
