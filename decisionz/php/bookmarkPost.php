<?php
$con=mysqli_connect("db480654236.db.1and1.com","dbo480654236","TjuQymcP","db480654236");

// Check connection
if (mysqli_connect_errno())
  {
  echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }

mysqli_query($con,"INSERT INTO bookmarks (name,user_id,text)
VALUES ('" . $_POST['name'] . 
		"', '" . $_POST['user_id'] . 
		"', '" . $_POST['text'] . "')");

mysqli_close($con);
?> 