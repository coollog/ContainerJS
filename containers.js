/**
 * Make calls to a Docker Registry V2 API.
 */
class ContainerRegistry {

  constructor(registry, repository) {
    this._registry = registry;
    this._repository = repository;
  }

  listTags() {
    const url = 'https://' + this._registry + '/v2/' + this._repository + '/tags/list';
    let request = _CrossOriginRequest.wrap(url);
    return request
      .setErrorHandler(401, response => {
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
      })
      .send()
      .then(response => response.json())
      .then(result => {
        console.log('result: ');
        console.log(result);
        return result.tags;
      });
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


