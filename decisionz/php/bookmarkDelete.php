<?php
// Create connection
$con=mysqli_connect("db480654236.db.1and1.com","dbo480654236","TjuQymcP","db480654236");
$id = $_GET[id];

// Check connection
if (mysqli_connect_errno($con))
  {
  	echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }else{
  	mysqli_query($con, "DELETE FROM bookmarks WHERE id=" . $id);

	mysqli_close($con);
  }
?>  