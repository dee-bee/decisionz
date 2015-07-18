<?php
// Create connection
$con=mysqli_connect("db480654236.db.1and1.com","dbo480654236","TjuQymcP","db480654236");
$user_id = $_GET[user_id];

// Check connection
if (mysqli_connect_errno($con))
  {
  	echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }else{
  	$result = mysqli_query($con,"DELETE FROM multiplayerQueue WHERE user_id='" . $user_id . "'");

	echo "done";
	
	mysqli_close($con);
  }
?> 