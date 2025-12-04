<?php
require_once 'db_connect.php'; 

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
    exit;
}

$orders = [];
$status = 'success';
$message = 'Orders retrieved successfully.';
$conn = null;

try {
    $conn = db_connect(); 

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    $sql = "SELECT id, customer_name, total, order_date, status 
            FROM orders 
            ORDER BY order_date DESC 
            LIMIT 50";
    
    $result = $conn->query($sql);

    if ($result === false) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    while ($row = $result->fetch_assoc()) {
        $orders[] = [
            'id' => (int)$row['id'],
            'customer_name' => $row['customer_name'],
            'total' => (float)$row['total'],
            'order_date' => $row['order_date'],
            'status' => $row['status']
        ];
    }

    if (empty($orders)) {
        $message = "No orders found.";
    }

} catch (Exception $e) {
    http_response_code(500);
    $status = 'error';
    $message = 'Failed to fetch orders: ' . $e->getMessage();
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

echo json_encode([
    'status' => $status, 
    'message' => $message, 
    'orders' => $orders
]);
?>