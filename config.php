<?php
// Basic configuration for the Auto Feedback Server.
return [
    'storage_file' => __DIR__ . '/data/feedback.json',
    'max_body_bytes' => 65536,
    'allowed_origins' => ['*'],
];
