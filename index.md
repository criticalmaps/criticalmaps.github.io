---
layout: default
title: "Critical Maps"
pathName: rootPath
---

<div class="wrapper stage">
  <div class="inner">
      <div class="stage--content content">
        <h1 class="stage--title">Navigating crowds in urban spaces</h1>
        <p class="stage--description">Critical Maps helps organising people world wide to coordinate direct action like the <a href="https://en.wikipedia.org/wiki/Critical_Mass_(cycling)" target="_blank" rel="noopener" title="Critical Mass Wikipedia article">Critical Mass</a> cycling movement.</p>
        <p class="stage--download">
          <a class="stage--button button" href="https://itunes.apple.com/app/critical-maps/id918669647" target="_blank" rel="noopener">
            <span class="button-icon download-icon" aria-hidden="true">{% include icon-appstore.svg %}</span>
            <span class="download-text">
              <span class="download-text--tagline button-tagline">Download on the</span>
              <span class="download-text--title button-title">App Store</span>
            </span>
          </a>
          <a class="stage--button button"
            href="https://play.google.com/store/apps/details?id=de.stephanlindauer.criticalmaps" target="_blank" rel="noopener">
            <span class="button-icon" aria-hidden="true">{% include icon-googleplay.svg %}</span>
            <span class="download-text button-text">
              <span class="download-text--tagline button-tagline">Get it on</span>
              <span class="download-text--title button-title">Google Play</span>
            </span>
          </a>
          <a class="stage--button button"
            href="https://f-droid.org/en/packages/de.stephanlindauer.criticalmaps" target="_blank" rel="noopener">
            <span class="button-icon" aria-hidden="true">{% include icon-fdroid.svg %}</span>
            <span class="download-text button-text">
              <span class="download-text--tagline button-tagline">Get it on</span>
              <span class="download-text--title button-title">F-Droid</span>
            </span>
          </a>
        </p>
      </div>
  </div>
</div>

<div class="wrapper map">
  <div class="inner">
    <div id="map-wrapper" class="map-wrapper">
      <div id="map" class="map-container" tabindex="0" aria-labelledby="map-title" aria-describedby="map-desc" data-fullscreen="true">
        <div id="map-count" class="map-count">
          <span class="map-count-online" role="status" aria-live="polite" aria-atomic="true">Online: <span id="totalusers" class="map-count-number" aria-live="polite" aria-atomic="true" aria-label="Total online users">0</span></span>
          <span class="map-count-visible" aria-live="polite" aria-atomic="true" aria-label="Visible users in viewport">Visible: <span id="activeusers" class="map-count-number">0</span></span>
        </div>
        <h2 id="map-title" class="sr-only">Live map of users</h2>
        <p id="map-desc" class="sr-only">Interactive map showing current online users. Use keyboard arrow keys to pan and plus/minus to zoom. Map updates periodically.</p>
      </div>
    </div>
  </div>
</div>

<div class="wrapper contribute">
  <div class="inner">
    <div class="contribute--decoration">{% include icon-octocat.svg %}</div>
    <div class="contribute--introduction content">
      <p><strong>Critical Maps</strong> is built by a dedicated <a class="contribute--button button" href="https://github.com/orgs/criticalmaps/people" target="_blank" rel="noopener">
        <span aria-hidden="true">{% include icon-team.svg %}</span>
        <span class="contribute--button-title button-title">Team</span>
      </a> of a passionate <em>open source</em> community. We are always looking for new contributors. Explore the <a class="contribute--button button" href="https://github.com/criticalmaps/criticalmaps-ios" target="_blank" rel="noopener">
        <span aria-hidden="true">{% include icon-xcode.svg %}</span>
        <span class="contribute--button-title button-title">iOS</span>
      </a> or <a class="contribute--button button" href="https://github.com/criticalmaps/criticalmaps-android" target="_blank" rel="noopener">
        <span aria-hidden="true">{% include icon-androidstudio.svg %}</span>
        <span class="contribute--button-title button-title">Android</span>
      </a> projects on <a class="contribute--button button" href="https://github.com/criticalmaps/" target="_blank" rel="noopener">
        <span aria-hidden="true">{% include icon-github.svg %}</span>
        <span class="contribute--button-title button-title">GitHub</span>
      </a> and get involved.</p>
    </div>
  </div>
</div>

<div class="wrapper support">
  <div class="inner">
    <div class="support-wrapper">
      <div class="support-box support-box--introduction">
        <div class="support-box--label">
          <span aria-hidden="true">{% include icon-heart.svg %}</span>
          <span>Thank you</span>
        </div>
        <div class="support-box--value">
          <p>Critical Maps exists because <strong>people like you</strong> support it.</p>
          <p>If you find the app useful and want it to remain available, you can help cover costs for infrastructure.</p>
        </div>
      </div>
      <div class="support-box support-box--statistics">
        <div class="support-box--label">
          <span aria-hidden="true">{% include icon-infrastructure.svg %}</span>
          <span>Infrastructure</span>
        </div>
        <div class="support-box--value">
          <p>Our monthly server costs range from <strong>20</strong> to <strong>60 Euro</strong>, depending on traffic.</p>
        </div>
        <video class="support-box--background" preload="true" autoplay loop muted aria-hidden="true">
          <source src="assets/images/support-statistics-background.mp4" type="video/mp4" />
          <source src="assets/images/support-statistics-background.webm" type="video/webm" />
        </video>
      </div>
      <div class="support-box support-box--decoration"></div>
      <div class="support-box support-box--collective">
        <div class="support-box--label">
          <span aria-hidden="true">{% include icon-opencollective.svg %}</span>
          <span>Open Collective</span>
        </div>
        <div class="support-box--value">
          <p>Contributions of any size make a difference, whether one-time or ongoing. All donations and expenses are published transparently on Open Collective.</p>
          <p><a class="button" href="https://opencollective.com/criticalmaps" target="_blank"><span class="button-title">Support now</span></a></p>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="/assets/js/application.js" type="text/javascript"></script>
<script src="/assets/js/leaflet-hash.js" type="text/javascript"></script>