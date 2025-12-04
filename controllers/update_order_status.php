<?php
require_once 'db_connect.php'; 

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
    exit;
}

$data = file_get_contents("php://input");
$update_data = json_decode($data, true);
$conn = null;

if (empty($update_data) || !isset($update_data['order_id']) || !isset($update_data['status'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid update data submitted.']);
    exit;
}

$order_id = $update_data['order_id'];
$new_status = $update_data['status'];

$valid_statuses = ['Pending Payment', 'Paid', 'Processing', 'Completed', 'Cancelled'];

if (!in_array($new_status, $valid_statuses)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid status value provided.']);
    exit;
}

try {
    $conn = db_connect(); 

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $new_status, $order_id);
    $stmt->execute();

    if ($stmt->affected_rows >= 0) {
        // Includes affected_rows = 0 (no change) and affected_rows > 0 (update successful)
        $message = ($stmt->affected_rows > 0) 
            ? "Order $order_id updated to $new_status."
            : "Order $order_id status was already $new_status.";
            
        echo json_encode(['status' => 'success', 'message' => $message]);
    } else {
        throw new Exception("Update query failed.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database error: Could not update order status.']);
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}
?>