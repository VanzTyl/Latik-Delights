<?php
// /LatikDelights/controllers/get_all_categories.php
header('Content-Type: application/json');

require_once 'db_connect.php'; 

$response = [
    'status' => 'error',
    'message' => 'An unknown error occurred.',
    'data' => []
];

$conn = null;

try {
    $conn = db_connect(); 

    // Check for connection error immediately
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    // Prepare statement to select all categories
    $stmt = $conn->prepare("SELECT id, name FROM categories ORDER BY name ASC");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row;
    }
    
    $stmt->close();
    
    $response['status'] = 'success';
    $response['message'] = 'Categories fetched successfully.';
    $response['data'] = $categories;

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