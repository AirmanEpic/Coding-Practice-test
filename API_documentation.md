# How to use Stefan's Drone API
## Please consult "setup.md" for how to install properly.

## Running and testing
once successfully installed, run the API with ``node controller.js``

in order to test the API, run ``npm test``

you can also test the API externally by going to localhost:[port] and following the test instructions at the bottom right.

## The UI
### There's a UI running! Open it on localhost:[port]!
The left side is the map. You'll need to populate it by running read operations.

to do this, set the target to what you want to see, then set the action to "read"

finally, set the ID to 5 to see an interesting drone, and 2 for an interesting route (Zoom in on the bay area!)

You can also click on the map to get a lat/longitude pair.

You can also open the console, as jquery is already attached and you ping the API.

## Programming and watching drones
the UI can display actively moving drones. Assign them a route (Use the route ID) and a waypoint (start with 0) in the format:
``[route].[waypoint]``

you'll need to read the position of your assigned drone with the UI to see it moving. 

## Endpoints

## create drones
### Creates a new drone
Route: _API/drones/create/[arbitrary/optional ID]_

Required JSON: 
* pos_current
* pos_lat
* pos_long
* orientation
* routine_id
* routine_tgt

## read drones
### reads the associated values of the drone given by the [id] parameter
Route: _API/drones/read/[id]_

Required JSON: 
*none*

## update drones
### updates the value of the drone given by the [id] parameter. Notably, only one or more of the following required inputs is required.
Route: _API/drones/update/[id]_

Required JSON: 
* pos_current
* pos_lat
* pos_long
* orientation
* routine_id
* routine_tgt

## delete drones
### Deletes the drone given by the [id] parameter
Route: _API/drones/delete/[id]_

Required JSON: 
*none*

## create routes
### Creates a new route
Route: _API/routes/create/[arbitrary/optional ID]_

Required JSON: 
* waypoints_JSON

 For waypoints_JSON, please use this format: "[[-122.306,37.775],[-122.324,37.772424242927954]]". Make sure you use the quotation marks.

## read routes
### reads the associated values of the route given by the [id] parameter
Route: _API/routes/read/[id]_

Required JSON: 
*none*

## update routes
### updates the value of the route given by the [id] parameter. Notably, only one or more of the following required inputs is required.
Route: _API/routes/update/[id]_

Required JSON: 
* waypoints_JSON

 For waypoints_JSON, please use this format: "[[-122.306,37.775],[-122.324,37.772424242927954]]". Make sure you use the quotation marks.

## delete routes
### Deletes the route given by the [id] parameter
Route: _API/routes/delete/[id]_

Required JSON: 
*none*

## create stations
### Creates a new 
Route: _API/stations/create/[arbitrary/optional ID]_

Required JSON: 
* pos_lat
* pos_long

## read stations
### reads the associated values of the  given by the [id] parameter
Route: _API/stations/read/[id]_

Required JSON: 
*none*

## update stations
### updates the value of the  given by the [id] parameter. Notably, only one or more of the following required inputs is required.
Route: _API/stations/update/[id]_

Required JSON: 
* pos_lat
* pos_long

## delete stations
### Deletes the  given by the [id] parameter
Route: _API/stations/delete/[id]_

Required JSON: 
*none*

## radius stations
### Returns the points inside a given radius from a given position
Route: _API/stations/radius/[id]_

Required JSON: 
* pos_lat
* pos_long
* radius

## radius routes
### Returns the points inside a given radius from a given route
Route: _API/routes/radius/[id]_

Required JSON: 
* radius

## history positions
### Returns the path history of a drone from given date_start to date_end. Defaults to epoch for start and current for end if not provided.
Route: _API/positions/history/[arbitrary/optional ID]_

Required JSON: 
* drone_id
