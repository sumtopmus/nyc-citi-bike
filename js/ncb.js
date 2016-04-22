var centerLocation = [40.73, -73.98];
var zoomLevel = 12;

var mapboxProjectID = 'tckh.pmj1j8f2';
var accessToken = 'pk.eyJ1IjoidGNraCIsImEiOiJjaW4ya21ic3AwYmpudW5tNGVkYjZlZmY1In0.G-FbINfBOJqYVoIrcmY8lw';
var attribution = '<a href="http://mapbox.com">Mapbox</a> | <a href="http://openstreetmap.org">OpenStreetMap</a>';

var maxCirleMarkerRadius = 150;
var colorRange = ["#0d0887", "#2a0593", "#41049d", "#5601a4", "#6a00a8", "#7e03a8", "#8f0da4",
				  "#a11b9b", "#b12a90", "#bf3984", "#cc4778", "#d6556d", "#e16462", "#ea7457",
				  "#f2844b", "#f89540", "#fca636", "#feba2c", "#fcce25", "#f7e425", "#f0f921"];

function createMap(mapID) {
	var map = L.map(mapID).setView(centerLocation, zoomLevel);
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		attribution: attribution,
		id: mapboxProjectID,
		accessToken: accessToken })
	 .addTo(map);
	return map;
}

function addData(data) {
	var maxTotalDocks = d3.max(data, function(d) { return +d.totalDocks; });
	var maxDepCount = d3.max(data, function(d) { return +d.dep_count; });
	var maxMeanUsageTime = d3.max(data, function(d) { return +d.dep_mean; });
	var radius = d3.scale.sqrt()
				   .domain([0, maxTotalDocks])
				   .range([0, maxCirleMarkerRadius]);
	var colorDepCount = d3.scale.quantize()
						  .domain(d3.extent(data, function(d) { return +d.dep_count; }))
						  .range(colorRange);
	var colorMeanUsageTime = d3.scale.quantize()
							   .domain(d3.extent(data, function(d) { return +d.dep_mean; }))
							   .range(colorRange);

	createLegend(1e5, 6, 1, colorDepCount).addTo(map1);
	createLegend(40, 5, 60, colorMeanUsageTime).addTo(map2);
	info1 = createInfo('Citi Bike station information', 'Hover over a station', format).addTo(map1);
	data.forEach(function(d) {
		L.circle([+d.latitude, +d.longitude], radius(+d.totalDocks), {
			color: colorDepCount(+d.dep_count),
			fillColor: colorDepCount(+d.dep_count),
			fillOpacity: 0.65 })
		 .bindPopup(format(d))
		 .on('mouseover', function (e) { info1.update(d); })
         .on('mouseout', function (e) { info1.update(); })
    	 .addTo(map1);

		L.circle([+d.latitude, +d.longitude], radius(+d.totalDocks), {
			color: colorMeanUsageTime(+d.dep_mean),
			fillColor: colorMeanUsageTime(+d.dep_mean),
			fillOpacity: 0.65 })
		 .bindPopup(format(d))
		 .addTo(map2);
	});
}

function createLegend(max, count, factor, colorizer) {
	var legend = L.control({position: 'bottomright'});
	legend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend'),
			grades = numeric.linspace(0, max, count),
			stepToAdd = (grades[1] - grades[0])/5 + 1;

		for (var i = grades.length; i > 0 ; i--) {
			div.innerHTML +=
				'<i style="background:' + colorizer(factor*(grades[i-1]+stepToAdd)) + '"></i>'
				+ grades[i-1]
				+ (grades[i] ? '&ndash;' + (+grades[i]-1) : '+')
				+ (grades[i-1] ? '<br>' : '');
		}
		return div;
	};
	return legend;
}

function createInfo(label, hint, formatter) {
	var info = L.control();
	info.onAdd = function(map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
	};
	info.update = function(d) {
		this._div.innerHTML = '<h4>' + label + '</h4>' +
			(d ? formatter(d) : hint);
	};
	return info;
}

function format(d) {
	return '<b>' + d.name + '</b><br />' +
		   'Docks: ' + d.totalDocks;
}

var map1 = createMap('map1');
var map2 = createMap('map2');

d3.csv("data/trips-pivot.csv", addData);