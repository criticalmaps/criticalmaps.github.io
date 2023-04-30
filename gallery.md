---
layout: default
title: "Critical Maps- Gallery"
pathName: galleryPath
---


<div id="gallerymap"></div>

<script type="text/javascript">
    $().ready(function () {
        var cameraIcon = L.icon({
            iconUrl: '/assets/images/marker-photo.png',
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });

        var cameraMap = new L.map('gallerymap', { zoomControl: false }).setView([52.468209, 13.425995], 3);

        L.mapboxGL({
            attribution: '<a href="https://www.maptiler.com/copyright/">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap contributors</a>',
            style: 'https://api.maptiler.com/maps/basic/style.json?key=BF1ZtxvN8zHG9Wc6omQn'
        }).addTo(cameraMap);

        new L.Control.Zoom({ position: 'bottomleft' }).addTo(cameraMap);
        var hash = new L.Hash(cameraMap);

        function saveHashToElements() {
            if (hash.lastHash) {
                $(".hash-append").each(function (index) {
                    $(this).attr("href", $(this).data("template").replace('${hash}', hash.lastHash));
                });
            }
        }
        cameraMap.on("moveend", function () {
            saveHashToElements()
        }, this);
        cameraMap.on("zoomend", function () {
            saveHashToElements()
        }, this);


        $.get("https://api.criticalmaps.net/gallery/",
            function (response) {
                for (var i = 0; i < response.length; i++) {
                    var currentImageObject = response[i]

                    L.marker([
                        criticalMapsUtils.convertCoordinateFormat(currentImageObject.latitude),
                        criticalMapsUtils.convertCoordinateFormat(currentImageObject.longitude)],
                        { icon: cameraIcon }
                    )
                        .addTo(cameraMap)
                        .bindPopup(
                            '<a class="popuplink" target="_blank" href="https://api.criticalmaps.net/gallery/image/' + currentImageObject.id + '">' +
                            '<img class="popupimage" src="https://api.criticalmaps.net/gallery/thumbnail/' + currentImageObject.id + '">' +
                            '</a>');
                }
            }
        );
    });
</script>
