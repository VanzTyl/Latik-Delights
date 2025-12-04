<?php
// /LatikDelights/controllers/check_session.php
session_start();

// require_once 'db_connect.php'; // Removed, as it is not needed for a session check

header('Content-Type: application/json');

$response = [
    'status' => 'error', 
    'message' => 'Not logged in.'
];

// FIX: Check for the 'user_id' which is set in your login.php
if (isset($_SESSION['user_id'])) {
    $response['status'] = 'success';
    $response['message'] = 'User is logged in.';
    
    // Return username if it exists
    if (isset($_SESSION['username'])) {
        $response['username'] = $_SESSION['username'];
    }

    http_response_code(200);
} else {
    // Session is invalid or expired
    http_response_code(401); // Unauthorized
}

echo json_encode($response);
?>