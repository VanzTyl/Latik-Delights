<?php
session_start();

require_once 'db_connect.php'; 

header('Content-Type: application/json');

$status = 'success';
$message = 'Sales data retrieved successfully.';
$final_data = []; 
$conn = null;

try {
    $conn = db_connect(); 

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    $sql = "
        SELECT
            o.id,
            o.customer_name,
            o.order_date,
            o.total,
            o.status,
            p.name AS product_name, 
            od.quantity,
            od.unit_price
        FROM
            orders o
        JOIN
            order_details od ON o.id = od.order_id
        JOIN
            products p ON od.product_id = p.id
        WHERE
            o.status = 'Completed' 
        ORDER BY
            o.order_date DESC;
    ";

    $result = $conn->query($sql);

    if ($result === false) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $order_id = $row['id'];
        
        list($date_part, $time_part) = explode(' ', $row['order_date']); 

        if (!isset($orders[$order_id])) {
            $orders[$order_id] = [
                'order_id'      => (int)$order_id,
                'customer_name' => $row['customer_name'],
                'order_date'    => $date_part,
                'order_time'    => $time_part,
                'total_amount'  => (float)$row['total'],
                'status'        => $row['status'],
                'details'       => []
            ];
        }

        $orders[$order_id]['details'][] = [
            'product_name' => $row['product_name'], 
            'quantity'     => (int)$row['quantity'],
            'unit_price'   => (float)$row['unit_price'],
            'subtotal'     => (float)($row['quantity'] * $row['unit_price'])
        ];
    }
    
    $final_data = array_values($orders);

    if (empty($final_data)) {
        $message = "No completed sales found.";
    }

} catch (Exception $e) {
    http_response_code(500);
    $status = 'error';
    $message = 'Failed to fetch sales data: ' . $e->getMessage();
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

echo json_encode([
    'status' => $status, 
    'message' => $message, 
    'data' => $final_data
]);
?>