<?php
// /LatikDelights/controllers/create_order.php
require_once 'db_connect.php'; 

header('Content-Type: application/json');

$response = ['status' => 'error', 'message' => 'An unknown error occurred.'];
$conn = null;
$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'Method not allowed.';
    echo json_encode($response);
    exit;
}

// Basic data validation
if (empty($data['customer_name']) || !isset($data['total']) || empty($data['details'])) {
    http_response_code(400);
    $response['message'] = 'Missing required order data.';
    echo json_encode($response);
    exit;
}

$customerName = trim($data['customer_name']);
$total = (float)$data['total'];
$orderDetails = $data['details'];

try {
    // FIX: Call the db_connect() function to get the connection object
    $conn = db_connect();

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Start transaction
    $conn->begin_transaction();

    // 1. Insert into orders table
    // Note: Changed the status from 'Pending Payment' to 'Paid' for a cash register scenario
    $stmt_order = $conn->prepare("INSERT INTO orders (customer_name, total, order_date, status) VALUES (?, ?, NOW(), 'Paid')");
    $stmt_order->bind_param("sd", $customerName, $total);
    $stmt_order->execute();
    $orderId = $conn->insert_id;
    $stmt_order->close();

    // 2. Insert into order_details table and update product stock
    $stmt_detail = $conn->prepare("INSERT INTO order_details (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)");
    $stmt_stock = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?");

    foreach ($orderDetails as $detail) {
        $productId = (int)$detail['product_id'];
        $quantity = (int)$detail['quantity'];
        $unitPrice = (float)$detail['unit_price'];

        // Update stock
        $stmt_stock->bind_param("iii", $quantity, $productId, $quantity);
        $stmt_stock->execute();

        if ($stmt_stock->affected_rows === 0) {
            // Rollback if stock update failed (e.g., insufficient stock or product not found)
            $conn->rollback();
            http_response_code(409); // Conflict
            $response['message'] = 'Stock update failed for product ID ' . $productId;
            echo json_encode($response);
            $stmt_detail->close();
            $stmt_stock->close();
            exit;
        }

        // Insert order detail
        $stmt_detail->bind_param("iidi", $orderId, $productId, $quantity, $unitPrice);
        $stmt_detail->execute();
    }

    $stmt_detail->close();
    $stmt_stock->close();

    // Commit transaction if all is successful
    $conn->commit();
    
    $response['status'] = 'success';
    $response['message'] = "Order #{$orderId} created successfully.";
    $response['order_id'] = $orderId;
    http_response_code(200);

} catch (Exception $e) {
    // Rollback transaction on any exception
    if ($conn) {
        $conn->rollback();
    }
    http_response_code(500);
    $response['message'] = 'Transaction failed: ' . $e->getMessage();
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

echo json_encode($response);
?>