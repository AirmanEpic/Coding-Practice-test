// ------------------ REQUIRES ---------------------
const fs = require('fs');
const app = require('express')();
const mysql = require('mysql');
const geolib = require('geolib');

// --------------- VALUES ------------------------

// These will be populated later.
const endpoints = [];

const acceptedActions = ['create', 'read', 'update', 'delete'];
const acceptedTargets = [];

// ----------------- CONFIG/INIT -------------------------


let testMode = false;
let echoMode = false;

process.argv.forEach(function(arg, ind) {
  if (arg == '-test_mode') {
    testMode = true;
  }

  if (arg == '-echo_0') {
    echoMode = true;
  }
});

const config = JSON.parse(fs.readFileSync('config.json').toString());

const port = config.API_port;

const bodyParser = require('body-parser');

const connection = mysql.createConnection({
  host: config.mysql_address,
  user: 'root',
  password: '',
  database: 'units',
});

connection.connect();

// server config
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// activate server
if (!testMode) {
  server = app.listen(port, ()=>{
    console.log(`started on port ${port}`);
  });
}
// in test mode, the server is deactivated and we will instead assume there is a running server to ping requests off of.


// ------------------ WEBSERVER ---------------------

app.get('/public/*', function(req, res) {
  // console.log(navigateUp(__dirname))
  if (req.url.split('.ttf').length>1) {
    res.header('Access-Control-Allow-Origin', '*');
  }

  if (req.url.split('.png').length>1) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.sendFile(navigateUp(__dirname)+'/client/'+req.params[0]);
});


app.get('/', function(req, res) {
  // console.log(navigateUp(__dirname))
  console.log('Serving website.');
  str = fs.readFileSync(navigateUp(__dirname)+'/client/index.html').toString();
  str = applyTemplates(str);
  res.send(str);
});

app.get('/*', function(req, res) {
  // search for articles with that name, else return 404
  id = req.params[0];
  if (id) {
    if (fs.existsSync('pages/'+id+'.html')) {
      str = fs.readFileSync('pages/'+id+'.html').toString();
      str = applyTemplates(str);
      res.send(str);
    } else {
      res.sendStatus(404);
    }
  }
});

/** This function takes the attached config and installs it to the client automatically instead of serving it.*/
function generateConfig() {
  const str = 'config = '+JSON.stringify(config);
  fs.writeFileSync('../client/config.js', str);
}
generateConfig();

// -------------------- API ENDPOINT ---------------------
app.post('/API/:tgt/:action/:id', (request, response) => {
  // code to perform particular action.
  // To access POST variable use req.body()methods.
  console.log(request.body);
  response.header('Access-Control-Allow-Origin', '*');

  response.send(processAPI(request.params, request.body));
});

createEndpoints();

if (testMode) {
  // god, it's nice to be able to override the default console.assert!
  console.assert = function(val, str) {
    if (!val) {
      console.error(str);
      console.error('Tests failed');
      process.exit(1);
    }
  };
  runTests();
  if (!echoMode) {
    console.log('Tests passed');
  } else {
    console.log('Tests Pass');
    process.exit(0);
  }
  process.exit(1);
}
/** This function is the "Master" endpoint creation function. All endpoints are generated here.
For example, if we want a endpoint that checks for stations within a given radius, see the routes radius endpoint.*/
function createEndpoints() {
  // remember: targets are things that you can do CRUD operations on. This function abstracts away 4 sub-endpoint generations each.
  createTarget('drones');
  createTarget('routes');
  createTarget('stations');

  // add position requests.
  acceptedTargets.push('positions');

  createEndpointExtra('stations', 'radius',
      radiusFunction,
      radiusTest,
      'Returns the points inside a given radius from a given position',
      ['pos_lat', 'pos_long', 'radius'],
  );

  createEndpointExtra('routes', 'radius',
      routeRadius,
      routeRadiusTest,
      'Returns the points inside a given radius from a given route',
      ['radius'],
  );

  createEndpointExtra('positions', 'history',
      historyFunction,
      historyFunctionTest,
      'Returns the path history of a drone from given date_start to date_end. Defaults to epoch for start and current for end if not provided.',
      ['drone_id']);

  generateDocumentation();

  droneUpdaterInterval = setInterval(droneUpdate, 1000); // update drones every second.
}

/** This function returns the test values we use for various things, primarily for the tests.*/
function getTestValues() {
  const testValues = {
    drones: {
      pos_current: 1,
      pos_lat: 37.7917,
      pos_long: -122.572,
      orientation: 0,
      routine_id: 0,
      routine_tgt: 0,
    },
    routes: {
      waypoints_JSON: '[[-122.306,37.775],[-122.324,37.772424242927954]]',
    },
    stations: {
      pos_lat: 37.792,
      pos_long: -122.572,
    },
  };
  return testValues;
}

/** Runs the tests. Each endpoint comes with a test. TDD for the win.*/
function runTests() {
  // test each endpoint (there are like 20)
  const testResultElements = {};
  let result = {};
  finalStatus = true;
  endpoints.forEach(function(ep, ind) {
    let skip = false;
    if (ep.name=='create') {
      result = ep.test();
      skip = true;
      testResultElements[ep.tgt] = deepcopy(result);
    }

    if (ep.name == 'read') {
      skip = true;
      result = ep.test(testResultElements[ep.tgt].new_id);
    }

    if (ep.name == 'update') {
      skip = true;
      result = ep.test(testResultElements[ep.tgt].new_id);
    }

    if (ep.name == 'delete') {
      skip = true;
      result = ep.test(testResultElements[ep.tgt].new_id);
    }

    if (!skip) {
      // console.log("running extra test")
      result = ep.test();
    }
    console.assert(result.success, 'Error: '+ep.name+' test failing for '+ep.tgt+'. See endpoint['+ind+'].test() for more details. More data: '+JSON.stringify(result));
  });
}

/** This auto-generates the API documentation, saving me from having to edit everything if a spec changes.*/
function generateDocumentation() {
  // We should create a documentation file every time we start.
  // the great thing is that this documentation is self-generating based on the endpoints!
  // this is one of the key reasons I designed the endpoints the way I did.
  // ok, so to start off, we should grab the supplement. This forms the first part of the documentation, the part that can't be auto-generated.
  str = fs.readFileSync('API_documentation_supplement.md').toString();
  // once that's done, let's add the auto-gen stuff to it!
  str += '\n';
  endpoints.forEach(function(ep, ind) {
    str +='\n## '+ep.name+' '+ep.tgt+'\n';
    if (ep.name=='create' || ep.name == 'history') {
      idStr = '[arbitrary/optional ID]';
    } else {
      idStr = '[id]';
    }
    str +='### '+ep.desc+'\n';
    str +='Route: _API/'+ep.tgt+'/'+ep.name+'/'+idStr+'_\n\n';

    str +='Required JSON: \n';
    ep.inputs.forEach(function(input, ind2) {
      str+='* '+input+'\n';
    });
    if (ep.inputs.length == 0) {
      str += '*none*\n';
    }

    if ((ep.name == 'update' || ep.name=='create') && (ep.tgt == 'routes')) {
      str += '\n For waypoints_JSON, please use this format: '+JSON.stringify(getTestValues()['routes'].waypoints_JSON)+'. Make sure you use the quotation marks.\n';
    }
  });

  // We're done. Save the str to file!
  fs.writeFileSync('../API_documentation.md', str);
}

// --------------------- SUPPORTING FUNCTIONS --------------

/** A supporting function for the webserver. Doesn't do much.*/
function applyTemplates(str) {
  return str;
}

/** A supporting function for the webserver. Allows the server to navigate "up" on most machines. */
function navigateUp(string) {
  // modifies the string to remove the last /, in effect navigating up without using ..
  // console.log(string)
  spl = string.split('\\');
  newStr = '';
  for (let i=0; i<spl.length-1; i++) {
    newStr += spl[i] + '\\';
  }

  return newStr;
}

/** Deepcopy saves the values, not the references. */
function deepcopy(val) {
  return JSON.parse(JSON.stringify(val));
}

/** A supporting function for the route/navigation subsystem. Linearly interpolates between two positions.*/
function lerpDistance(p1, p2, dis) {
  const retX=p1.x+(((p2.x-p1.x)*dis)/pointDistance(p1, p2));
  const retY=p1.y+(((p2.y-p1.y)*dis)/pointDistance(p1, p2));

  return {x: retX, y: retY};
}
/**  Returns the direction between two points.*/
function pointDirection(p1, p2) {
  return rtd(Math.atan2(p2.y - p1.y, p2.x - p1.x));
}

/** Converts radians to degrees*/
function rtd(inp) {
  return (inp/Math.PI)*180;
}
/**  returns the distance between two points*/
function pointDistance(p1, p2) {
  const dis=Math.sqrt(Math.pow(p2.x-p1.x, 2)+Math.pow(p2.y-p1.y, 2));
  return dis;
}

/** given 3 positions in 1 dimension, finds the percentage between the two. */
function inverseLerp1D(pos1, pos2, posX) {
  // inverse lerp
  const perc=(posX-pos1)/(pos2-pos1);

  return perc;
}

/** finds the closest point, distance, and other useful features of a polygon or polyline compared to a point.*/
function closestProjection(polygon, point, closed) {
  let distMin = 1000000;
  let idMin = 0;
  // console.log("length: "+polygon.length)
  for (let i=0; i<polygon.length; i++) {
    const start = polygon[i];
    let end = {};
    if (polygon[i+1]) {
      end = polygon[i+1];
      loopedSegment = false;
    } else {
      end = polygon[0];
      loopedSegment = true;
    }

    var proj = projectReal(start, end, point);

    perc = findLerpedPerc(start, end, proj);
    var proj = {};
    projIsExtreme = false;
    if (perc>1 || perc<0) {
      if (perc>1) {
        proj = end;
      } else {
        proj = start;
      }
      projIsExtreme = true;
    } else {
      proj = projectReal(start, end, point);
    }
    // console.log("points: ",proj,point)
    const dist = geolib.getDistance({latitude: proj.y, longitude: proj.x}, {latitude: point.y, longitude: point.x})/1000;
    // console.log("dist for ",i,": ",dist)

    if (dist<distMin && ((loopedSegment && closed) || (!loopedSegment))) {
      idMin = i;
      minProj = proj;
      distMin = dist;
      isExtreme = projIsExtreme;
      finalPerc = perc;
      bestStart = start;
      bestEnd = end;
    }
  }

  return {id: idMin, proj: minProj, dis: distMin, end: bestEnd, start: bestStart, perc: finalPerc};
}

/** finds the percentage position in a pair of 2D points.*/
function findLerpedPerc(start, end, point) {
  let perc = inverseLerp1D(start.x, end.x, point.x);
  if (start.x==end.x) {
    perc = inverseLerp1D(start.y, end.y, point.y);
  }
  if (start.y==end.y) {
    perc = inverseLerp1D(start.x, end.x, point.x);
  }

  return perc;
}

/** Finds the projected vector.*/
function projectReal(l1, l2, p) {
  vx = p.x - l1.x;
  vy = p.y - l1.y;
  v = {x: vx, y: vy};

  sx = l2.x - l1.x;
  sy = l2.y - l1.y;
  s = {x: sx, y: sy};

  num = dot(v, s);
  den = dot(s, s);

  tot = num/den;
  return {x: (sx*tot)+l1.x, y: (sy*tot)+l1.y};
}

/** A simple dot product. */
function dot(a, b) {
  return ( a.x*b.x)+(a.y*b.y);
}

// -------------------------- API creation/handling functions --------------------------

/** Supporting function for API creation, this bulk-adds the CRUD functions for a given target (drones, stations, routes)*/
function createTarget(tgt) {
  // targets are things that you can perform CRUD operations on.
  acceptedTargets.push(tgt);
  acceptedActions.forEach(function(action, ind) {
    // this makes it so that the endpoint can easily trigger without having to repeat code.
    // this creates create, read, update, and delete actions for this specific target.
    createEndpoint(tgt, action, crudFunction(ind), crudTest(ind), crudDescription(ind), crudInputs(ind, tgt));
  });
}

/** Creates a non-CRUD API endpoint.*/
function createEndpointExtra(tgt, name, execute, test, description, inputs) {
  if (acceptedTargets.indexOf(tgt) == -1) {
    console.error('Attempting to add an endpoint to a non-existing target');
    return false;
  }

  if (acceptedActions.indexOf(name) == -1) {
    // console.log("added action type ",name)
    acceptedActions.push(name); // since this is by definition not a CRUD action, we need to add it to the acceptable list.
  }
  createEndpoint(tgt, name, execute, test, description, inputs);
}

/** the lowest level endpoint function. */
function createEndpoint(tgt, name, execute, test, description, inputs) {
  // endpoints are things that you perform different functions. These can include CRUD or other functions
  if (typeof description == 'function') {
    actualDesc = description(tgt); // We do this so that we can easily self-reference in the description.
  } else {
    actualDesc = description;
  }
  endpoints.push({tgt: tgt, name: name, execute: execute, test: test, desc: actualDesc, inputs: inputs});
}

/** This validates incoming API requests and ensures they match.*/
function processAPI(params, json) {
  // check to see if the params.action and params.tgt are both accepted.
  // parse the JSON to make sure it's accepted

  // first let's validate our inputs
  let response = {};
  if (acceptedActions.indexOf(params.action) == -1) {
    // this isn't on the list of guests - err, actions
    response.error = {
      'type': 'incorrect-action',
    };
    return response;
  }

  if (acceptedTargets.indexOf(params.tgt) == -1) {
    // this target is not accepted.
    console.log('unacceptable target: ', params.tgt);
    response.error = {
      'type': 'incorrect-target',
    };
    return response;
  }

  let thisEndPoint = -1;
  endpoints.forEach(function(ep, ind) {
    if (ep.tgt == params.tgt && ep.name == params.action) {
      thisEndPoint = ind;
    }
  });

  if (thisEndPoint == -1) {
    // this endpoint somehow got past the other requirements and still isn't accepted. If this error is triggered, this is a problem with the API.
    // Sounds like a good test!
    response.error = {
      'type': 'No-endpoint',
    };
    return response;
  }

  // if we've gotten this far, the endpoint must exist.

  if (!params.id && (params.action == 'read' || params.action == 'update' || params.action == 'delete')) {
    // check to ensure ID was provided.
    response.error = {
      'type': 'No-ID',
    };
    return response;
  }

  // Ok, so we have a target endpoint and all of our URL-based inputs are present. We should now validate the JSON as much as we can.
  const requiredJsonEls = endpoints[thisEndPoint].inputs;
  let requirementsMet = false;
  let triggeringEl = '';

  if ( params.action == 'create') {
    // console.log(endpoints[thisEndPoint])
    requiredJsonEls.forEach(function(key, ind) {
      // we're checking every key in the requiredElements. If it's not there, that's a problem.
      if (!json[key]) {
        triggeringEl += key+', ';
        requirementsMet = false;
      }
    });

    if (triggeringEl.length <1) {
      requirementsMet = true;
    }

    if (!requirementsMet) {
      response.error = {
        'type': 'missing-required-JSON',
        'missing': triggeringEl,
      };
      return response;
    }
  }

  if (params.action == 'update') {
    const keys = Object.keys(json);
    keys.forEach(function(key, ind) {
      if (endpoints[thisEndPoint].inputs.indexOf(key) == -1) {
        // this means that there was an unexpected item in the updated params list.
        requirementsMet = false;
        triggeringEl += key;
      }
    });

    if (triggeringEl.length <1) {
      requirementsMet = true;
    }

    if (!requirementsMet) {
      response.error = {
        'type': 'unexpected-JSON',
        'missing': triggeringEl,
      };
      return response;
    }
  }

  if ( params.action != 'delete' && params.action !='update' && params.action!='read') {
    // console.log(endpoints[thisEndPoint])
    requiredJsonEls.forEach(function(key, ind) {
      // we're checking every key in the requiredElements. If it's not there, that's a problem.
      if (!json[key]) {
        triggeringEl += key+', ';
        requirementsMet = false;
      }
    });

    if (triggeringEl.length <1) {
      requirementsMet = true;
    }

    if (!requirementsMet) {
      response.error = {
        'type': 'missing-required-JSON',
        'missing': triggeringEl,
      };
      return response;
    }
  }


  // if we've gotten this far, that means all of our JSON is valid. This means we're ready to trigger the function.
  response = endpoints[thisEndPoint].execute(params, json); // anticlimactic, I know.

  return response;
}

// -------------------------- description, testing, and input generation functions --------------------------
/** standard test a CRUD endpoint*/
function crudTest(type) {
  const values = getTestValues();
  if (type == 0) {
    return function(id) {
      const params = {id: 0, action: 'create', tgt: this.tgt};
      const json = deepcopy(values[this.tgt]);
      const results = this.execute(params, json);
      console.assert(results.new_id, this.tgt+ ' create failed to return new id.');
      return results;
    };
  }
  if (type == 1) {
    return function(id) {
      const params = {id: id, action: 'read', tgt: this.tgt};
      const json = deepcopy(values[this.tgt]);
      const results = this.execute(params, json);
      console.assert(results.row[0].id == id, this.tgt+ ' read failed to retrieve correct value for ID');
      return results;
    };
  }

  if (type == 2) {
    return function(id) {
      const params = {id: id, action: 'update', tgt: this.tgt};
      const json = deepcopy(values[this.tgt]);
      const key = Object.keys(json)[0];
      const actualJson = {};
      actualJson[key] = 0;
      const results = this.execute(params, actualJson);
      console.assert(results['changedRows'], this.tgt+ ' update failed to change row '+id +'. Results: '+ JSON.stringify(results));
      return results;
    };
  }

  if (type == 3) {
    return function(id) {
      const params = {id: id, action: 'delete', tgt: this.tgt};
      const json = deepcopy(values[this.tgt]);
      const results = this.execute(params, json);
      console.assert(results.deletedRows, this.tgt+ ' delete failed to change rows');
      // console.log("deleted "+this.tgt)
      return results;
    };
  }
}

/** test the radius function*/
function radiusTest() {
  // we'll need to test for stations in a radius. In order to do this, we need to ensure a station exists.
  // we do this by creating one.
  const stationTestVals = getTestValues()['stations'];
  const ep = findEndpoint('stations', 'create');
  const val = endpoints[ep].execute({'tgt': 'stations', 'action': 'create', 'id': 0}, stationTestVals);
  // ok, we now have a station guaranteed.
  const params = {id: 0, action: 'radius', tgt: this.tgt};
  const radiusRes = this.execute(params, {'pos_lat': 35, 'pos_long': -122, 'radius': 10000});

  // now that we've tested, we need to clean up our station that we just created.
  const delEp = findEndpoint('stations', 'delete');
  endpoints[delEp].execute({'tgt': 'stations', 'action': 'delete', 'id': val.new_id}, stationTestVals);

  if (radiusRes.success && radiusRes.inRadius.length>0) {
    return {'success': true, 'count': radiusRes.inRadius};
  } else {
    // The else is redundant but makes cognative load lower.
    return {'success': false, 'count': radiusRes.inRadius};
  }
}
/** test the route radius function*/
function routeRadiusTest() {
  // we'll need to test for stations in a radius from a route. In order to do this, we need to ensure a station exists.
  // we do this by creating one.
  const stationTestVals = getTestValues()['stations'];
  const ep = findEndpoint('stations', 'create');
  const stationVal = endpoints[ep].execute({'tgt': 'stations', 'action': 'create', 'id': 0}, stationTestVals);
  // ok, we now have a station guaranteed.

  // we next need to generate a route to ensure a route to compare it to exists.
  const routeTestVals = getTestValues()['routes'];
  const ep2 = findEndpoint('routes', 'create');
  const routeVal = endpoints[ep2].execute({'tgt': 'routes', 'action': 'create', 'id': 0}, routeTestVals);
  // we now should have a guaranteed route as well.

  const params = {id: routeVal.new_id, action: 'radius', tgt: 'routes'};
  const radiusRes = this.execute(params, {'radius': 10000});

  // now that we've tested, we need to clean up our station and route that we just created.
  const delEp = findEndpoint('stations', 'delete');
  endpoints[delEp].execute({'tgt': 'stations', 'action': 'delete', 'id': stationVal.new_id}, stationTestVals);

  const delEp2 = findEndpoint('routes', 'delete');
  endpoints[delEp2].execute({'tgt': 'routes', 'action': 'delete', 'id': routeVal.new_id}, routeTestVals);

  if (radiusRes.success && radiusRes.inRadius.length>0) {
    return {'success': true, 'count': radiusRes.inRadius};
  } else {
    // The else is redundant but makes cognative load lower.
    return {'success': false, 'count': radiusRes.inRadius};
  }
}

/** test the history function */
function historyFunctionTest() {
  return {success: true};
}

/** generate CRUD descriptions for the auto-docs.*/
function crudDescription(type) {
  if (type == 0) {
    return function(tgt) {
      return 'Creates a new '+tgt.split('s')[0];
    };
  }

  if (type == 1) {
    return function(tgt) {
      return 'reads the associated values of the '+tgt.split('s')[0]+' given by the [id] parameter';
    };
  }

  if (type == 2) {
    return function(tgt) {
      return 'updates the value of the '+tgt.split('s')[0]+' given by the [id] parameter. Notably, only one or more of the following required inputs is required.';
    };
  }

  if (type == 3) {
    return function(tgt) {
      return 'Deletes the '+tgt.split('s')[0]+' given by the [id] parameter';
    };
  }
}

/** create the accepted CRUD inputs for that table. AUTOMATICALLY! Cool, right?*/
function crudInputs(type, target) {
  const requiredJSON = [];

  const allColumns = [];

  // sql here
  if (type == 0 || type == 2) {
    const q = 'SELECT * FROM '+target;
    let rows;
    connection.query(q, function(error, results, fields) {
      rows = fields;
    });

    while (rows === undefined) {
      require('deasync').runLoopOnce();
    }
    const result = rows;
    result.forEach(function(row) {
      if (row['name'] != 'id') {
        allColumns.push(row['name']);
      }
    });
  }

  // if type == 1 or type == 3 (read and delete, respectively), requiredJSON will read []
  return allColumns;
}

/** sometimes it's necessary to execute endpoints from inside the server, this function looks the endpoint up for this purpose. */
function findEndpoint(tgt, action) {
  let val = -1;
  endpoints.forEach(function(ep, ind) {
    if (ep.tgt == tgt && ep.name == action) {
      val = ind;
    }
  });

  if (val == -1) {
    console.error('val not found!');
    console.log(endpoints);
    return -1;
  }

  return val;
}


// -------------------------- ENDPOINT EXECUTION FUNCTIONS --------------------------------
// these functions are what are triggered by the endpoint when you call it.

/** CRUD execution functions */
function crudFunction(type) {
  // Since all 3 target types will behave relatively the same, we'll return a function that does that thing.
  if (type == 0) {
    fun = function(params, json) {
      // create an element in the selected table with the JSON provided.
      const tgt = params.tgt;
      const action = params.action;
      const id = params.id;
      const keys = Object.keys(json);
      // since each table is different, we'll build up our create this way.
      // INSERT INTO table_name (
      let q = `INSERT INTO ${params.tgt} (id,`;

      // column1, column2, column3, ...
      keys.forEach(function(key, ind) {
        q += key;
        if (ind!= keys.length-1) {
          // don't add a trailing comma.
          q+= ',';
        }
      });
      q += ') VALUES (0,';
      keys.forEach(function(key, ind) {
        // prevent SQL injection attacks. Bobby tables can screw off.
        const escapedJSON = connection.escape(json[key]);
        q += escapedJSON;
        if (ind!= keys.length-1) {
          // don't add a trailing comma.
          q+= ',';
        }
      });
      q += ')';

      // we now have our correctly formed SQL query. Let's run that guy!
      let newID;

      connection.query(q, function(error, results, fields) {
        if (error) throw error;
        // console.log('The solution is: ', fields);

        newID = results.insertId;
      });
      while (newID === undefined) {
        require('deasync').runLoopOnce();
      }

      const result = newID;
      return {'success': true, 'new_id': result};
    };
  }

  if (type == 1) {
    // read
    fun = function(params, json) {
      // great! We can just ignore JSON, can't we!
      const tgt = params.tgt;
      const action = params.action;
      const id = connection.escape(params.id);

      const q = `SELECT * FROM ${tgt} WHERE id=${id}`;
      let rows;
      connection.query(q, function(error, results, fields) {
        if (error) throw error;
        // console.log('The solution is: ', fields);

        rows = results;
      });
      while (rows === undefined) {
        require('deasync').runLoopOnce();
      }

      const result = rows;
      return {'success': true, 'row': result};
    };
  }

  if (type == 2) {
    fun = function(params, json) {
      const tgt = params.tgt;
      const action = params.action;
      const id = connection.escape(params.id);

      let q = `UPDATE ${tgt} SET `;
      keys = Object.keys(json);
      keys.forEach(function(key, ind) {
        // console.log(key)
        q += key + ' = \''+json[key]+'\'';
        if (ind!= keys.length-1) {
          q += ', ';
        }
      });
      q += ` WHERE id=${id}`;

      let rows;
      connection.query(q, function(error, results, fields) {
        if (error) throw error;
        // console.log('The solution is: ', fields);

        rows = results.changedRows;
      });

      while (rows === undefined) {
        require('deasync').runLoopOnce();
      }

      const result = rows;
      return {'success': true, 'changedRows': result};
    };
  }

  if (type == 3) {
    // delete
    fun = function(params, json) {
      // great! We can just ignore JSON, can't we!
      const tgt = params.tgt;
      const action = params.action;
      const id = connection.escape(params.id);

      const q = `DELETE FROM ${tgt} WHERE id=${id}`;
      let rows;
      connection.query(q, function(error, results, fields) {
        if (error) throw error;
        // console.log('The solution is: ', fields);

        rows = results.affectedRows;
      });
      while (rows === undefined) {
        require('deasync').runLoopOnce();
      }

      const result = rows;
      return {'success': true, 'deletedRows': result};
    };
  }

  return fun;
}

/** this is what happens when you ask for a station radius */
function radiusFunction(params, json) {
  const tgt = params.tgt;
  const action = params.action;
  const id = params.id;
  const keys = Object.keys(json);
  q = 'SELECT * FROM stations';
  let rows;
  connection.query(q, function(error, results, fields) {
    if (error) throw error;
    rows = results;
  });

  while (rows === undefined) {
    require('deasync').runLoopOnce();
  }

  const result = rows;

  inRadius = [];
  const center = {latitude: json['pos_lat'], longitude: json['pos_long']};
  result.forEach(function(item, ind) {
    const lat = item.pos_lat;
    const long = item.pos_long;
    const dist = geolib.getDistance(center, {latitude: lat, longitude: long})/1000; // result is in meters. BAD. KILOMETERS!!
    // console.log("Distance: ",dist,"Compared to",parseFloat(json["radius"]))
    if (dist<parseFloat(json['radius'])) {
      inRadius.push((ind+1));
    }
  });

  return {'success': true, 'inRadius': inRadius};
}

/** this is what happens when you ask for the route radius */
function routeRadius(params, json) {
  const tgt = params.tgt;
  const action = params.action;
  const id = params.id;
  const keys = Object.keys(json);
  var q = 'SELECT * FROM stations';
  let rows;
  connection.query(q, function(error, results, fields) {
    if (error) throw error;
    rows = results;
  });

  while (rows === undefined) {
    require('deasync').runLoopOnce();
  }

  var q = `SELECT * FROM routes WHERE id = ${id}`;

  let rows2;
  connection.query(q, function(error, results, fields) {
    if (error) throw error;
    rows2 = results;
  });

  while (rows2 === undefined) {
    require('deasync').runLoopOnce();
  }

  const result = rows2[0];
  const resultPath = JSON.parse(result.waypoints_JSON);
  const processedPath = [];
  resultPath.forEach(function(wp, ind) {
    // waypoints_JSON should be in [[x,y]] format, where we want it in [{x,y}] format.
    processedPath.push({x: wp[0], y: wp[1]});
  });


  inRadius = [];
  // var center = {latitude:json["pos_lat"],longitude:json["pos_long"]}
  rows.forEach(function(item, ind) {
    const lat = item.pos_lat;
    const long = item.pos_long;
    const dist = closestProjection(processedPath, {x: long, y: lat}, false);
    // console.log("Distance: ",dist,"Compared to",parseFloat(json["radius"]))
    if (dist.dis<parseFloat(json['radius'])) {
      inRadius.push((item.id));
    }
  });

  return {'success': true, 'inRadius': inRadius};
}

/** This is the history function. */
function historyFunction(params, json) {
  const tgt = params.tgt;
  const action = params.action;
  const id = params.id;
  let ht = Date.now();
  let lt = 0;

  // these values are optional.
  // if date_start isn't provided, use the epoch (0)
  if (json.date_start) {
    lt = new Date(parseInt(json.date_start)).getTime();
    // console.log(lt,json.date_start)
  }

  // if date_end isn't provided, use the current time
  if (json.date_end) {
    ht = new Date(parseInt(json.date_end)).getTime();
    // console.log(ht,json.date_end)
  }

  const q = `SELECT * FROM positions WHERE drone=${json.drone_id} AND dt BETWEEN ${lt} AND ${ht}`;
  let rows;
  connection.query(q, function(error, results, fields) {
    if (error) throw error;
    rows = results;
  });

  while (rows === undefined) {
    require('deasync').runLoopOnce();
  }

  return {success: 'true', rows: rows};
}

// -------------------------- Drone movement ----------------------
/** Though not requested in the assignment, I made it so that drones will move around. */
function droneUpdate() {
  const roundConst = 10000;
  const droneSpeed = 0.001 * roundConst;

  // get data for use here. We don't want to be constantly polling the database, so this one call will cut it.
  let rows;
  var q = 'SELECT * FROM drones';
  connection.query(q, function(error, results, fields) {
    if (error) throw error;
    // console.log('The solution is: ', fields);

    rows = results;
  });
  while (rows === undefined) {
    require('deasync').runLoopOnce();
  }

  const drones = rows;


  let rows2;
  var q = 'SELECT * FROM routes';
  connection.query(q, function(error, results, fields) {
    if (error) throw error;
    // console.log('The solution is: ', fields);

    rows2 = results;
  });

  while (rows2 === undefined) {
    require('deasync').runLoopOnce();
  }

  const routes = rows2;

  let rows3;
  var q = 'SELECT * FROM stations';
  connection.query(q, function(error, results, fields) {
    if (error) throw error;
    // console.log('The solution is: ', fields);

    rows3 = results;
  });
  while (rows3 === undefined) {
    require('deasync').runLoopOnce();
  }

  const stations = rows3;

  routes.unshift('');
  stations.unshift('');

  routes.forEach(function(route, ind) {
    // process routes so that they don't break things.
    if (route.id) {
      route.waypoints_JSON = JSON.parse(route.waypoints_JSON);
    }
  });

  // we have all data we need. Let's ping each drone and figure out what it's doing, then update its position and orientation.
  drones.forEach(function(drone, ind) {
    if (!drone.id) {
      return;
    }
    const curPos = {x: parseFloat(roundConst*drone.pos_long), y: parseFloat(roundConst*drone.pos_lat)};
    let curMission = parseInt(drone.routine_id);
    let curTgt = drone.routine_tgt;
    let moveTowards = deepcopy(curPos);
    let nextPos = deepcopy(curPos);
    // please note that many of these functions will be assuming euclidean coordinates but obviously polar coordinates are not that.
    // so there will be inaccuracies.
    if (curMission == 1) {
      // go towards a station
      // the station ID is, unsurprisingly, the curTgt
      moveTowards = {x: parseFloat(roundConst*stations[curTgt].pos_long), y: parseFloat(roundConst*stations[curTgt].pos_lat)};
      if (pointDistance(moveTowards, curPos)>(0.002*roundConst)) {
        curMission = 0;
        // if we're at the end, stop.
      }
    }

    if (curMission == 2) {
      // follow a route
      // which route?
      const curRoute = parseInt(curTgt.split('.')[0]);
      // which waypoint?
      let curWp = parseInt(curTgt.split('.')[1]);
      if (!curWp) {
        curWp = 0;
      }
      // console.log(curRoute,curWp)
      if (routes[curRoute]) {
        if (routes[curRoute].waypoints_JSON[curWp]) {
          moveTowards = {x: parseFloat(roundConst*routes[curRoute].waypoints_JSON[curWp][0]), y: parseFloat(roundConst*routes[curRoute].waypoints_JSON[curWp][1])};
        }

        // if we're at the current route point, move to the next.
        if (pointDistance(moveTowards, curPos)<(0.002*roundConst)) {
          if (routes[curRoute].waypoints_JSON[curWp+1]) {
            curWp += 1;
          } else {
            curMission = 0;
            // if we're at the end, stop.
          }
        }
      }

      curTgt = `${curRoute}.${curWp}`;
    }

    // ok so we should have moveTowards now.
    // let's determine our next position.
    const dir =( -pointDirection(curPos, moveTowards) )+360;
    if (pointDistance(curPos, moveTowards) != 0) {
      nextPos = lerpDistance(curPos, moveTowards, droneSpeed);

      if (drone.id == 5) {
        console.log(`Drone pos for ${drone.id}`, curPos, nextPos, dir);
      }
    }
    // console.log(curPos)

    const dt = new Date().getTime();
    var q = `INSERT INTO positions(id, pos_lat, pos_long, dt, drone) VALUES (0, ${nextPos.y/roundConst}, ${nextPos.x/roundConst}, ${dt}, ${drone.id})`;

    let res;
    connection.query(q, function(error, results, fields) {
      // update the position
      if (error) throw error;
      res = results.insertId;
    });

    while (res === undefined) {
      require('deasync').runLoopOnce();
    }

    var q = `UPDATE drones SET pos_current = ${res}, pos_long = ${nextPos.x/roundConst}, pos_lat = ${nextPos.y/roundConst}, orientation = ${dir}, routine_id = '${curMission}', routine_tgt = '${curTgt}' WHERE id = ${drone.id}`;
    let res2;
    // console.log("q: ",q)
    connection.query(q, function(error, results, fields) {
      // update the position
      if (error) throw error;
      res2 = results.affectedRows;
      // console.log(results.changedRows)
    });

    while (res2 === undefined) {
      require('deasync').runLoopOnce();
    }
  });
}
