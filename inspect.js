document.getElementById('getTags').onclick = async () => {
  const registry = document.getElementById('registry').value;
  const repository = document.getElementById('repository').value;

  // Loads leftmiddle panel, hides all other panels.
  loadPanel('leftmiddlepanel');
  hidePanels('middlepanel', 'rightmiddlepanel', 'errorpanel');
  clearTextarea();

  const containerRepository = new Container.Repository(registry, repository);
  const tags = await containerRepository.Tags;
  displayTags(containerRepository, tags);

  // Shows leftmiddle panel children.
  showPanel('leftmiddlepanel');
};

function displayTags(containerRepository, tags) {
  document.getElementById('tags').innerHTML = makeTagButtons(tags);
  registerTagButtons(containerRepository);
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
    tagButton.onclick = () => clickTagButton(containerRepository, tagButton);
  }
}
async function clickTagButton(containerRepository, tagButton) {
  const tag = tagButton.innerHTML;

  // Loads middle panel, hides all other panels.
  loadPanel('middlepanel');
  hidePanels('rightmiddlepanel', 'errorpanel');
  clearTextarea();

  try {
    const image = await containerRepository.Image(tag);

    registerManifestButton(await image.ManifestJSON);

    const config = await image.Config;
    document.getElementById('config').innerHTML = await config.digest;
    registerConfigButton(await config.JSON);

    const layerBlobs = await image.Layers;
    document.getElementById('layers').innerHTML = await makeLayerButtons(layerBlobs);
    await registerLayerButtons(layerBlobs);
  
    // Shows middle panel children.
    showPanel('middlepanel');

  } catch (err) {
    if (!(err instanceof Container.RegistryError)) return;
    hidePanels('middlepanel');
    showErrorPanel(err.error);
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

async function makeLayerButtons(layerBlobs) {
  let html = '';
  for (let layerBlob of layerBlobs) {
    html += '<button class="loadLayer">' + await layerBlob.digest + '</button>';
  }
  return html;
}
async function registerLayerButtons(layerBlobs) {
  const digestToBlob = {};
  for (let layerBlob of layerBlobs) {
    digestToBlob[await layerBlob.digest] = layerBlob;
  }

  const layerButtons = document.getElementsByClassName('loadLayer');
  for (let layerButton of layerButtons) {
    const layerDigest = layerButton.innerHTML;
    const layerBlob = digestToBlob[layerDigest];
    layerButton.onclick = () => clickLayerButton(layerBlob);
  }
}
async function clickLayerButton(layerBlob) {
  // Loads rightmiddle panel, hides right panel.
  loadPanel('rightmiddlepanel');
  hidePanels('errorpanel');

  const layerContent = await layerBlob.arrayBuffer;
  const unzipped = pako.ungzip(layerContent).buffer;
  const files = await untar(unzipped);
  try {
    document.getElementById('files').innerHTML = makeFileButtons(files);
    registerFileButtons(files);

    // Shows rightmiddle panel children.
    showPanel('rightmiddlepanel');

  } catch (err) {
    throw 'untar error: ' + err;
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
    const file = filenameToFile[filename];
    fileButton.onclick = () => clickFileButton(file);
  }
}
function clickFileButton(file) {
  document.getElementById('textname').innerHTML = file.name;
  const textarea = document.getElementById('text');
  textarea.value = file.readAsString();
}

// Panel utilities
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