var centerLocation = [40.73, -73.98];
var zoomLevel = 12;

var mapboxProjectID = 'tckh.pmj1j8f2';
var accessToken = 'pk.eyJ1IjoidGNraCIsImEiOiJjaW4ya21ic3AwYmpudW5tNGVkYjZlZmY1In0.G-FbINfBOJqYVoIrcmY8lw';
var attribution = '<a href="http://mapbox.com">Mapbox</a> | <a href="http://openstreetmap.org">OpenStreetMap</a>';

var maxCirleMarkerRadius = 150;
var colorRange = ["#0d0887", "#2a0593", "#41049d", "#5601a4", "#6a00a8", "#7e03a8", "#8f0da4",
				  "#a11b9b", "#b12a90", "#bf3984", "#cc4778", "#d6556d", "#e16462", "#ea7457",
				  "#f2844b", "#f89540", "#fca636", "#feba2c", "#fcce25", "#f7e425", "#f0f921"];

var margin = {top: 25, right: 20, bottom: 50, left: 40},
	fullWidth = 500,
	fullHeight = 250,
	width = fullWidth - margin.left - margin.right,
	height = fullHeight - margin.top - margin.bottom;

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
			.on('mouseover', function(e) { info1.update(d); })
			.on('mouseout', function(e) { info1.update(); })
			.addTo(map1);

		marker = L.circle([+d.latitude, +d.longitude], radius(+d.totalDocks), {
			color: colorMeanUsageTime(+d.dep_mean),
			fillColor: colorMeanUsageTime(+d.dep_mean),
			fillOpacity: 0.65 })
			.addTo(map2);
		
		marker.on('click', function(e) {
			if (e.target.getPopup == null) {
				popupID = 'popup-viz-' + d.id
				popupHTML = '<div id="' + popupID +
					'" style="width: ' + fullWidth +
					'px; height: ' + fullHeight + 'px;"></div>';
				e.target.bindPopup(popupHTML);
				e.target._popup.options.maxWidth = fullWidth;
				d3.csv("data/stations/" + d.id + ".csv", function(entry) {
					return { date: new Date(entry.date), usage: +entry.usage };
				}, addTimeHistogram);
			}
			e.target.openPopup();
		});
	});
}

function createLegend(max, count, factor, colorizer) {
	var legend = L.control({position: 'bottomright'});
	legend.onAdd = function (map) {
		var div = L.DomUtil.create('div', 'info legend'),
			grades = numeric.linspace(0, max, count),
			stepToAdd = (grades[1] - grades[0])/5 + 1;

		for (var i = grades.length; i > 0; i--) {
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

function addTimeHistogram(usageData) {
	var yearWeek = d3.time.format.utc("%Y-%W"),
		year = d3.time.format.utc("%Y"),
		startYear = year(usageData[0].date),
		endYear = year(usageData[usageData.length-1].date);
	var hist = d3.nest()
		.key(function(d) { return yearWeek(d.date);	})
		.rollup(function(d) { return d3.sum(d, function(d2) { return d2.usage; }); })
		.entries(usageData)
		.map(function(d) { return { date: yearWeek.parse(d.key), usage: d.values };	});

	// for 1-year (365/366 days) only
	hist[0].date = year.parse(startYear);

	// x and y coords & axes 
	var x = function(d) { return d.date; },
		xScale = d3.time.scale.utc()
			.domain([x(hist[0]), x(hist[hist.length-1])])
			.range([0, width]),
		xAxis = d3.svg.axis()
			.scale(xScale)
			.orient("bottom")
			.ticks(d3.time.months)
	    	.tickFormat(d3.time.format("%B"))
	    	.tickSize(8, 0);
	var y = function(d) { return d.usage; },
		yScale = d3.scale.linear()
			.domain([0, d3.max(hist, y)])
			.range([height, 0]),      
		yAxis = d3.svg.axis()
			.scale(yScale)
			.orient("left");

	// for 1-year (365/366 days) only
	var standardWidth = width / (hist.length + 2),
		space = (xScale(hist[2].date) - xScale(hist[1].date)) - standardWidth,
		widthZero = (xScale(hist[1].date) - xScale(hist[0].date)) - space,
		offset = 1 + space;

	// append svg element
	var svg = d3.select('#' + popupID)
		.append("svg")
		.attr("width", fullWidth)
		.attr("height", fullHeight)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// append x axis
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
	.selectAll(".tick text")
		.attr("transform", "rotate(-45)")
		.style("text-anchor", "end")
		.attr("x", width/12)
		.attr("dx", -20)
		.attr("y", 20);

	// append y axis
	svg.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(-" + offset + ",0)")
		.call(yAxis)
		.append("text")
		.attr("y", -12)
		.style("text-anchor", "end")
		.text("Usage");

	// append bars
	svg.selectAll(".bar")
		.data(hist)
		.enter()
		.append("rect")
		.attr("class", "bar")
		.attr("x", function(d) { return xScale(x(d)); })
		.attr("width", function(d) {
			if (d == hist[0]) {
				return widthZero;
			} else {
				return standardWidth;
			}
		})
		.attr("y", function(d) { return yScale(y(d)); })
		.attr("height", function(d) { return height - yScale(y(d)); });
}

var map1 = createMap('map1');
var map2 = createMap('map2');

d3.csv("data/trips-pivot.csv", addData);