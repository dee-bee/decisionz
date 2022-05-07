<?php
header('Access-Control-Allow-Origin: *');

// Create connection
$con=mysqli_connect("db480654236.db.1and1.com","dbo480654236","TjuQymcP","db480654236");
$user_id = $_GET[user_id];

// Check connection
if (mysqli_connect_errno($con))
  {
  	echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }else{
  	$query = "SELECT * FROM multiplayerQueue WHERE user_id='" . $user_id . "'";
  	$result = mysqli_query($con, $query);

    if($_REQUEST['debug'] == "true"){
		echo $query . "\n";
	}

	if ( $result === false ){
		echo "failure:Can't get user_id.";
	}else{
		$num_rows = mysqli_num_rows($result) ;
		
		if($num_rows != 1){
			echo "failure:Row count is " . $num_rows;
		}else{
			$row = mysqli_fetch_array($result);
		
			echo "<data>";
			
				echo $row['value'];
		  	
			echo "</data>";
		}
	}
	
	mysqli_close($con);
  }
?> 