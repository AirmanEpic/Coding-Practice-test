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