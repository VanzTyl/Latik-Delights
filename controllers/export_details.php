<?php
// Set headers for a CSV file download
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="order_details.csv"');
header('Pragma: no-cache');
header('Expires: 0');

// Capture the JSON payload
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data['salesData']) || !is_array($data['salesData'])) {
    http_response_code(500);
    echo "Error: Invalid or missing sales data received.";
    exit;
}

$salesData = $data['salesData'];

// -----------------------------------------------------------------------------
// 1. DEFINE CSV HEADERS (Details)
// -----------------------------------------------------------------------------

$headers = [
    'Order ID',
    'Product Name', 
    'Quantity',     
    'Unit Price (PHP)', 
    'Subtotal (PHP)' 
];

// -----------------------------------------------------------------------------
// 2. GENERATE CSV CONTENT (Details)
// -----------------------------------------------------------------------------

$output = fopen('php://output', 'w');
fputcsv($output, $headers);

foreach ($salesData as $order) {
    $orderId = $order['order_id'];

    if (!empty($order['details'])) {
        foreach ($order['details'] as $item) {
            
            $row = [
                $orderId, // Crucial for linking back to the summary
                $item['product_name'],
                $item['quantity'],
                number_format($item['unit_price'], 2, '.', ''),
                number_format($item['quantity'] * $item['unit_price'], 2, '.', ''),
            ];

            fputcsv($output, $row);
        }
    }
}

fclose($output);
exit;