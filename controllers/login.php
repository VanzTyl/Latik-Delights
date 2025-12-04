<?php
// /LatikDelights/controllers/login.php
session_start();

require_once 'db_connect.php'; 

header('Content-Type: application/json');

$response = ['status' => 'error', 'message' => 'Invalid credentials.'];
$conn = null;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    $response['message'] = 'Method not allowed.';
    echo json_encode($response);
    exit;
}

// 1. Read JSON input (typical for API calls)
$json_data = json_decode(file_get_contents('php://input'), true);

// 2. Combine with standard POST data (typical for HTML forms)
// If form is submitted, $_POST will contain the data. If JSON is sent, $json_data will contain the data.
$data = array_merge($_POST, is_array($json_data) ? $json_data : []);

if (empty($data['username']) || empty($data['password'])) {
    http_response_code(400);
    $response['message'] = 'Missing username or password.';
    echo json_encode($response);
    exit;
}

$username = trim($data['username']);
$password = $data['password'];

try {
    $conn = db_connect(); 

    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }

    $stmt = $conn->prepare("SELECT id, username, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $row = $result->fetch_assoc();
        
        if (password_verify($password, $row['password'])) { 
            // Login successful
            $_SESSION['logged_in'] = true;
            $_SESSION['username'] = $row['username'];
            $_SESSION['user_id'] = $row['id'];
            
            $response['status'] = 'success';
            $response['message'] = 'Login successful.';
            http_response_code(200);
            
        } else {
            http_response_code(401); 
            $response['message'] = 'Invalid username or password.';
        }
    } else {
        http_response_code(401);
        $response['message'] = 'Invalid username or password.';
    }
    
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = 'Server error during login: ' . $e->getMessage();
} finally {
    if ($conn && !$conn->connect_error) {
        $conn->close();
    }
}

echo json_encode($response);
?>