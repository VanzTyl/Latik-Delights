<?php
// /LatikDelights/controllers/create_category.php
header('Content-Type: application/json');

// --- Configuration/Setup (Adjust paths as necessary) ---
include 'db_connect.php'; 

$response = [
    'status' => 'error',
    'message' => 'An unknown error occurred.'
];

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['name']) || empty(trim($data['name']))) {
    $response['message'] = 'Category name is required.';
    echo json_encode($response);
    exit;
}

$categoryName = trim($data['name']);

try {
    $conn = db_connect();
    
    // Check if category already exists (case-insensitive)
    $stmt = $conn->prepare("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)");
    $stmt->bind_param("s", $categoryName);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $stmt->close();
        $conn->close();
        $response['status'] = 'info';
        $response['message'] = 'Category "' . htmlspecialchars($categoryName) . '" already exists.';
        echo json_encode($response);
        exit;
    }
    $stmt->close();
    
    // Insert new category
    $stmt = $conn->prepare("INSERT INTO categories (name) VALUES (?)");
    $stmt->bind_param("s", $categoryName);
    $stmt->execute();
    
    $newId = $conn->insert_id;
    
    $stmt->close();
    $conn->close();

    $response['status'] = 'success';
    $response['message'] = 'Category "' . htmlspecialchars($categoryName) . '" created successfully with ID ' . $newId . '.';
    $response['newId'] = $newId;

} catch (Exception $e) {
    error_log("Category Create Error: " . $e->getMessage());
    $response['message'] = 'Database error: ' . $e->getMessage();
}

echo json_encode($response);
?>