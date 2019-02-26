https://raw.githack.com/coollog/ContainerJS/master/inspect.html

```javascript
// Opens Docker Hub `busybox` repository.
const busybox = new Container.Repository('registry.hub.docker.com', 'library/busybox');

// Gets the tags for `busybox`.
const tags = await busybox.Tags;

// Gets the image `busybox:latest`.
const image = busybox.Image('latest');

// Gets the manifest JSON for `busybox:latest`.
const manifestJSON = await image.ManifestJSON;

// Gets the config digest and JSON.
const config = await image.Config;
const configDigest = config.digest;
const configJSON = await config.JSON;

// Gets the layer tar.gz.
const layers = await image.Layers;
const layerDigest = layers[0].digest;
const layerArrayBuffer = await layers[0].arrayBuffer;
```