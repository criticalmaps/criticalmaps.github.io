document.addEventListener('DOMContentLoaded', function () {
	var currentMarkers = [];
	var isDarkMode = false;

	// create the map first (was after svgRenderer). The error came from calling L.svg().addTo(bikeMap)
	// before bikeMap existed ("t.addLayer" -> internal map object was undefined).
	var bikeMap = new L.map('map', { zoomControl: false, minZoom: 4, maxZoom: 13 }).setView([52.468209, 13.425995], 3);

	// map style URLs (change darkStyle if you have a preferred dark theme)
	var MAPTILER_KEY = 'veX8Oi3lr3dolNkIbcRT';
	var lightStyleUrl = 'https://api.maptiler.com/maps/basic-v2/style.json?key=' + MAPTILER_KEY;
	var darkStyleUrl = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=' + MAPTILER_KEY;

	var mapboxLayer = null;
	function applyMapStyle(useDark) {
		isDarkMode = !!useDark;
		// remove existing layer if present
		if (mapboxLayer) {
			try { bikeMap.removeLayer(mapboxLayer); } catch (e) { /* ignore */ }
			mapboxLayer = null;
		}
		mapboxLayer = L.mapboxGL({
			attribution: '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
			style: useDark ? darkStyleUrl : lightStyleUrl
		}).addTo(bikeMap);
		// update existing markers to match theme (yellow in dark mode)
		var markerColor = isDarkMode ? '#ffd633' : '#4400ff';
		currentMarkers.forEach(function (m) {
			try { m.setStyle({ fillColor: markerColor, color: markerColor }); } catch (e) { /* ignore */ }
		});
	}

	// initial apply and live updates based on system preference
	var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
	applyMapStyle(mq ? mq.matches : false);
	if (mq) {
		// modern browsers
		if (typeof mq.addEventListener === 'function') {
			mq.addEventListener('change', function (ev) { applyMapStyle(ev.matches); });
		} else if (typeof mq.addListener === 'function') {
			// older browsers
			mq.addListener(function (ev) { applyMapStyle(ev.matches); });
		}
	}

	new L.Control.Zoom({ position: 'bottomleft' }).addTo(bikeMap);
	var hash = new L.Hash(bikeMap);

	// create a shared SVG renderer and add it to the map so all circleMarkers live in the same <svg>
	var svgRenderer = L.svg().addTo(bikeMap);

	// shared meatball state
	var meatballState = { blur: 0, thresh: 1 };

	// compute the minimum pixel distance between any two current markers (used by meatball animation)
	function computeMinPixelDistance() {
		var pts = [];
		for (var i = 0; i < currentMarkers.length; i++) {
			try {
				var latlng = currentMarkers[i].getLatLng();
				if (!latlng) continue;
				pts.push(bikeMap.latLngToContainerPoint(latlng));
			} catch (e) {
				// ignore invalid markers
			}
		}
		var min = Infinity;
		for (var i = 0; i < pts.length; i++) {
			for (var j = i + 1; j < pts.length; j++) {
				var dx = pts[i].x - pts[j].x;
				var dy = pts[i].y - pts[j].y;
				var d = Math.sqrt(dx * dx + dy * dy);
				if (d < min) min = d;
			}
		}
		return isFinite(min) ? min : Infinity;
	}

	// inject an SVG meatball filter and animate stdDeviation + tableValues so markers "merge"
	(function addSvgmeatballAndAnimate() {
		var ns = 'http://www.w3.org/2000/svg';
		var svg = svgRenderer._container && svgRenderer._container.ownerSVGElement || svgRenderer._container;
		if (!svg) {
			bikeMap.once('load', addSvgmeatballAndAnimate);
			return;
		}

		// remove existing defs/filter if present (allow reload)
		var existing = svg.querySelector('#cm-defs');
		if (existing) existing.parentNode.removeChild(existing);

		// build defs/filter programmatically so we keep references
		var defs = document.createElementNS(ns, 'defs');
		defs.setAttribute('id', 'cm-defs');

		var filter = document.createElementNS(ns, 'filter');
		filter.setAttribute('id', 'meatball');
		filter.setAttribute('x', '-50%');
		filter.setAttribute('y', '-50%');
		filter.setAttribute('width', '200%');
		filter.setAttribute('height', '200%');

		var feGaussianBlur = document.createElementNS(ns, 'feGaussianBlur');
		feGaussianBlur.setAttribute('in', 'SourceGraphic');
		feGaussianBlur.setAttribute('stdDeviation', '0');
		feGaussianBlur.setAttribute('result', 'blur');
		feGaussianBlur.setAttribute('id', 'cm-feGaussianBlur');

		var feComponentTransfer = document.createElementNS(ns, 'feComponentTransfer');
		feComponentTransfer.setAttribute('in', 'blur');
		feComponentTransfer.setAttribute('result', 'thresholded');

		// use table functions for RGB + A so colours remain intact after thresholding
		var feFuncA = document.createElementNS(ns, 'feFuncA');
		feFuncA.setAttribute('type', 'table');
		feFuncA.setAttribute('tableValues', '0 1');
		feFuncA.setAttribute('id', 'cm-feFuncA');

		feComponentTransfer.appendChild(feFuncA);

		filter.appendChild(feGaussianBlur);
		filter.appendChild(feComponentTransfer);
		defs.appendChild(filter);

		svg.insertBefore(defs, svg.firstChild);

		// cache frequently-used DOM refs (avoid querying on every frame)
		var rendererGroup = svgRenderer._container || svg.querySelector('g');
		var feBlurEl = svg.querySelector('#cm-feGaussianBlur');
		var feFuncAEl = svg.querySelector('#cm-feFuncA');
		if (rendererGroup && rendererGroup.setAttribute) rendererGroup.setAttribute('filter', 'url(#meatball)');
		function applyFilterToRendererGroup() {
			// avoid repeated DOM writes
			if (rendererGroup && rendererGroup.setAttribute && rendererGroup.getAttribute('filter') !== 'url(#meatball)') {
				rendererGroup.setAttribute('filter', 'url(#meatball)');
			}
		}
		applyFilterToRendererGroup();

		// animation state uses outer meatballState
		var state = meatballState;
		var rafId = null;
		var isZooming = false; // pause heavy updates while user is zooming

		// pause meatball updates while zooming to avoid heavy work during map zoom animations
		bikeMap.on('zoomstart', function () {
			isZooming = true;
			if (rafId) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		});
		bikeMap.on('zoomend', function () {
			isZooming = false;
			// force one immediate update and restart loop
			updateOnce();
			if (!rafId) loop();
		});

		// compute proximity score (0..1) from all marker pairs in viewport
		function computeProximityScore() {
			var pts = [];
			var bounds = bikeMap.getBounds();
			for (var i = 0; i < currentMarkers.length; i++) {
				try {
					var latlng = currentMarkers[i].getLatLng();
					if (!latlng) continue;
					if (!bounds.contains(latlng)) continue; // only consider visible markers
					var p = bikeMap.latLngToContainerPoint(latlng);
					pts.push(p);
				} catch (e) { /* ignore invalid markers */ }
			}
			var n = pts.length;
			if (n < 2) return 0;

			var mergeR = mergeRadius; // capture below variable
			var sum = 0;
			var pairs = 0;
			for (var i = 0; i < n; i++) {
				for (var j = i + 1; j < n; j++) {
					pairs++;
					var dx = pts[i].x - pts[j].x;
					var dy = pts[i].y - pts[j].y;
					var d = Math.sqrt(dx * dx + dy * dy);
					if (d < mergeR) {
						// weight grows as distance gets smaller
						sum += (1 - d / mergeR);
					}
				}
			}
			if (pairs === 0) return 0;
			// average weight across all pairs => 0..1
			return Math.min(1, sum / pairs);
		}

		// parameters (ensure available in closure)
		var mergeRadius = 80; // pixels where merging starts
		var maxBlur = 16;     // maximum stdDeviation (px)
		var minThreshold = 0.05;
		var maxThreshold = 0.9;
		var TABLE_STEPS = 10;

		// same buildTableValues as before
		function buildTableValues(threshold) {
			var normalized = (threshold - minThreshold) / (maxThreshold - minThreshold);
			normalized = Math.max(0, Math.min(1, normalized));
			var onesCount = Math.round((1 - normalized) * (TABLE_STEPS - 1));
			var zerosCount = TABLE_STEPS - onesCount;
			var arr = [];
			for (var i = 0; i < zerosCount; i++) arr.push('0');
			for (var i = 0; i < onesCount; i++) arr.push('1');
			if (arr.indexOf('1') === -1) arr[arr.length - 1] = '1';
			return arr.join(' ');
		}

		function updateOnce() {
			// proximity score from all visible markers
			var proximity = computeProximityScore(); // 0..1

			// fallback min-distance-based t (keeps behaviour from before)
			var minDist = computeMinPixelDistance();
			var tMin = 0;
			if (minDist !== Infinity) {
				tMin = 1 - Math.min(mergeRadius, minDist) / mergeRadius;
			}

			// combine: take the stronger signal (either closest pair OR overall proximity)
			var t = Math.max(tMin, proximity);

			// hover-based boosts removed

			// small zoom bias (optional)
			// small distance bias (optional) — boost based on closest pair pixel distance
			var minDistForBias = computeMinPixelDistance();
			var distanceFactor = 0;
			if (minDistForBias !== Infinity) {
				// distanceFactor = 1 when markers are very close, 0 when farther than mergeRadius
				distanceFactor = Math.max(0, 1 - Math.min(mergeRadius, minDistForBias) / mergeRadius);
			}
			t = Math.max(t, (t * 0.9 + distanceFactor * 0.1));

			var targetBlur = maxBlur * t;
			var targetThresh = maxThreshold - (maxThreshold - minThreshold) * t;

			// smooth interpolation
			state.blur += (targetBlur - state.blur) * 0.12;
			state.thresh += (targetThresh - state.thresh) * 0.12;

			// if zooming, skip expensive proximity computations (we pause RAF on zoomstart,
			// but keep defensive guard here too)
			if (isZooming) return;

			// apply to cached SVG filter elements
			if (feBlurEl) feBlurEl.setAttribute('stdDeviation', Math.max(0.001, state.blur).toFixed(3));
			var table = buildTableValues(state.thresh);
			if (feFuncAEl) {
				// avoid unnecessary attribute writes
				if (feFuncAEl.getAttribute('tableValues') !== table) feFuncAEl.setAttribute('tableValues', table);
			}

			applyFilterToRendererGroup();
		}

		// animation loop
		function loop() {
			updateOnce();
			rafId = requestAnimationFrame(loop);
		}

		if (!rafId) loop();

		// cleanup when map removed
		bikeMap.on('unload', function () {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = null;
		});

		// hover handlers removed — markers no longer affect meatball state on mouseover
	})();

	function saveHashToElements() {
		if (hash.lastHash) {
			document.querySelectorAll('.hash-append').forEach(function (el) {
				var tmpl = el.getAttribute('data-template') || el.dataset.template || '';
				el.setAttribute('href', tmpl.replace('${hash}', hash.lastHash));
			});
		}
	}
	bikeMap.on("moveend", function () {
		saveHashToElements();
		document.getElementById('activeusers') && (document.getElementById('activeusers').textContent = countMarkerInView());
		document.getElementById('totalusers') && (document.getElementById('totalusers').textContent = currentMarkers.length);
	}, this);
	bikeMap.on("zoomend", function () {
		saveHashToElements();
		document.getElementById('activeusers') && (document.getElementById('activeusers').textContent = countMarkerInView());
		document.getElementById('totalusers') && (document.getElementById('totalusers').textContent = currentMarkers.length);
	}, this);

	function setNewLocations(locationsArray) {
		//remove old markers
		currentMarkers.forEach(function (marker) {
			bikeMap.removeLayer(marker)
		});
		currentMarkers = []

		//add new markers as SVG circleMarkers (use shared svgRenderer)
		locationsArray.forEach(function (coordinate) {
			var markerColor = isDarkMode ? '#ffd633' : '#4400ff';
			var circle = L.circleMarker([coordinate.latitude, coordinate.longitude], {
				renderer: svgRenderer,
				radius: 12,
				fillColor: markerColor,
				color: markerColor,
				weight: 1,
				opacity: 1,
				fillOpacity: 1,
				className: 'map-marker-bike'
			}).addTo(bikeMap);

			currentMarkers.push(circle);
		});

		// update visible counter right away
		var el = document.getElementById('activeusers');
		if (el) el.textContent = countMarkerInView();

		// update total counter
		var elTotal = document.getElementById('totalusers');
		if (elTotal) elTotal.textContent = currentMarkers.length;
	}



	function countMarkerInView() {
		var counter = 0;
		bikeMap.eachLayer(function (layer) {
			// accept layers that expose getLatLng (CircleMarker / Marker)
			if (typeof layer.getLatLng === 'function') {
				try {
					if (bikeMap.getBounds().contains(layer.getLatLng())) {
						counter++;
					}
				} catch (e) {
					// ignore layers that don't have valid latlng
				}
			}
		});
		return counter;
	};

	var refreshLocationsFromServer = function () {
		fetch("https://api-cdn.criticalmaps.net/locations")
			.then(function (res) { if (!res.ok) throw res; return res.json(); })
			.then(function (data) {
				locationsArray = [];
				for (const location of data) {
					var coordinate = {
						latitude: criticalMapsUtils.convertCoordinateFormat(location.latitude),
						longitude: criticalMapsUtils.convertCoordinateFormat(location.longitude)
					};
					locationsArray.push(coordinate);
				}
				setNewLocations(locationsArray);
			})
			.catch(function (err) {
				console.error('Failed to fetch locations', err);
			});
	}
	setInterval(function () { refreshLocationsFromServer() }, 60000);

	refreshLocationsFromServer();

	document.addEventListener('keypress', function (event) {
		var key = event.key || event.keyIdentifier || '';
		if (key === 'h' || key === 'H' || event.which === 104) {
			setInterval(function () { refreshLocationsFromServer(); }, 1000);
			alert("ab geht die post!");
		}
	});

	setInterval(function () {
		refreshLocationsFromServer();
		var nBikes = countMarkerInView();
		document.getElementById("activeusers").textContent = nBikes;
		document.getElementById("totalusers").textContent = currentMarkers.length;
	}, 60000);
});

$().ready(function () {
	var isMobile = {
		Android: function () {
			return navigator.userAgent.match(/Android/i);
		},
		BlackBerry: function () {
			return navigator.userAgent.match(/BlackBerry/i);
		},
		iOS: function () {
			return navigator.userAgent.match(/iPhone|iPad|iPod/i);
		},
		Opera: function () {
			return navigator.userAgent.match(/Opera Mini/i);
		},
		Windows: function () {
			return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
		},
		any: function () {
			return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
		}
	};
	if (isMobile.iOS()) {
		$('html').addClass('ios');
	} else if (isMobile.Android()) {
		$('html').addClass('android');
	}
});

criticalMapsUtils = {
	convertCoordinateFormat: function (oldFormat) {
		oldFormat = oldFormat.toString();
		var chars = oldFormat.split('');
		chars.splice(-6, 0, '.');
		return chars.join('');
	}
}
