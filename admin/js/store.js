const EditorStore = {
  isEditorMode: false,
  currentUser: null,
  pendingChanges: false,
  changedBlocks: {},
  currentArticleId: null,
  articlePanelOpen: false,
  seoPanelOpen: false,

  activateEditorMode(user) {
    this.isEditorMode = true;
    this.currentUser = user;
    this.dispatchChange();
  },

  deactivateEditorMode() {
    this.isEditorMode = false;
    this.currentUser = null;
    this.pendingChanges = false;
    this.changedBlocks = {};
    this.dispatchChange();
  },

  updateBlock(blockId, content) {
    this.pendingChanges = true;
    this.changedBlocks[blockId] = content;
    this.dispatchChange();
  },

  setCurrentArticle(id) {
    this.currentArticleId = id;
    this.dispatchChange();
  },

  openArticlePanel() {
    this.articlePanelOpen = true;
    this.seoPanelOpen = false;
    this.dispatchChange();
  },

  openSeoPanel() {
    this.seoPanelOpen = true;
    this.articlePanelOpen = false;
    this.dispatchChange();
  },

  closePanels() {
    this.articlePanelOpen = false;
    this.seoPanelOpen = false;
    this.dispatchChange();
  },

  async saveAllChanges(estado) {
    const pageId = this.currentArticleId || document.body.dataset.pageId || 'home';
    try {
      const res = await fetch(`/api/content/index.php?id=${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: this.changedBlocks, estado })
      });
      if (res.ok) {
        this.pendingChanges = false;
        this.changedBlocks = {};
        this.dispatchChange();
        return true;
      }
    } catch (err) {
      console.error('Error saving changes:', err);
    }
    return false;
  },

  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  dispatchChange() {
    this.listeners.forEach(cb => cb(this));
  }
};

window.EditorStore = EditorStore;