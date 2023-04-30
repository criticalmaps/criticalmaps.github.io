# criticalmaps-web

 Website repository for [criticalmaps.net](https://www.criticalmaps.net/)

## Quick and easy local development
```
docker run --rm \
  --volume="$PWD:/srv/jekyll:Z" \
  --publish '[::1]:4000:4000' \
  jekyll/jekyll:4.2.0 \
  jekyll serve
```
