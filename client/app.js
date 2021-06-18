var mpos = {x:0,y:0}
var clicked_lm = 0

var canvas = document.getElementById('map')
mapboxgl.accessToken = 'pk.eyJ1Ijoic3RlZmFuYmxhbmRpbjIiLCJhIjoiY2tua2t6d3MxMGFpODJ2cDl5NjNlZ2tobCJ9.n_c4vJE4EhfhppnUS2XNsw'
const styleURL = "mapbox://styles/stefanblandin2/cknklp6tb26fl17paey50fi36"
const droneURL = "public/img/saildrone_logo.png"
const stationURL = "public/img/target.png"

currentDrone = 0
currentStation = 0

function main(){
	document.body.addEventListener('mousedown', function(){
		
		// canvas = document.getElementById('map')
		canvas = $('canvas')
		// console.log(mpos,canvas.height(),canvas.width())
		if (mpos.x<canvas.width() && mpos.y<canvas.height() && mpos.x>0 && mpos.y>0){
			clicked_lm=1
			// console.log("clicked!")
		}else{
			// console.log(mpos,canvas.height(),canvas.width())
		}
	}, true)

	document.body.addEventListener('mouseup', function(){
		clicked_lm=3
	}, true)


	map = new mapboxgl.Map({
		container: 'map', // container ID
		style: styleURL, // style URL
		center: [0, 0], // starting position [lng, lat]
		zoom: 1 // starting zoom
	});	
	canvas = document.getElementById('map')
	resizeDiv()

	map.on('mousemove', function (e) {
		mpos.ltlng = e.lngLat.wrap()
	});

	$("body").mousemove(function(e) {
		mpos.x = e.pageX - $('canvas').offset().left
		mpos.y = e.pageY - $('canvas').offset().top
	})

	$('.sendbut').click(function(){
		var tgt = $('.tgtdropdown').val()
		var action = $('.actiondropdown').val()
		var id = $('.idtgt').val()
		var json = $('.arguments').val()
		if(json){
			json = JSON.parse(json)
		}
		$.post(`API/${tgt}/${action}/${id}`,json,function(data){
			$('.queryresults').text(JSON.stringify(data,null,2))

			if(tgt=="drones" && action=="read"){
				getDrone(id)
			}

			if(tgt=="stations" && action=="read"){
				getStation(id)
			}

			if(tgt=="routes" && action=="read"){
				getRoute(id)
			}
		})
	})

	update()
}

function getDrone(id){
	$.post(`API/drones/read/${id}`,{},function(data){
			if (data.row[0]){
				addImage(droneURL,[data.row[0].pos_lat,data.row[0].pos_long])
				getDrone((parseInt(id)+1)+"")
			}
		})
}

function getStation(id){
	$.post(`API/stations/read/${id}`,{},function(data){
		if (data.row[0]){
			addImage(stationURL,[data.row[0].pos_lat,data.row[0].pos_long])
			getStation((parseInt(id)+1)+"")
		}
	})
}

function getRoute(id){
	$.post(`API/routes/read/${id}`,{},function(data){
		if (data.row[0]){
			var waypoints = JSON.parse(data.row[0].waypoints_JSON)
			var points = []
			waypoints.forEach(function(wp,ind){
				points.push(wp)
			})
			addLine(points)
		}
	})
}

function update(){
	if (clicked_lm == 1){
		$('.mousecoords').text("Clicked Mouse coordinates (long,lat):\n" + mpos.ltlng.lng+","+mpos.ltlng.lat)
	}


	requestAnimationFrame(update)
}

function runTests(){
	$.post("API/stations/create/0",{
		"pos_long":-122.57207938763827,
		"pos_lat":37.79216893978182
	},function(data){
		console.assert(data.new_id,"Station was not created properly.")

	var station_id = data.new_id
	// console.log(station_id)
	$.post("API/routes/create/0",{
		waypoints_JSON:'[[-122.306,37.775],[-122.324,37.772424242927954]]'
	},function(data2){
		console.assert(data2.new_id,"Route was not created properly.")
	var route_id = data2.new_id
	// console.log(route_id)

	$.post("API/routes/radius/"+route_id,{
		radius:1000
	},function(data3){
		console.assert((data3.inRadius.length!=0),"Route radius endpoint not working.")
		console.log("Tests Passing")
		$.post("API/routes/delete/"+route_id)
		$.post("API/stations/delete/"+station_id)
	})
	})	
	})
}

function detectmob() { 
 if( navigator.userAgent.match(/Android/i)
 || navigator.userAgent.match(/webOS/i)
 || navigator.userAgent.match(/iPhone/i)
 || navigator.userAgent.match(/iPad/i)
 || navigator.userAgent.match(/iPod/i)
 || navigator.userAgent.match(/BlackBerry/i)
 || navigator.userAgent.match(/Windows Phone/i)
 ){
    return true;
  }
 else {
    return false;
  }
}
window.onresize = function(event) {
	resizeDiv();
}

function addImage(source,coords){
	// coords2 = [coords.latitude,coords.longitude];
	coords2 = [coords[1],coords[0]]
	map.loadImage(
		source,
		function (error, image) {
			if (error) throw error;
			 
			// Add the image to the map style.
			uniqueInd = generateID(4)
			map.addImage('cat'+uniqueInd, image);
			 
			// Add a data source containing one point feature.
			map.addSource('point'+uniqueInd, {
				'type': 'geojson',
				'data': {
					'type': 'FeatureCollection',
					'features': [
						{
						'type': 'Feature',
						'geometry': {
							'type': 'Point',
							'coordinates': coords2
							}
						}
					]
				}
			});
			 
			// Add a layer to use the image to represent the data.
			map.addLayer({
				'id': 'points'+uniqueInd,
				'type': 'symbol',
				'source': 'point'+uniqueInd, // reference the data source
				'layout': {
					'icon-image': 'cat'+uniqueInd, // reference the image
					'icon-size': 0.1,
				}
			});
		}
	);
}

function addLine(points){
	var uniqueInd = generateID(4)
	var computedGeoJSON =  {
		'type': 'geojson',
		'data': {
			'type': 'Feature',
			'properties': {},
			'geometry': {
				'type': 'LineString',
				'coordinates': 
					points
				
				}
			}
	}
	map.addSource('route'+uniqueInd,computedGeoJSON);
			map.addLayer({
				'id': 'route'+uniqueInd,
				'type': 'line',
				'source': 'route'+uniqueInd,
				'layout': {
					'line-join': 'round',
					'line-cap': 'round'
				},
				'paint': {
					'line-color': "blue",
					'line-width': 2
				}
			});
}

function generateID(len){
	str = ""
	for (var i = 0; i<len; i++){
		str += choose("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvw")
	}
	return str
}

function resizeDiv() {

	vpw = $(window).width();
	vph = $(window).height();

	var m=detectmob()

	$('body').css({"height":vph+"px"})
	$("#map").css({"height":vph+"px","width":(vpw*.66)+"px"})
	maph = $(".mapboxgl-canvas").height() - 40
}


$(document).ready(resizeDiv)
$(document).ready(main)