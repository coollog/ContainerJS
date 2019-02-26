const Container = (function() {
  const exportedClasses = () => ({

    // A remote container image repository.
    // All methods return Promise.
    Repository: Repository,

    // A remote container image.
    // All methods return Promise.
    RemoteImage: RemoteImage,

    // A blob.
    // All methods return Promise.
    Blob: Blob,
  });

  class Repository {

    // Initialize with the registry host and repository.
    constructor(registry, repository) {
      this._containerRegistry = new _ContainerRegistry(registry, repository);
    }

    // Gets the all the tags in the repository.
    get Tags() {
      return this._containerRegistry.listTags();
    }

    Image(tag) {
      return Promise.resolve(new Container.RemoteImage(this._containerRegistry, tag));
    }
  };

  class RemoteImage {

    constructor(containerRegistry, tag) {
      this._containerRegistry = containerRegistry;
      this._tag = tag;

      this._manifestPromise = null;
    }

    // returns Promise(Container.Blob)
    get Config() {
      return this._manifest
        .then(manifest => new Container.Blob(this._containerRegistry, manifest.configDigest));
    }

    // returns Promise(JSON)
    get ManifestJSON() {
      return this._manifest.then(manifest => manifest.JSON);
    }

    // returns _Manifest
    get _manifest() {
      if (this._manifestPromise === null) {
        this._manifestPromise =
          this._containerRegistry
            .pullManifest(this._tag)
            .then(manifest => _Manifest.parse(manifest));
      }
      return this._manifestPromise;
    }
  }

  class Blob {

    constructor(containerRegistry, digest) {
      this._containerRegistry = containerRegistry;
      this._digest = digest;
    }
  }

  /**
   * Make calls to a Docker Registry V2 API.
   */
  class _ContainerRegistry {

    constructor(registry, repository) {
      this._registry = registry;
      this._repository = repository;
    }

    listTags() {
      const url = this._makeUrl('/tags/list');
      let request = _CrossOriginRequest.wrap(url);
      return request
        .setErrorHandler(401, this._make401Handler(request))
        .send()
        .then(response => response.json())
        .then(result => {
          console.log('result: ');
          console.log(result);
          return result.tags;
        });
    }

    pullManifest(tag) {
      const url = this._makeUrl('/manifests/' + tag);
      let request = _CrossOriginRequest.wrap(url);
      return request
        .appendHeader('Accept', 'application/vnd.docker.distribution.manifest.v2+json')
        .setErrorHandler(401, this._make401Handler(request))
        .send()
        .then(response => response.json());
    }

    _makeUrl(apiSuffix) {
      const apiPrefix = 'https://' + this._registry + '/v2/' + this._repository;
      return apiPrefix + apiSuffix;
    }

    // Handles 401 Unauthorized by fetching an auth token.
    _make401Handler(request) {
      return response => {
        const wwwAuthenticate = response.headers.get('WWW-Authenticate');
        return _TokenAuthenticator
          .fromWwwAuthenticate(wwwAuthenticate)
          .setRepository(this._repository)
          .fetchToken()
          .then(authorizationToken =>
            request
              .setAuthorizationToken(authorizationToken)
              .setErrorHandler(401, response => {
                throw 'authenticate failed even with auth token';
              })
              .send());
      };
    }
  };

  class _CrossOriginRequest {

    static wrap(url) {
      const _PROXY_PREFIX = 'https://cors-anywhere.herokuapp.com/';
      return new _CrossOriginRequest(_PROXY_PREFIX + url);
    }

    // private
    constructor(url) {
      this._request = new Request(url);
      this._headers = new Headers({
        Origin: '*'
      });

      this._errorHandlers = {};
    }

    setErrorHandler(statusCode, responseHandler) {
      this._errorHandlers[statusCode] = responseHandler;
      return this;
    }

    appendHeader(name, value) {
      this._headers.append(name, value);
      return this;
    }

    setAuthorizationToken(token) {
      this._headers.append('Authorization', 'Bearer ' + token);
      return this;
    }

    send() {
      return fetch(this._request, {
        headers: this._headers
      })
      .then(response => {
        if (response.status !== 200) {
          if (response.status in this._errorHandlers) {
            return this._errorHandlers[response.status](response);
          }
          throw 'Looks like there was a problem. Status Code: ' +
            response.status;
        }
        return response;
      });
    }
  }

  class _TokenAuthenticator {

    static fromWwwAuthenticate(wwwAuthenticate) {
      console.log('wwwAuthenticate: ' + wwwAuthenticate);

      const realm = wwwAuthenticate.match(/realm="(.*?)"/)[1];
      const service = wwwAuthenticate.match(/service="(.*?)"/)[1];

      return new _TokenAuthenticator(realm, service);
    }

    // private
    constructor(realm, service) {
      this._realm = realm;
      this._service = service;
      this._includePushScope = false;
    }

    setRepository(repository) {
      this._repository = repository;
      return this;
    }

    setPush() {
      this._includePushScope = true;
      return this;
    }
    unsetPush() {
      this._includePushScope = false;
      return this;
    }

    fetchToken() {
      return _CrossOriginRequest.wrap(this._makeUrl)
        .send()
        .then(response => {
          if (response.status !== 200) {
            throw 'request failed: ' + response.status;
          }
          return response.json();
        })
        .then(authResponse => authResponse.token);
    }

    get _makeUrl() {
      if (this._repository === undefined) {
        throw 'repository undefined';
      }

      const permissions = 'pull' + (this._includePushScope ? ',push' : '');
      return this._realm +
          '?service=' + this._service +
          '&scope=repository:' + this._repository + ':' + permissions;
    }
  }

  class _Manifest {

    static parse(manifestJson) {
      console.log('Parsing manifest:');
      console.log(manifestJson);
      if (manifestJson.schemaVersion !== 2) {
        throw 'schemaVersion invalid: ' + manifestJson.schemaVersion;
      }

      return new _Manifest(manifestJson, manifestJson.config, manifestJson.layers);
    }

    // private
    constructor(manifestJson, config, layers) {
      this._manifestJson = manifestJson;
      this._config = config;
      this._layers = layers;
    }

    get JSON() {
      return this._manifestJson;
    }

    get config() {
      return this._config;
    }

    get configDigest() {
      return this._config.digest;
    }

    get layers() {
      return this._layers;
    }
  }

  return exportedClasses();
})();