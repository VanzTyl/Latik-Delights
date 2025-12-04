<?php
// /LatikDelights/controllers/get_products.php
require_once 'db_connect.php'; 

header('Content-Type: application/json');

$response = ['status' => 'error', 'message' => 'An unknown error occurred.', 'data' => []];
$conn = null;

try {
    // FIX: Call the db_connect() function to get the connection object
    $conn = db_connect();

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // FIX: Use JOIN to link products (p) to categories (c) 
    // and select the category name as 'category_name'
    $sql = "
        SELECT 
            p.id, 
            p.name, 
            p.price, 
            p.stock, 
            c.name AS category_name 
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.stock > 0
        ORDER BY p.name ASC
    ";
    
    $result = $conn->query($sql);
    
    if ($conn->error) {
        throw new Exception("SQL Query Error: " . $conn->error);
    }
    
    $products = [];
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $products[] = [
                'id'        => (int)$row['id'],
                'name'      => $row['name'],
                'price'     => (float)$row['price'],
                'stock'     => (int)$row['stock'],
                // Use the alias 'category_name' for the 'category' field expected by the front-end
                'category'  => $row['category_name'] 
            ];
        }
    }
    
    $response['status'] = 'success';
    $response['message'] = 'Products retrieved successfully.';
    $response['data'] = $products;
    http_response_code(200);

} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = 'Server Error: ' . $e->getMessage();
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

echo json_encode($response);
?>