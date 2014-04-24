<?php
// Create connection
$con=mysqli_connect("db480654236.db.1and1.com","dbo480654236","TjuQymcP","db480654236");
$id = $_GET[id];

// Check connection
if (mysqli_connect_errno($con))
  {
  	echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }else{
  	$result = mysqli_query($con,"SELECT * FROM bookmarks WHERE id='" . $id . "'");

	$row = mysqli_fetch_array($result);

	echo $row['text'];
  
	mysqli_close($con);
  }
?>  