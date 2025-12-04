<?php
// /LatikDelights/controllers/db_connect.php (Function based)

function db_connect() {
    $host = "localhost";
    $user = "root"; 
    $pass = ""; 
    $dbname = "Latik_Delights";

    // Establish the connection
    $conn = new mysqli($host, $user, $pass, $dbname);

    // Note: We don't use die() here. The calling script (controller)
    // checks for the error and handles the JSON output.
    return $conn;
}
?>