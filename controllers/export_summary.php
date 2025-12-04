<?php
// Set headers for a CSV file download
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="sales_summary.csv"');
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
// 1. DEFINE CSV HEADERS (Summary)
// -----------------------------------------------------------------------------

$headers = [
    'Order ID',
    'Customer Name',
    'Order Date',
    'Order Time',
    'Total Order Amount (PHP)',
    'Status'
];

// -----------------------------------------------------------------------------
// 2. GENERATE CSV CONTENT (Summary)
// -----------------------------------------------------------------------------

$output = fopen('php://output', 'w');
fputcsv($output, $headers);

foreach ($salesData as $order) {
    // Calculate the total number of items, just in case
    $totalItems = 0;
    if (isset($order['details'])) {
        $totalItems = count($order['details']);
    }

    $row = [
        $order['order_id'],
        $order['customer_name'],
        $order['order_date'],
        $order['order_time'],
        number_format($order['total_amount'], 2, '.', ''),
        $order['status'],
        // You could add total items here if desired: $totalItems,
    ];
    
    fputcsv($output, $row);
}

fclose($output);
exit;