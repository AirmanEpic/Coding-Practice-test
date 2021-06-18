# Setup for Stefan's Drone API.
## For now, please use windows. We will make a specialized guide for Linux later.
0. Make sure you have node and NPM installed. If not, install them!
1. go into the server folder and run ```npm install .```
2. Install and start [WAMP](https://sourceforge.net/projects/wampserver/) if you're on windows. If you're on linux, make sure there is a MySQL server running at localhost.
3. Create a "units" database and install the tables given in "units.sql" using the import command in phpMyAdmin (or the correct process in linux)
4. in the server folder, run ```node controller.js```
5. Check the website exists by going to localhost:[port]. Port is specified in config.json.
6. If that's running, in a new console window, run ```npm test```. You should see "tests passed". If it appears to hang, that means the SQL server isn't connecting.

## if you need help installing and configuring WAMP, please follow these instructions
0. Download and install from the link above. Change the default browser to literally anything other than chrome but let it stay with notepad
1. Run WAMPserver from the start menu
2. go to http://localhost/phpmyadmin/index.php
3. login with root as your username and leaving the password blank
4. on the left side, above "information_schema" click "new"
5. in database name, type "units" and click go.
6. Click "units"
7. in the control menu at the top, select "import"
8. click "choose file" and navigate to units.sql in the top level of the git repo
9. click "go"
10. Verify it created the new DB entries.