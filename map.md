---
layout: default
title: "Critical Maps - Map"
pathName: mapPath
---

<div id="map-count">
    <span class="map-count-online" role="status" aria-live="polite" aria-atomic="true">Online: <span id="totalusers" class="map-count-number" aria-live="polite" aria-atomic="true" aria-label="Total online users">0</span></span>
    <span class="map-count-visible" aria-live="polite" aria-atomic="true" aria-label="Visible users in viewport">Visible: <span id="activeusers" class="map-count-number">0</span></span>
</div>
<div id="map" tabindex="0" aria-labelledby="map-title" aria-describedby="map-desc">
    <h2 id="map-title" class="sr-only">Live map of users</h2>
    <p id="map-desc" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;">Interactive map showing current online users. Use keyboard arrow keys to pan and plus/minus to zoom. Map updates periodically.</p>
</div>

<script src="/assets/js/application.js" type="text/javascript"></script>
<script src="/assets/js/leaflet-hash.js" type="text/javascript"></script>