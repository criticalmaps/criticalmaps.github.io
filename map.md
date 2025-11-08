---
layout: default
title: "Critical Maps - Map"
pathName: mapPath
---

<div id="map-count">Online in visible area: <span id="activeusers"></span></div>

<!-- <div id="map-share">
    <p>Embed this map on your website:</p>
    <pre><code>&lt;iframe width=&quot;1280&quot; height=&quot;720&quot; src=&quot;https://criticalmaps.net/map-embed&quot; frameborder=&quot;0&quot; allowfullscreen&gt;&lt;/iframe&gt;</code></pre>
</div> -->

<div id="map"></div>

<script type="text/javascript">
    document.addEventListener('DOMContentLoaded', function () {
        var currentMarkers = [];

        var bikeIcon = L.icon({
            iconUrl: '/assets/images/marker-bike.png',
            iconSize: [48, 48],
            iconAnchor: [24, 24],
            className: 'map-marker-bike',
        });

        var bikeMap = new L.map('map', { zoomControl: false }).setView([52.468209, 13.425995], 3);

        L.mapboxGL({
            attribution: '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap contributors</a>',
            style: 'https://api.maptiler.com/maps/basic/style.json?key=BF1ZtxvN8zHG9Wc6omQn'
        }).addTo(bikeMap);

        new L.Control.Zoom({ position: 'bottomleft' }).addTo(bikeMap);
        var hash = new L.Hash(bikeMap);

        function saveHashToElements() {
            if (hash.lastHash) {
                document.querySelectorAll('.hash-append').forEach(function (el) {
                    var template = el.dataset.template || el.getAttribute('data-template') || '';
                    el.setAttribute('href', template.replace('${hash}', hash.lastHash));
                });
            }
        }
        bikeMap.on("moveend", saveHashToElements);
        bikeMap.on("zoomend", saveHashToElements);

        function setNewLocations(locationsArray) {
            // remove old markers
            currentMarkers.forEach(function (marker) {
                bikeMap.removeLayer(marker);
            });
            currentMarkers = [];

            // add new markers
            locationsArray.forEach(function (coordinate) {
                var marker = L.marker([coordinate.latitude, coordinate.longitude], { icon: bikeIcon }).addTo(bikeMap);
                currentMarkers.push(marker);
            });
        }

        function countMarkerInView() {
            var counter = 0;
            bikeMap.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    if (bikeMap.getBounds().contains(layer.getLatLng())) {
                        counter++;
                    }
                }
            });
            return counter;
        }

        var refreshLocationsFromServer = function () {
            fetch("https://api-cdn.criticalmaps.net/locations")
                .then(function (response) {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(function (data) {
                    var locationsArray = [];

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
                    console.error('Failed to fetch locations:', err);
                });
        };

        setInterval(function () { refreshLocationsFromServer() }, 60000);

        refreshLocationsFromServer();

        document.body.addEventListener('keypress', function (event) {
            var key = event.key || event.keyIdentifier || String.fromCharCode(event.charCode || event.keyCode || 0);
            if (key === 'h' || key === 'H') {
                setInterval(function () { refreshLocationsFromServer() }, 1000);
                alert("ab geht die post!");
            }
        });

        setInterval(function () {
            refreshLocationsFromServer();
            var nBikes = countMarkerInView();
            var el = document.getElementById("activeusers");
            if (el) el.innerHTML = nBikes;
        }, 60000);

    });
</script>
