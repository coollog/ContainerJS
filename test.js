console.log('loaded');

const statusDiv = document.getElementById('status');
function setStatus(status) {
  statusDiv.innerHTML = status;
}
const resultDiv = document.getElementById('result');
function setResult(result) {
  resultDiv.value = result;
}

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

let imageSet = {};

function listAllDockerHubImages() {
  let totalReceived = 0;

  const pageSize = 10000;
  const pageCount = 100;

  function search(page, pageSize, extraParams = '') {
    const url = 'https://hub.docker.com/api/content/v1/products/search?page=' + page + '&page_size=' + pageSize + '&q=&type=image' + extraParams;

    function doFetch() {
      return fetch(makeCorsUrl(url), {
          headers: {
            Origin: '*',
            'Search-Version': 'v3'
          }
        })
        .then(response => {
          if (response.status !== 200) {
            return doFetch();
          }
          return response.json();
        })
        .catch(err => {
          return doFetch();
        });
    }

    return doFetch()
      .then(result => {
        let images = {};
        result.summaries.map(summary => {
          images[summary.slug] = true;
        });
        return images;
      })
      .then(images => {
        imageSet = {...imageSet, ...images};
        totalReceived += Object.keys(images).length;
        setStatus('Total images received: ' + totalReceived + '/' + pageSize * pageCount * 2);
      });
  }

  function doSearch(page, extraParams) {
    if (page > pageCount) return Promise.resolve();
    return search(page, pageSize, extraParams).then(() => doSearch(page + 1));
  }
  return doSearch(1).then(() => doSearch(1, '&sort=updated_at&order=desc')).then(() => Object.keys(imageSet));
}

listAllDockerHubImages()
  .then(images => {
    console.log("done");
    console.log(images);
    setResult(JSON.stringify(images));
  });

// containerPullManifest('registry.hub.docker.com', 'library/busybox', 'latest')
//   .catch(function(err) {
//     console.log('Fetch Error :-S', err);
//   })
//   .then((response) => {
//     console.log('final response: ');
//     console.log(response);
//   });