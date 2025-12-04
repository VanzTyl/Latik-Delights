<?php
// /LatikDelights/controllers/delete_category.php
header('Content-Type: application/json');

// --- Configuration/Setup (Adjust paths as necessary) ---
include 'db_connect.php'; 

$response = [
    'status' => 'error',
    'message' => 'An unknown error occurred.'
];

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id']) || !is_numeric($data['id'])) {
    $response['message'] = 'Invalid category ID.';
    echo json_encode($response);
    exit;
}

$categoryId = (int)$data['id'];

try {
    $conn = db_connect();

    // Check for associated products before deletion (Assuming 'products' table has a 'category_id' column)
    $stmt = $conn->prepare("SELECT COUNT(*) FROM products WHERE category_id = ?");
    $stmt->bind_param("i", $categoryId);
    $stmt->execute();
    $stmt->bind_result($productCount);
    $stmt->fetch();
    $stmt->close();

    if ($productCount > 0) {
        $conn->close();
        $response['status'] = 'info';
        $response['message'] = "Cannot delete category ID $categoryId. It is currently linked to $productCount product(s).";
        echo json_encode($response);
        exit;
    }

    // Fetch name for confirmation message
    $stmt = $conn->prepare("SELECT name FROM categories WHERE id = ?");
    $stmt->bind_param("i", $categoryId);
    $stmt->execute();
    $stmt->bind_result($categoryName);
    $stmt->fetch();
    $stmt->close();
    
    // Perform deletion
    $stmt = $conn->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->bind_param("i", $categoryId);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $response['status'] = 'success';
        $response['message'] = 'Category "' . htmlspecialchars($categoryName) . '" (ID: ' . $categoryId . ') deleted successfully.';
    } else {
        $response['message'] = "Category ID $categoryId not found or could not be deleted.";
    }
    
    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    error_log("Category Delete Error: " . $e->getMessage());
    $response['message'] = 'Database error: ' . $e->getMessage();
}

echo json_encode($response);
?>