document.getElementById('getTags').onclick = () => {
  const registry = document.getElementById('registry').value;
  const repository = document.getElementById('repository').value;

  // Loads leftmiddle panel, hides all other panels.
  loadPanel('leftmiddlepanel');
  hidePanels('middlepanel', 'rightmiddlepanel', 'errorpanel');
  clearTextarea();

  const containerRepository = new Container.Repository(registry, repository);
  containerRepository
    .Tags
    .then(tags => displayTags(containerRepository, tags));
};

function displayTags(containerRepository, tags) {
  document.getElementById('tags').innerHTML = makeTagButtons(tags);
  registerTagButtons(containerRepository);

  // Shows leftmiddle panel children.
  showPanel('leftmiddlepanel');
}

function makeTagButtons(tags) {
  let html = '';
  for (let tag of tags) {
    html += '<button class="loadTag">' + tag + '</button>';
  }
  return html;
}
function registerTagButtons(containerRepository) {
  const tagButtons = document.getElementsByClassName('loadTag');
  for (let tagButton of tagButtons) {
    tagButton.onclick = () => {
      const tag = tagButton.innerHTML;

      // Loads middle panel, hides all other panels.
      loadPanel('middlepanel');
      hidePanels('rightmiddlepanel', 'errorpanel');
      clearTextarea();

      const image = containerRepository.Image(tag);

      const manifestPromise =
        image
          .then(image => image.ManifestJSON)
          .then(manifestJson => registerManifestButton(manifestJson));
      const configPromise = image.then(image => image.Config);
      const configButtonPromise1 = 
        configPromise
          .then(blob => blob.digest)
          .then(configDigest => {
            document.getElementById('config').innerHTML = configDigest;
          });
      const configButtonPromise2 = 
        configPromise
          .then(blob => blob.JSON)
          .then(configJson => registerConfigButton(configJson));
      const layersPromise =
        image
          .then(image => image.Layers)
          .then(layerBlobs => {
            document.getElementById('layers').innerHTML = makeLayerButtons(layerBlobs);
            registerLayerButtons(layerBlobs);
          });

      Promise
        .all([
          manifestPromise, 
          configButtonPromise1, 
          configButtonPromise2, 
          layersPromise])
        .then(promises => {
          // Shows middle panel children.
          showPanel('middlepanel');
        })
        .catch(err => {
          if (!(err instanceof Container.RegistryError)) return;
          const panel = document.getElementById('middlepanel');
          panel.style.marginLeft = '-20%';
          showErrorPanel(err.error);
        });
    };
  }
}

// TODO: Consolidate into a textarea display function.
function registerManifestButton(manifestJson) {
  const manifestButton = document.getElementById('manifest');
  manifestButton.onclick = () => {
    document.getElementById('textname').innerHTML = 'MANIFEST';
    const textarea = document.getElementById('text');
    textarea.value = JSON.stringify(manifestJson, null, 2);
    event.stopPropagation();
  };
}
function registerConfigButton(configJson) {
  const configButton = document.getElementById('config');
  configButton.onclick = () => {
    document.getElementById('textname').innerHTML = 'CONFIG';
    const textarea = document.getElementById('text');
    textarea.value = JSON.stringify(configJson, null, 2);
    event.stopPropagation();
  };
}

function makeLayerButtons(layerBlobs) {
  let html = '';
  for (let layerBlob of layerBlobs) {
    html += '<button class="loadLayer">' + layerBlob.digest + '</button>';
  }
  return html;
}
function registerLayerButtons(layerBlobs) {
  const digestToBlob = {};
  for (let layerBlob of layerBlobs) {
    digestToBlob[layerBlob.digest] = layerBlob;
  }

  const layerButtons = document.getElementsByClassName('loadLayer');
  for (let layerButton of layerButtons) {
    const layerDigest = layerButton.innerHTML;

    layerButton.onclick = async () => {
      // Loads rightmiddle panel, hides right panel.
      loadPanel('rightmiddlepanel');
      hidePanels('errorpanel');

      const layerBlob = digestToBlob[layerDigest];
      const layerContent = await layerBlob.arrayBuffer;
      const unzipped = pako.ungzip(layerContent).buffer;
      untar(unzipped).then(
        files => {
          document.getElementById('files').innerHTML = makeFileButtons(files);
          registerFileButtons(files);

          // Shows rightmiddle panel children.
          showPanel('rightmiddlepanel');
        },
        err => {
          throw 'untar error: ' + err
        }
      );
    };
  }
}

function makeFileButtons(files) {
  let html = '';
  for (let file of files) {
    html += '<button class="showFile">' + file.name + '</button>';
  }
  return html;
}
function registerFileButtons(files) {
  const filenameToFile = {};
  for (let file of files) {
    filenameToFile[file.name] = file;
  }

  const fileButtons = document.getElementsByClassName('showFile');
  for (let fileButton of fileButtons) {
    const filename = fileButton.innerHTML;
    fileButton.onclick = () => {
      document.getElementById('textname').innerHTML = filename;
      const file = filenameToFile[filename];
      const textarea = document.getElementById('text');
      textarea.value = file.readAsString();
    };
  }
}

function loadPanel(panelId) {
  const panel = document.getElementById(panelId);
  panel.style.marginLeft = 0;
  panel.children[0].classList.add('loading');
}
function showPanel(panelId) {
  const panel = document.getElementById(panelId);
  panel.children[0].classList.remove('loading');
}
function hidePanels(...panelIds) {
  const panelsToHide = panelIds.map(panelId => document.getElementById(panelId));
  panelsToHide.forEach(panel => panel.style.marginLeft = '-20%');
}
function showErrorPanel(errorMessage) {
  const panel = document.getElementById('errorpanel');
  panel.style.marginLeft = 0;
  const errorLabel = document.getElementById('error');
  errorLabel.innerHTML = errorMessage;
}
function clearTextarea() {
  document.getElementById('textname').innerHTML = '';
  const textarea = document.getElementById('text');
  textarea.value = '';
}