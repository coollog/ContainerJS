fetch('https://registry.hub.docker.com/v2/')
  .then(
    (response) => {
      if (response.status !== 200) {
        console.log(response);
        if (response.status === 401) {
          const wwwAuthenticate = response.headers.get('WWW-Authenticate');
          console.log(wwwAuthenticate);
          return;
        }
        console.log('Looks like there was a problem. Status Code: ' +
          response.status);
        return;
      }

      // Examine the text in the response
      response.json().then((data) => {
        console.log(data);
      });
    }
  )
  .catch(function(err) {
    console.log('Fetch Error :-S', err);
  });