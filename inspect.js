(() => {
  const DOM = new class {

    get getTags() {
      return document.getElementById('getTags');
    }
    get registry() {
      return document.getElementById('registry');
    }
    get repository() {
      return document.getElementById('repository');
    }
    get username() {
      return document.getElementById('username');
    }
    get password() {
      return document.getElementById('password');
    }
    get tags() {
      return document.getElementById('tags');
    }
    get tagButtons() {
      return document.getElementsByClassName('loadTag');
    }
    get config() {
      return document.getElementById('config');
    }
    get layers() {
      return document.getElementById('layers');
    }
    get textname() {
      return document.getElementById('textname');
    }
    get text() {
      return document.getElementById('text');
    }
    get manifestButton() {
      return document.getElementById('manifest');
    }
    get configButton() {
      return document.getElementById('config');
    }
    get layerButtons() {
      return document.getElementsByClassName('loadLayer');
    }
    get fileButtons() {
      return document.getElementsByClassName('showFile');
    }
    get files() {
      return document.getElementById('files');
    }
    get panel() {
      return panelId => document.getElementById(panelId);
    }
    get errorPanel() {
      return document.getElementById('errorpanel');
    }
    get errorLabel() {
      return document.getElementById('error');
    }
  };
  
  if (localStorage.registry) DOM.registry.value = localStorage.registry;
  if (localStorage.repository) DOM.repository.value = localStorage.repository;
  if (localStorage.username) DOM.username.value = localStorage.username;
  if (localStorage.password) DOM.password.value = localStorage.password;

  DOM.getTags.onclick = async () => {
    const registry = DOM.registry.value;
    const repository = DOM.repository.value;
    const username = DOM.username.value;
    const password = DOM.password.value;
    localStorage.registry = registry;
    localStorage.repository = repository;
    localStorage.username = username;
    localStorage.password = password;
  
    // Loads leftmiddle panel, hides all other panels.
    loadPanel('leftmiddlepanel');
    hidePanels('middlepanel', 'rightmiddlepanel', 'errorpanel');
    clearTextarea();
  
    const containerRepository = new Container.Repository(registry, repository);

    if (username.length > 0) {
      containerRepository.setCredentials(username, password);
    }

    try {
      const tags = await containerRepository.Tags;
      displayTags(containerRepository, tags);
    
      // Shows leftmiddle panel children.
      showPanel('leftmiddlepanel');

    } catch (err) {
      if (!(err instanceof Container.RegistryError)) return;
      hidePanels('leftmiddlepanel');
      showErrorPanel(err.error);
    }
  };
  
  function displayTags(containerRepository, tags) {
    DOM.tags.innerHTML = makeTagButtons(tags);
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
    for (let tagButton of DOM.tagButtons) {
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
      DOM.config.innerHTML = await config.digest;
      registerConfigButton(await config.JSON);
  
      const layerBlobs = await image.Layers;
      DOM.layers.innerHTML = await makeLayerButtons(layerBlobs);
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
    DOM.manifestButton.onclick = () => {
      DOM.textname.innerHTML = 'MANIFEST';
      DOM.text.value = JSON.stringify(manifestJson, null, 2);
      event.stopPropagation();
    };
  }
  function registerConfigButton(configJson) {
    DOM.configButton.onclick = () => {
      DOM.textname.innerHTML = 'CONFIG';
      DOM.text.value = JSON.stringify(configJson, null, 2);
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
  
    for (let layerButton of DOM.layerButtons) {
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
      DOM.files.innerHTML = makeFileButtons(files);
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
  
    for (let fileButton of DOM.fileButtons) {
      const filename = fileButton.innerHTML;
      const file = filenameToFile[filename];
      fileButton.onclick = () => clickFileButton(file);
    }
  }
  function clickFileButton(file) {
    DOM.textname.innerHTML = file.name;
    DOM.text.value = file.readAsString();
  }
  
  // Panel utilities
  function loadPanel(panelId) {
    const panel = DOM.panel(panelId);
    panel.style.marginLeft = 0;
    panel.children[0].classList.add('loading');
  }
  function showPanel(panelId) {
    const panel = DOM.panel(panelId);
    panel.children[0].classList.remove('loading');
  }
  function hidePanels(...panelIds) {
    const panelsToHide = panelIds.map(panelId => DOM.panel(panelId));
    panelsToHide.forEach(panel => panel.style.marginLeft = '-20%');
  }
  function showErrorPanel(errorMessage) {
    DOM.errorPanel.style.marginLeft = 0;
    DOM.errorLabel.innerHTML = errorMessage;
  }
  function clearTextarea() {
    DOM.textname.innerHTML = '';
    DOM.text.value = '';
  }
})();