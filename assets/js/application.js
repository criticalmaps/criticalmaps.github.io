document.addEventListener('DOMContentLoaded', function () {
	var currentMarkers = [];
	var isMapFullscreen = false;
	// fullscreen animation state
	var _fullscreenSavedCenter = null;
	var _fullscreenSavedZoom = null;
	var _fullscreenAnimDuration = 0.6; // seconds for flyTo
	var _fullscreenTransitionDelay = 300; // ms delay to wait for CSS transition before animating (match SCSS 0.3s)
	var _fullscreenEaseLinearity = 0.15; // lower = more curved easing (0..1)
	// saved interaction state (restored when exiting fullscreen)
	var _prevScrollWheelZoom = null;
	var _prevTouchZoom = null;

	// helpers to enable/restore zoom interactions
	function _enableZoomInteractions() {
		try {
			if (bikeMap && bikeMap.scrollWheelZoom && typeof bikeMap.scrollWheelZoom.enabled === 'function') {
				_prevScrollWheelZoom = bikeMap.scrollWheelZoom.enabled();
				if (typeof bikeMap.scrollWheelZoom.enable === 'function') bikeMap.scrollWheelZoom.enable();
			}
			if (bikeMap && bikeMap.touchZoom && typeof bikeMap.touchZoom.enabled === 'function') {
				_prevTouchZoom = bikeMap.touchZoom.enabled();
				if (typeof bikeMap.touchZoom.enable === 'function') bikeMap.touchZoom.enable();
			}
		} catch (e) { /* ignore */ }
	}

	function _restoreZoomInteractions() {
		try {
			if (bikeMap && bikeMap.scrollWheelZoom && typeof bikeMap.scrollWheelZoom.enabled === 'function') {
				if (_prevScrollWheelZoom === false && typeof bikeMap.scrollWheelZoom.disable === 'function') bikeMap.scrollWheelZoom.disable();
				else if (_prevScrollWheelZoom === true && typeof bikeMap.scrollWheelZoom.enable === 'function') bikeMap.scrollWheelZoom.enable();
			}
			if (bikeMap && bikeMap.touchZoom && typeof bikeMap.touchZoom.enabled === 'function') {
				if (_prevTouchZoom === false && typeof bikeMap.touchZoom.disable === 'function') bikeMap.touchZoom.disable();
				else if (_prevTouchZoom === true && typeof bikeMap.touchZoom.enable === 'function') bikeMap.touchZoom.enable();
			}
		} catch (e) { /* ignore */ }
		_prevScrollWheelZoom = null;
		_prevTouchZoom = null;
	}

	// Native Fullscreen API helper (handles vendor prefixes and Promise/event fallback)
	var _nativeFullscreen = (function () {
		var methodMap = [
			['requestFullscreen', 'exitFullscreen', 'fullscreenElement', 'fullscreenEnabled', 'fullscreenchange', 'fullscreenerror'],
			['webkitRequestFullscreen', 'webkitExitFullscreen', 'webkitFullscreenElement', 'webkitFullscreenEnabled', 'webkitfullscreenchange', 'webkitfullscreenerror'],
			['msRequestFullscreen', 'msExitFullscreen', 'msFullscreenElement', 'msFullscreenEnabled', 'MSFullscreenChange', 'MSFullscreenError']
		];
		var base = methodMap[0];
		for (var i = 0; i < methodMap.length; i++) {
			var m = methodMap[i];
			if (m[1] in document) {
				var ret = {};
				for (var j = 0; j < m.length; j++) ret[base[j]] = m[j];
				return ret;
			}
		}
		return null;
	})();

	var fullscreenAPI = {
		native: !!_nativeFullscreen,
		nativeAPI: _nativeFullscreen,
		on: function (event, cb) {
			if (!this.native) return;
			document.addEventListener(this.nativeAPI[event === 'change' ? 'fullscreenchange' : 'fullscreenerror'], cb);
		},
		off: function (event, cb) {
			if (!this.native) return;
			document.removeEventListener(this.nativeAPI[event === 'change' ? 'fullscreenchange' : 'fullscreenerror'], cb);
		},
		isEnabled: function () {
			return this.native && Boolean(document[this.nativeAPI.fullscreenEnabled]);
		},
		isFullscreen: function () {
			return this.native && Boolean(document[this.nativeAPI.fullscreenElement]);
		},
		_callNative: async function (action) {
			try {
				var res = action();
				if (res instanceof Promise) await res;
				return;
			} catch (e) {
				// For older Safari that doesn't return a Promise, wait for fullscreenchange
				await new Promise(function (resolve) {
					var handler = function () {
						document.removeEventListener(fullscreenAPI.nativeAPI.fullscreenchange, handler);
						resolve();
					};
					document.addEventListener(fullscreenAPI.nativeAPI.fullscreenchange, handler);
				});
			}
		},
		request: async function (el, options) {
			el = el || document.documentElement;
			if (!this.native) return Promise.reject(new Error('Fullscreen API not available'));
			var req = this.nativeAPI.requestFullscreen;
			return this._callNative(function () { return el[req](options); });
		},
		exit: async function () {
			if (!this.native) return Promise.reject(new Error('Fullscreen API not available'));
			var exit = this.nativeAPI.exitFullscreen;
			return this._callNative(function () { return document[exit](); });
		}
	};

	// create the map first (was after svgRenderer). The error came from calling L.svg().addTo(bikeMap)
	// before bikeMap existed ("t.addLayer" -> internal map object was undefined).
	var bikeMap = new L.map('map', { zoomControl: false, minZoom: 4, maxZoom: 13, scrollWheelZoom: false, easeLinearity: _fullscreenEaseLinearity }).setView([52.468209, 13.425995], 3);

	// add zoom control to top right (fs control will be inserted first in the container)
	new L.Control.Zoom({ position: 'topright' }).addTo(bikeMap);

	// helper to ensure a center-right container exists and return it
	function ensureCenterRightContainer() {
		var controlContainer = (bikeMap && bikeMap._controlContainer) ? bikeMap._controlContainer : document.querySelector('.leaflet-control-container') || document.body;
		var centerRight = controlContainer.querySelector('.leaflet-center.leaflet-right');
		if (!centerRight) {
			centerRight = document.createElement('div');
			centerRight.className = 'leaflet-center leaflet-right';
			controlContainer.appendChild(centerRight);
		}
		return centerRight;
	}

	// Move zoom control into center-right container so it is vertically centered on the right side
	try {
		var centerRightEl = ensureCenterRightContainer();
		var controlContainer = (bikeMap && bikeMap._controlContainer) ? bikeMap._controlContainer : document.querySelector('.leaflet-control-container') || document.body;
		var zoomEl = controlContainer.querySelector('.leaflet-control-zoom');
		if (zoomEl) {
			if (isMobile.any()) {
				// hide zoom control on mobile
				zoomEl.style.display = 'none';
			} else {
				zoomEl.style.display = '';
				if (zoomEl.parentNode !== centerRightEl) centerRightEl.appendChild(zoomEl);
			}
		}
	} catch (e) { /* ignore */ }

	// map style URLs (change darkStyle if you have a preferred dark theme)
	var MAPTILER_KEY = 'veX8Oi3lr3dolNkIbcRT';
	var lightStyleUrl = 'https://api.maptiler.com/maps/basic-v2/style.json?key=' + MAPTILER_KEY;
	var darkStyleUrl = 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=' + MAPTILER_KEY;

	var mapboxLayer = null;
	function applyMapStyle(useDark) {
		// remove existing layer if present
		if (mapboxLayer) {
			try { bikeMap.removeLayer(mapboxLayer); } catch (e) { /* ignore */ }
			mapboxLayer = null;
		}
		mapboxLayer = L.mapboxGL({
			attribution: '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
			style: useDark ? darkStyleUrl : lightStyleUrl
		}).addTo(bikeMap);
		// update existing markers to match theme
		var markerColor = getComputedStyle(document.documentElement).getPropertyValue('--color-action').trim();
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

	var hash = new L.Hash(bikeMap);

	// create a shared SVG renderer and add it to the map so all circleMarkers live in the same <svg>
	var svgRenderer = L.svg().addTo(bikeMap);

	// Fullscreen functionality
	function createFullscreenControls() {
		var mapEl = document.getElementById('map');
		// Only enable fullscreen controls if the page has #map and it opts in via data-fullscreen="true" OR presence of data-fullscreen
		var hasOptIn = mapEl && (mapEl.getAttribute('data-fullscreen') === 'true' || mapEl.hasAttribute('data-fullscreen'));
		// Do not show fullscreen controls on mobile devices
		if (!mapEl || !hasOptIn || isMobile.any()) return; 
		
		// Create container inside Leaflet control corner (center right)
		var controlContainer = (bikeMap && bikeMap._controlContainer) ? bikeMap._controlContainer : document.querySelector('.leaflet-control-container') || document.body;
		var centerRight = controlContainer.querySelector('.leaflet-center.leaflet-right');
		if (!centerRight) {
			centerRight = document.createElement('div');
			centerRight.className = 'leaflet-center leaflet-right';
			controlContainer.appendChild(centerRight);
		}
		var fsControl = centerRight.querySelector('.leaflet-control-fullscreen');
		if (!fsControl) {
			fsControl = document.createElement('div');
			fsControl.className = 'leaflet-control-fullscreen leaflet-bar leaflet-control';
			fsControl.setAttribute('role', 'group');
			fsControl.setAttribute('aria-label', 'Map fullscreen controls');
			// Insert as first child so fullscreen control appears before other controls
			centerRight.insertBefore(fsControl, centerRight.firstChild);
		} 

		// Create maximize button
		var maximizeBtn = document.createElement('button');
		maximizeBtn.id = 'map-fullscreen-btn';
		maximizeBtn.className = 'map-fullscreen-btn';
		maximizeBtn.setAttribute('aria-label', 'Expand map to fullscreen');
		maximizeBtn.setAttribute('aria-pressed', 'false');
		maximizeBtn.setAttribute('title', 'Expand to fullscreen (F)');
		maximizeBtn.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
		maximizeBtn.onclick = function(e) {
			e.preventDefault();
			toggleMapFullscreen();
		};

		// Keep keyboard shortcut support (F key) and ESC fallback
		document.addEventListener('keydown', function(e) {
			if (e.key === 'f' || e.key === 'F') {
				// Only trigger if not typing in an input/textarea
				if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
					toggleMapFullscreen();
				}
			}
			// ESC key to exit fullscreen if currently toggled
			if (e.key === 'Escape' && isMapFullscreen) {
				toggleMapFullscreen();
			}
		});

		fsControl.appendChild(maximizeBtn);

		// Move zoom control into center-right container so it stacks below the fullscreen button
		try {
			var zoomEl = controlContainer.querySelector('.leaflet-control-zoom');
			if (zoomEl) {
				if (isMobile.any()) {
					zoomEl.style.display = 'none';
				} else {
					zoomEl.style.display = '';
					if (zoomEl.parentNode !== centerRight) centerRight.appendChild(zoomEl);
				}
			}
		} catch (e) { /* ignore */ }

		function updateButtonState(isFs) {
			var btn = document.getElementById('map-fullscreen-btn');
			if (!btn) return;
			if (isFs) {
				btn.setAttribute('aria-label', 'Exit fullscreen');
				btn.setAttribute('aria-pressed', 'true');
				btn.setAttribute('title', 'Exit fullscreen (ESC)');
				btn.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
			} else {
				btn.setAttribute('aria-label', 'Expand map to fullscreen');
				btn.setAttribute('aria-pressed', 'false');
				btn.setAttribute('title', 'Expand to fullscreen (F)');
				btn.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
			}
		}

		// Handle changes triggered by browser (ESC or external controls)
		function onNativeFsChange() {
			var btn = document.getElementById('map-fullscreen-btn');
			var html = document.documentElement;
			var mapEl = document.getElementById('map');
			var fsEl = null;
			if (fullscreenAPI.native) fsEl = document[fullscreenAPI.nativeAPI.fullscreenElement];
			// Only react when our map element is the fullscreen element
			var isNativeFs = !!fsEl && mapEl && (fsEl === mapEl);
			if (isNativeFs) {
				// We are now fullscreen
				isMapFullscreen = true;
				html.classList.add('map-fullscreen-active');
				if (mapEl) mapEl.classList.add('fullscreen');
				updateButtonState(true);
				// enable pinch/scroll zoom in fullscreen
				_enableZoomInteractions();
				bikeMap.invalidateSize();
				setTimeout(function() {
					try {
						var targetZoom = Math.max(bikeMap.getMinZoom(), (_fullscreenSavedZoom || bikeMap.getZoom()) - 1.5);
						bikeMap.flyTo(_fullscreenSavedCenter || bikeMap.getCenter(), targetZoom, { animate: true, duration: _fullscreenAnimDuration, easeLinearity: _fullscreenEaseLinearity });
					} catch (e) { /* ignore */ }
				}, 50);
			} else if (!fsEl) {
				// Exited fullscreen (or another element was fullscreen then closed)
				isMapFullscreen = false;
				html.classList.remove('map-fullscreen-active');
				if (mapEl) mapEl.classList.remove('fullscreen');
				updateButtonState(false);
				// restore previous interaction modes
				_restoreZoomInteractions();
				bikeMap.invalidateSize();
				setTimeout(function() {
					try {
						var restoreCenter = _fullscreenSavedCenter || bikeMap.getCenter();
						var restoreZoom = _fullscreenSavedZoom || bikeMap.getZoom();
						bikeMap.flyTo(restoreCenter, restoreZoom, { animate: true, duration: _fullscreenAnimDuration, easeLinearity: _fullscreenEaseLinearity });
					} catch (e) { /* ignore */ }
				}, 50);
			}
		} 

		if (fullscreenAPI.isEnabled()) {
			fullscreenAPI.on('change', onNativeFsChange);
		}

	}



	async function toggleMapFullscreen() {
		var mapEl = document.getElementById('map');
		// Only toggle fullscreen if #map exists and it opts in via data-fullscreen (presence) or equals "true"
		var hasOptIn = mapEl && (mapEl.getAttribute('data-fullscreen') === 'true' || mapEl.hasAttribute('data-fullscreen'));
		if (!mapEl || !hasOptIn) return;
		// Do not allow toggling fullscreen on mobile devices
		if (isMobile.any()) return;
		var mapWrapper = mapEl; // use the map element itself for fullscreen target (no wrapper created)
		var btn = document.getElementById('map-fullscreen-btn');
		var html = document.documentElement;

		if (!isMapFullscreen) {
			// ENTER fullscreen (native if available)
			_fullscreenSavedCenter = bikeMap.getCenter();
			_fullscreenSavedZoom = bikeMap.getZoom();
			var targetZoom = Math.max(bikeMap.getMinZoom(), _fullscreenSavedZoom - 1.5);
			isMapFullscreen = true;
			bikeMap._exitFired = false;

			if (fullscreenAPI.isEnabled()) {
				try {
					await fullscreenAPI.request(mapWrapper);
					// when native request resolves, enable interactions
					_enableZoomInteractions();
				} catch (e) {
					// fallback to pseudo-fullscreen
					html.classList.add('map-fullscreen-active');
					mapWrapper.classList.add('fullscreen');
					_enableZoomInteractions();
				}
			} else {
				html.classList.add('map-fullscreen-active');
				mapWrapper.classList.add('fullscreen');
				_enableZoomInteractions();
			}

			if (btn) {
				btn.setAttribute('aria-label', 'Exit fullscreen');
				btn.setAttribute('aria-pressed', 'true');
				btn.setAttribute('title', 'Exit fullscreen (ESC)');
				btn.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
			}
			announceToScreenReader('Map is now fullscreen. Press ESC to exit.');
			bikeMap.invalidateSize();
			setTimeout(function() {
				try {
					bikeMap.flyTo(_fullscreenSavedCenter, targetZoom, { animate: true, duration: _fullscreenAnimDuration, easeLinearity: _fullscreenEaseLinearity });
				} catch (e) { /* ignore */ }
			}, 50);
		} else {
			// EXIT fullscreen (native if available)
			isMapFullscreen = false;
			if (fullscreenAPI.isEnabled()) {
				bikeMap._exitFired = true;
				try {
					await fullscreenAPI.exit();
				} catch (e) {
					html.classList.remove('map-fullscreen-active');
					mapWrapper.classList.remove('fullscreen');
					_restoreZoomInteractions();
				}
			} else {
				html.classList.remove('map-fullscreen-active');
				mapWrapper.classList.remove('fullscreen');
				_restoreZoomInteractions();
			}

			if (btn) {
				btn.setAttribute('aria-label', 'Expand map to fullscreen');
				btn.setAttribute('aria-pressed', 'false');
				btn.setAttribute('title', 'Expand to fullscreen (F)');
				btn.innerHTML = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="24" height="24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
			}
			announceToScreenReader('Map exited fullscreen mode.');
			bikeMap.invalidateSize();
			setTimeout(function() {
				try {
					var restoreCenter = _fullscreenSavedCenter || bikeMap.getCenter();
					var restoreZoom = _fullscreenSavedZoom || bikeMap.getZoom();
					bikeMap.flyTo(restoreCenter, restoreZoom, { animate: true, duration: _fullscreenAnimDuration, easeLinearity: _fullscreenEaseLinearity });
				} catch (e) { /* ignore */ }
			}, 50);
		}
	}

	function announceToScreenReader(message) {
		var liveRegion = document.getElementById('map-sr-announcements');
		if (!liveRegion) {
			liveRegion = document.createElement('div');
			liveRegion.id = 'map-sr-announcements';
			liveRegion.className = 'sr-only';
			liveRegion.setAttribute('role', 'status');
			liveRegion.setAttribute('aria-live', 'polite');
			liveRegion.setAttribute('aria-atomic', 'true');
			document.body.appendChild(liveRegion);
		}
		liveRegion.textContent = message;
	}

	// Initialize fullscreen controls when page loads
	createFullscreenControls();

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
		var markerColor = getComputedStyle(document.documentElement).getPropertyValue('--color-action').trim();
		locationsArray.forEach(function (coordinate) {
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

// Mobile detection (focused on iOS and Android)
var isMobile = (function () {
	var ua = navigator.userAgent || navigator.vendor || '';
	var isAndroid = /Android/i.test(ua);
	var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	return {
		Android: function () { return isAndroid; },
		iOS: function () { return isIOS; },
		any: function () { return isAndroid || isIOS; }
	};
})();

// Apply platform class to <html> for styling
if (isMobile.iOS()) {
	document.documentElement.classList.add('ios');
} else if (isMobile.Android()) {
	document.documentElement.classList.add('android');
}

criticalMapsUtils = {
	convertCoordinateFormat: function (oldFormat) {
		oldFormat = oldFormat.toString();
		var chars = oldFormat.split('');
		chars.splice(-6, 0, '.');
		return chars.join('');
	}
}