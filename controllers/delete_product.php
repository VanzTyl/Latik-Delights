<?php
// /LatikDelights/controllers/delete_product.php
header('Content-Type: application/json');

require_once 'db_connect.php'; 

$response = [
    'status' => 'error',
    'message' => 'An unknown error occurred.'
];

$conn = null;
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id']) || !is_numeric($data['id'])) {
    http_response_code(400);
    $response['message'] = 'Invalid product ID.';
    echo json_encode($response);
    exit;
}

$productId = (int)$data['id'];

try {
    $conn = db_connect();

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // Step 1: Check if the product has associated order details (based on ON DELETE RESTRICT)
    // If you have 'ON DELETE CASCADE' on the order_details FK, this check is optional but good practice.
    $stmt = $conn->prepare("SELECT COUNT(*) FROM order_details WHERE product_id = ?");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $stmt->bind_result($orderDetailsCount);
    $stmt->fetch();
    $stmt->close();

    if ($orderDetailsCount > 0) {
        $response['status'] = 'info';
        $response['message'] = "Cannot delete product ID $productId. It is currently linked to $orderDetailsCount order detail(s).";
        echo json_encode($response);
        exit;
    }
    
    // Step 2: Perform the deletion
    $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
    $stmt->bind_param("i", $productId);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $response['status'] = 'success';
        $response['message'] = 'Product ID ' . $productId . ' deleted successfully.';
    } else {
        $response['message'] = "Product ID $productId not found or could not be deleted.";
        $response['status'] = 'info';
    }
    
    $stmt->close();

    http_response_code(200);

} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = 'Database error: ' . $e->getMessage();
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

echo json_encode($response);
?>