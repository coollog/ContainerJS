console.log('loaded');

function makeCorsUrl(url) {
  const corsProxy = 'https://cors-anywhere.herokuapp.com/';
  return corsProxy + url;
}

function getAuthToken(wwwAuthenticate, repository, permissions) {
  console.log('wwwAuthenticate: ' + wwwAuthenticate);

  const realm = wwwAuthenticate.match(/realm="(.*?)"/)[1];
  const service = wwwAuthenticate.match(/service="(.*?)"/)[1];

  const url = makeCorsUrl(realm + '?service=' + service + '&scope=repository:' + repository + ':' + permissions);
  return fetch(url, {
    headers: {
      Origin: '*'
    }
  })
  .then((response) => {
    if (response.status !== 200) {
      throw 'request failed: ' + response.status;
    }
    return response.json();
  })
  .then((authResponse) => {
    return authResponse.token;
  });
}

function containerPullManifest(registry, repository, tag, authToken) {
  let headers = {
    Origin: '*',
    Accept: 'application/vnd.docker.distribution.manifest.v2+json'
  };
  if (typeof authToken !== 'undefined') {
    headers.Authorization = 'Bearer ' + authToken;
    console.log('Using authToken=' + authToken);
  }

  return fetch(makeCorsUrl('https://' + registry + '/v2/' + repository + '/manifests/' + tag), {
    headers: headers
  })
  .then(
    (response) => {
      if (response.status !== 200) {
        console.log(response);
        if (response.status === 401) {
          if (typeof authToken !== 'undefined') {
            throw 'authenticate failed even with auth token';
          }

          const wwwAuthenticate = response.headers.get('WWW-Authenticate');
          return getAuthToken(wwwAuthenticate, repository, 'pull').then(
            (authToken) => containerPullManifest(registry, repository, tag, authToken));
        }
        throw 'Looks like there was a problem. Status Code: ' +
          response.status;
      }

      return response.json();
    }
  )
}

function listAllDockerHubImages() {
  fetch(makeCorsUrl('https://hub.docker.com/api/content/v1/products/search?page=103&page_size=25&q=&type=image'), {
    headers: {
      Origin: '*',
      Search-Version: 'v3'
    }
  })
  .then((response) => {
    console.log(response.json());
  });
}

listAllDockerHubImages();

// containerPullManifest('registry.hub.docker.com', 'library/busybox', 'latest')
//   .catch(function(err) {
//     console.log('Fetch Error :-S', err);
//   })
//   .then((response) => {
//     console.log('final response: ');
//     console.log(response);
//   });