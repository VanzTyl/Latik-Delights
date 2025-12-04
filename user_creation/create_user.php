<?php
$password = '123';  // the plain password you want to store
$hashed_password = password_hash($password, PASSWORD_DEFAULT);  // hash the password
echo $hashed_password;
?>