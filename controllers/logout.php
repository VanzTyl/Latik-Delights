<?php
// =================================================================
// /LatikDelights/controllers/logout.php
// Handles user session termination and redirects to the login page.
// =================================================================

// 1. Start the session (essential to access session data)
session_start();

// 2. Clear all session variables
$_SESSION = array();

// 3. Destroy the session on the server and expire the cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();

// 4. Redirect the user
// We use the specified relative path for the login page.
header("Location: ../pages/login.html");
exit(); 
?>