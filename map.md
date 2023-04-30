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
    $().ready(function () {
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
                $(".hash-append").each(function (index) {
                    $(this).attr("href", $(this).data("template").replace('${hash}', hash.lastHash));
                });
            }
        }
        bikeMap.on("moveend", function () {
            saveHashToElements()
        }, this);
        bikeMap.on("zoomend", function () {
            saveHashToElements()
        }, this);

        function setNewLocations(locationsArray) {
            //remove old markers
            currentMarkers.forEach(function (marker) {
                bikeMap.removeLayer(marker)
            });
            currentMarkers = []

            //add new markes
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
        };

        var refreshLocationsFromServer = function () {
            $.getJSON("https://api.criticalmaps.net/postv2", function (data) {

                locationsArray = [];

                var locations = data.locations;

                for (var key in locations) {
                    if (locations.hasOwnProperty(key)) {
                        var currentLocation = locations[key];
                        var coordinate = {
                            latitude: criticalMapsUtils.convertCoordinateFormat(currentLocation.latitude),
                            longitude: criticalMapsUtils.convertCoordinateFormat(currentLocation.longitude)
                        }
                        locationsArray.push(coordinate);
                    }
                }

                setNewLocations(locationsArray);
            });
        }
        setInterval(function () { refreshLocationsFromServer() }, 20000);

        refreshLocationsFromServer();

        $("body").keypress(function (event) {
            if (event.which == 104) {
                setInterval(function () { refreshLocationsFromServer() }, 1000);
                alert("ab geht die post!");
            }
        });

        setInterval(function () {
            refreshLocationsFromServer();
            var nBikes = countMarkerInView();
            document.getElementById("activeusers").innerHTML = nBikes;
        }, 2000);

    });
</script>
