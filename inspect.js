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
      return Array.from(document.getElementsByClassName('loadTag'));
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
      return Array.from(document.getElementsByClassName('loadLayer'));
    }
    get fileButtons() {
      return Array.from(document.getElementsByClassName('showFile'));
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

  class _Panel {

    static named(panelName) {
      return new _Panel(document.querySelector('panel[name='+panelName+']'));
    }

    // private
    constructor(panelElement) {
      this._panelElement = panelElement;
      this._panelsToHide = [];
      this._clearsTextarea = false;
    }

    get panelElement() {
      return this._panelElement;
    }

    set hidesPanel(panel) {
      this._panelsToHide.push(panel);
      return this;
    }

    set clearsTextArea(bool) {
      this._clearsTextarea = bool;
    }

    set errorPanel(errorPanel) {
      this._errorPanel = errorPanel;
    }

    async load(callDuringLoad) {
      this._loadPanel();
      this._hidePanels(...this._panelsToHide);
      if (this._clearsTextarea) clearTextarea();

      try {
        await callDuringLoad();
        this._showPanel();

      } catch (err) {
        this._handleError(err);
      }
    }

    _loadPanel() {
      this._panelElement.style.marginLeft = 0;
      this._panelElement.children[0].classList.add('loading');
    }

    _hidePanels(...panels) {
      panels.forEach(panel => panel._hide());
    }

    _hide() {
      this._panelElement.style.marginLeft = '-20%';
    }

    _showPanel() {
      this._panelElement.children[0].classList.remove('loading');
    }

    _handleError(error) {
      if (this._errorPanel === undefined || !(error instanceof Container.RegistryError)) {
        throw error;
      }

      this._hidePanels(this);
      this._errorPanel.panelElement.style.marginLeft = 0;
      DOM.errorLabel.innerHTML = error.error;
    }
  }

  const Panels = new class {

    constructor() {
      this._leftMiddle = _Panel.named('leftmiddle');
      this._middle = _Panel.named('middle');
      this._rightMiddle = _Panel.named('rightmiddle');
      this._right = _Panel.named('right');
      this._error = _Panel.named('error');

      this._leftMiddle.hidesPanel = this._middle;
      this._leftMiddle.hidesPanel = this._rightMiddle;
      this._leftMiddle.hidesPanel = this._error;
      this._leftMiddle.errorPanel = this._error;
      this._leftMiddle.clearsTextArea = true;

      this._middle.hidesPanel = this._rightMiddle;
      this._middle.hidesPanel = this._error;
      this._middle.errorPanel = this._error;
      this._middle.clearsTextArea = true;
    }

    get leftMiddle() {
      return this._leftMiddle;
    }

    get middle() {
      return this._middle;
    }

    get rightMiddle() {
      return this._rightMiddle;
    }

    get right() {
      return this._right;
    }

    get error() {
      return this._error;
    }
  };

  DOM.getTags.onclick = async () => {
    const registry = DOM.registry.value;
    const repository = DOM.repository.value;
    const username = DOM.username.value;
    const password = DOM.password.value;
    localStorage.registry = registry;
    localStorage.repository = repository;
    localStorage.username = username;
    localStorage.password = password;

    Panels.leftMiddle.load(async () => {
      const containerRepository = new Container.Repository(registry, repository);

      if (username.length > 0) {
        containerRepository.setCredentials(username, password);
      }

      const tags = await containerRepository.Tags;
      displayTags(containerRepository, tags);
    });
  };
  
  function displayTags(containerRepository, tags) {
    DOM.tags.innerHTML = makeTagButtons(tags);
    registerTagButtons(containerRepository);
  }
  function makeTagButtons(tags) {
    return tags.map(tag => '<button class="loadTag">' + tag + '</button>').join('');
  }
  function registerTagButtons(containerRepository) {
    DOM.tagButtons.forEach(tagButton => {
      tagButton.onclick = () => {
        clickTagButton(containerRepository, tagButton);
      }
    });
  }
  async function clickTagButton(containerRepository, tagButton) {
    const tag = tagButton.innerHTML;

    Panels.middle.load(async () => {
      const image = await containerRepository.Image(tag);
  
      registerManifestButton(await image.ManifestJSON);
  
      const config = await image.Config;
      DOM.config.innerHTML = await config.digest;
      registerConfigButton(await config.JSON);
  
      const layerBlobs = await image.Layers;
      DOM.layers.innerHTML = await makeLayerButtons(layerBlobs);
      await registerLayerButtons(layerBlobs);
    });
  }
  
  // TODO: Consolidate into a textarea display function.
  function registerManifestButton(manifestJson) {
    DOM.manifestButton.onclick = () => {
      displayText('MANIFEST', JSON.stringify(manifestJson, null, 2));
      event.stopPropagation();
    };
  }
  function registerConfigButton(configJson) {
    DOM.configButton.onclick = () => {
      displayText('CONFIG', JSON.stringify(configJson, null, 2));
      event.stopPropagation();
    };
  }
  
  async function makeLayerButtons(layerBlobs) {
    return (await Promise.all(
      layerBlobs.map(async layerBlob => '<button class="loadLayer">' + (await layerBlob.digest) + '</button>'))
    ).join('');
  }
  async function registerLayerButtons(layerBlobs) {
    const digestToBlob = await layerBlobs.reduce(
      async (digestToBlob, layerBlob) => {
        (await digestToBlob)[await layerBlob.digest] = layerBlob;
        return digestToBlob;
      }, 
      Promise.resolve({}));
  
    DOM.layerButtons.forEach(layerButton => {
      const layerDigest = layerButton.innerHTML;
      const layerBlob = digestToBlob[layerDigest];
      layerButton.onclick = () => clickLayerButton(layerBlob);
    });
  }
  async function clickLayerButton(layerBlob) {
    Panels.rightMiddle.load(async () => {
      const layerContent = await layerBlob.arrayBuffer;
      const unzipped = pako.ungzip(layerContent).buffer;
      try {
        const files = await untar(unzipped);
      
        DOM.files.innerHTML = makeFileButtons(files);
        registerFileButtons(files);
        
      } catch (err) {
        throw 'untar error: ' + err;
      }
    });
  }
  
  function makeFileButtons(files) {
    return files.map(file => '<button class="showFile">' + file.name + '</button>').join('');
  }
  function registerFileButtons(files) {
    const filenameToFile = files.reduce(
      (filenameToFile, file) => {
        filenameToFile[file.name] = file;
        return filenameToFile;
      }, 
      {});

    DOM.fileButtons.forEach(fileButton => {
      const filename = fileButton.innerHTML;
      const file = filenameToFile[filename];
      fileButton.onclick = () => displayText(file.name, file.readAsString());
    });
  }
  
  function displayText(title, text) {
    DOM.textname.innerHTML = title;
    DOM.text.value = text;
  }
  function clearTextarea() {
    displayText('', '');
  }
})();