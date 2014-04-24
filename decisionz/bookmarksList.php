<?php
// Create connection
$con=mysqli_connect("db480654236.db.1and1.com","dbo480654236","TjuQymcP","db480654236");
$user_id = $_GET[user_id];

// Check connection
if (mysqli_connect_errno($con))
  {
  	echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }else{
  	$result = mysqli_query($con,"SELECT * FROM bookmarks WHERE user_id='" . $user_id . "'");

	echo "<div id='bookmarks'>";
	
	while($row = mysqli_fetch_array($result))
	{
		echo "<a href='bookmarkGet.php?id=" . $row['id'] . "'> " . $row['name'] . "</a>" . 
			"<div onclick='deleteBookmark(" . $row['id'] . ")'>Delete</div>" .
			"<br />";
	}
  	
	echo "</div>";
	
	mysqli_close($con);
  }
?> 