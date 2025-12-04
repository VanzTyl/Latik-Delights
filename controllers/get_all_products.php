<?php
// /LatikDelights/controllers/get_all_products.php
header('Content-Type: application/json');

require_once 'db_connect.php'; 

$response = ['status' => 'error', 'message' => 'An unknown error occurred.'];
$conn = null;

try {
    $conn = db_connect(); 

    // Check for connection error immediately
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // FIX: Use JOIN to fetch the category name from the categories table
    $sql = "
        SELECT 
            p.id, 
            p.name, 
            p.price, 
            p.stock, 
            c.name AS category_name  
        FROM products p
        JOIN categories c ON p.category_id = c.id
        ORDER BY p.name ASC
    ";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        // If the query fails (e.g., table not found or column error)
        throw new Exception("SQL Query Error: " . $conn->error);
    }
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = [
            'id'        => (int)$row['id'],
            'name'      => $row['name'],
            'price'     => (float)$row['price'],
            'stock'     => (int)$row['stock'],
            // Use the alias created in the JOIN
            'category'  => $row['category_name'] 
        ];
    }
    
    $response['status'] = 'success';
    $response['message'] = 'Products retrieved successfully.';
    $response['data'] = $products;
    http_response_code(200);

} catch (Exception $e) {
    http_response_code(500);
    // Send the detailed error back as JSON
    $response['message'] = 'Server Error: ' . $e->getMessage();
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

echo json_encode($response);
?>