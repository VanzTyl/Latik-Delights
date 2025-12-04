<?php
// /LatikDelights/controllers/create_product.php
header('Content-Type: application/json');

require_once 'db_connect.php'; 

$response = [
    'status' => 'error',
    'message' => 'An unknown error occurred.'
];

$conn = null;
$data = json_decode(file_get_contents('php://input'), true);

// 1. Input Validation
if (
    !isset($data['name']) || empty(trim($data['name'])) ||
    !isset($data['price']) || !is_numeric($data['price']) ||
    !isset($data['stock']) || !is_numeric($data['stock']) ||
    !isset($data['category_id']) || !is_numeric($data['category_id'])
) {
    http_response_code(400);
    $response['message'] = 'Invalid or missing product data (name, price, stock, or category_id).';
    echo json_encode($response);
    exit;
}

$productName = trim($data['name']);
$productPrice = (float)$data['price'];
$productStock = (int)$data['stock'];
$categoryId = (int)$data['category_id']; // Use category_id from the form data

try {
    $conn = db_connect();

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Check if product already exists (case-insensitive check)
    $stmt = $conn->prepare("SELECT id FROM products WHERE LOWER(name) = LOWER(?)");
    $stmt->bind_param("s", $productName);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $stmt->close();
        $response['status'] = 'info';
        $response['message'] = 'Product "' . htmlspecialchars($productName) . '" already exists.';
        echo json_encode($response);
        exit;
    }
    $stmt->close();
    
    // FIX: Update SQL to use 'category_id' instead of 'category'
    // FIX: Update bind_param to use integer (i) for category_id
    $stmt = $conn->prepare("INSERT INTO products (name, price, stock, category_id) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sddi", $productName, $productPrice, $productStock, $categoryId);
    $stmt->execute();
    
    $newId = $conn->insert_id;
    
    $response['status'] = 'success';
    $response['message'] = 'Product "' . htmlspecialchars($productName) . '" created successfully.';
    $response['newId'] = $newId;
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