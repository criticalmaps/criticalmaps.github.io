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
          <a class="stage--button button-ios button" href="https://itunes.apple.com/app/critical-maps/id918669647" target="_blank" rel="noopener">
            {% include icon-appstore.svg %}
            <span class="download-text button-text">
              <span class="download-text--tagline button-tagline">Download on the</span>
              <span class="download-text--title button-title">App Store</span>
            </span>
          </a>
          <a class="stage--button button-android button"
            href="https://play.google.com/store/apps/details?id=de.stephanlindauer.criticalmaps" target="_blank" rel="noopener">
            {% include icon-googleplay.svg %}
            <span class="download-text button-text">
              <span class="download-text--tagline button-tagline">Get it on</span>
              <span class="download-text--title button-title">Google Play</span>
            </span>
          </a>
          <a class="stage--button button-fdroid button"
            href="https://f-droid.org/en/packages/de.stephanlindauer.criticalmaps" target="_blank" rel="noopener">
            {% include icon-fdroid.svg %}
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
      <div class="map-wrapper">
          <div id="map-count">
            <span class="map-count-online">Online: <span id="totalusers" class="map-count-number">0</span></span>
            <span class="map-count-visible">Visible: <span id="activeusers" class="map-count-number">0</span></span>
        </div>
        <div id="map"></div>
      </div>
  </div>
</div>

<div class="wrapper contribute">
  <div class="inner">
    <div class="contribute--decoration">{% include icon-octocat.svg %}</div>
    <div class="contribute--introduction content">
      <p><strong>Critical Maps</strong> is built by a dedicated <a class="contribute--button button" href="https://github.com/orgs/criticalmaps/people" target="_blank" rel="noopener">
        {% include icon-team.svg %}
        <span class="contribute--button-title button-title">Team</span>
      </a> of a passionate <em>open source</em> community. We are always looking for new contributors. Explore the <a class="contribute--button button" href="https://github.com/criticalmaps/criticalmaps-ios" target="_blank" rel="noopener">
        {% include icon-xcode.svg %}
        <span class="contribute--button-title button-title">iOS</span>
      </a> or <a class="contribute--button button" href="https://github.com/criticalmaps/criticalmaps-android" target="_blank" rel="noopener">
        {% include icon-androidstudio.svg %}
        <span class="contribute--button-title button-title">Android</span>
      </a> projects on <a class="contribute--button button" href="https://github.com/criticalmaps/" target="_blank" rel="noopener">
        {% include icon-github.svg %}
        <span class="contribute--button-title button-title">GitHub</span>
      </a> and get involved.</p>
    </div>
  </div>
</div>

<div class="wrapper donate">
  <div class="inner">
    <div class="donate-wrapper">
      <div class="donate--box donate--introduction">
        <p>Critical Maps exists because <strong>people like you</strong> support it.</p>
        <p>If you find the app useful and want it to remain available, you can help cover costs for infrastructure.</p>
      </div>
      <div class="donate--box donate--statistics">
        <span class="donate--statistics-label">
          {% include icon-expenses.svg %}
          <span>Expenses</span>
        </span>
        <span class="donate--statistics-value">Monthly server costs range from <strong>20 to 60 Euro</strong>, depending on traffic.</span>
      </div>
      <div class="donate--box donate--decoration"></div>
      <div class="donate--box donate--action">
        <p>Contributions of any size make a difference, whether one-time or ongoing. All donations and expenses are published transparently on Open Collective.</p>
        <p><a class="donate--button button" href="https://opencollective.com/criticalmaps" target="_blank"><span class="donate--button-title button-title">Support now</span></a></p>
      </div>
    </div>
  </div>
</div>