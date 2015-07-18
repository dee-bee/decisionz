<?php
// Create connection
$con=mysqli_connect("db480654236.db.1and1.com","dbo480654236","TjuQymcP","db480654236");

// Check connection
if (mysqli_connect_errno($con))
  {
  	echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }else{
  	$i_query = "INSERT INTO multiplayerQueue (user_id,value)
			VALUES ('" . $_REQUEST['user_id'] . 
					"', '" . $_REQUEST['value'] . "')";
    
    if($_REQUEST['debug'] == "true"){
		echo $i_query . "\n";
	}
			
    $ri = mysqli_query($con,$i_query);

	if ( $ri === false ){
		//Try get + update instead
		$g_query = "SELECT * FROM multiplayerQueue " 
						. "WHERE user_id='" . $_REQUEST['user_id'] . "'";
						
		$rg = mysqli_query($con,$g_query);

	    if($_REQUEST['debug'] == "true"){
			echo $g_query . "\n";
		}
		
		if ( $rg === false ){
			echo "failure:Can't insert and can't get user_id.";
		}else{
			$row = mysqli_fetch_array($rg);
			
			$u_query = "UPDATE multiplayerQueue SET 
				value='" . $row['value'] . "\n" . $_REQUEST['value'] . "' " 
					. " WHERE user_id='" . $_REQUEST['user_id'] . "'";
			
			if($_REQUEST['debug'] == "true"){
				echo $u_query . "\n";
			}
			
			$ru = mysqli_query($con,$u_query);
			
			if ( $ru === false ){
				echo "failure:Can't insert and can't update.";
			}else{		
				 echo "pass: update worked";			
			}
		}
	}else{
		echo "pass: insert worked";
	}
	
	mysqli_close($con);
  }
?> 