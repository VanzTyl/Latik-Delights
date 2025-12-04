<?php
// /LatikDelights/controllers/update_product.php
header('Content-Type: application/json');

require_once 'db_connect.php'; 

$response = ['status' => 'error', 'message' => 'An unknown error occurred.'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'Method not allowed.';
    echo json_encode($response);
    exit;
}

$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);
$conn = null;

// Required fields validation - NOW CHECKING FOR category_id
if (empty($data['id']) || empty($data['name']) || !isset($data['price']) || !isset($data['stock']) || !isset($data['category_id'])) {
    http_response_code(400);
    $response['message'] = 'Missing required product data (id, name, price, stock, or category_id).';
    echo json_encode($response);
    exit;
}

$id = (int)$data['id'];
$name = trim($data['name']);
$price = (float)$data['price'];
$stock = (int)$data['stock'];
$categoryId = (int)$data['category_id']; // Use category_id (integer)

try {
    $conn = db_connect(); 

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // FIX: Use category_id in the UPDATE statement and change bind type from 's' to 'i'
    $stmt = $conn->prepare("UPDATE products SET name = ?, price = ?, stock = ?, category_id = ? WHERE id = ?");
    
    // 'sddii' stands for: String, Decimal, Decimal, Integer, Integer
    $stmt->bind_param("sddii", $name, $price, $stock, $categoryId, $id); 
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            $response['status'] = 'success';
            $response['message'] = "Product (ID: {$id}) updated successfully.";
            http_response_code(200);
        } else {
            if ($conn->errno == 1062) { // Unique name constraint violation
                 http_response_code(409);
                 $response['message'] = "A product with the name '{$name}' already exists.";
            } else {
                $response['status'] = 'info';
                $response['message'] = "Product (ID: {$id}) found but no changes were made.";
                http_response_code(200); 
            }
        }
    } else {
        http_response_code(500);
        $response['message'] = 'Failed to update product: ' . $stmt->error;
    }
    
    $stmt->close();

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