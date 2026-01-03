export class ModuleDetector {
  constructor() {
    this.detectedButtons = [];
    this.standardButtons = [];
  }

  async initialize() {
    this.registerStandardButtons();
    await this.detectModuleButtons();
  }

  registerStandardButtons() {
    this.standardButtons = [
      {
        id: 'close',
        label: 'Close',
        icon: 'fas fa-times',
        action: 'close',
        type: 'standard'
      },
      {
        id: 'minimize',
        label: 'Minimize',
        icon: 'fas fa-minus',
        action: 'minimize',
        type: 'standard'
      },
      {
        id: 'configure',
        label: 'Configure',
        icon: 'fas fa-cog',
        action: 'configure',
        type: 'standard'
      },
      {
        id: 'import',
        label: 'Import',
        icon: 'fas fa-file-import',
        action: 'import',
        type: 'standard'
      },
      {
        id: 'token',
        label: 'Token',
        icon: 'fas fa-user-circle',
        action: 'token',
        type: 'standard'
      },
      {
        id: 'sheet',
        label: 'Sheet',
        icon: 'fas fa-id-card',
        action: 'sheet',
        type: 'standard'
      }
    ];
  }

  async detectModuleButtons() {
    this.detectedButtons = [...this.standardButtons];
    
    // Get manually added modules from settings
    const manualModulesSetting = game.settings.get('rnk-header', 'manualModules') || '';
    const manualModules = manualModulesSetting.split(',').map(id => id.trim()).filter(id => id);
    
    // Modules that should not appear as buttons (no UI to open) unless manually added
    const moduleBlacklist = [
      'item-piles',
      'simple-calendar',
      '_chatcommands',
      'lib-wrapper',
      'socketlib',
      'pf2e-graphics',
      'pf2e-dailies',
      'times-up',
      'polyglot',
      'dice-so-nice'
    ];
    
    // Add active modules as buttons
    const activeModules = game.modules.filter(m => m.active);
    for (const module of activeModules) {
      const isManuallyAdded = manualModules.includes(module.id);
      const isBlacklisted = moduleBlacklist.includes(module.id) && !isManuallyAdded;
      
      // Skip if blacklisted and not manually added
      if (isBlacklisted) continue;
      
      // Add if manually added OR has open handler
      if (isManuallyAdded || this.hasOpenHandler(module)) {
        this.detectedButtons.push({
          id: `module-${module.id}`,
          label: module.title,
          icon: 'fas fa-puzzle-piece',
          action: 'open-module',
          type: 'module',
          moduleId: module.id,
          manuallyAdded: isManuallyAdded,
          callback: (app) => {
            ui.notifications.info(`Opening ${module.title}`);
          }
        });
      }
    }
    
    // Add sidebar tabs
    this.addSidebarTabs();
    
    console.log('RNK Header | Detected buttons:', this.detectedButtons.length);
    return this.detectedButtons;
  }

  addSidebarTabs() {
    const sidebarTabs = [
      { id: 'chat', label: 'Chat', icon: 'fas fa-comments', callback: () => ui.chat?.renderPopout() },
      { id: 'combat', label: 'Combat Tracker', icon: 'fas fa-fist-raised', callback: () => ui.combat?.renderPopout() },
      { id: 'scenes', label: 'Scenes', icon: 'fas fa-map', callback: () => ui.scenes?.renderPopout() },
      { id: 'actors', label: 'Actors', icon: 'fas fa-users', callback: () => ui.actors?.renderPopout() },
      { id: 'items', label: 'Items', icon: 'fas fa-suitcase', callback: () => ui.items?.renderPopout() },
      { id: 'journal', label: 'Journal Entries', icon: 'fas fa-book-open', callback: () => ui.journal?.renderPopout() },
      { id: 'tables', label: 'Rollable Tables', icon: 'fas fa-th-list', callback: () => ui.tables?.renderPopout() },
      { id: 'cards', label: 'Card Decks', icon: 'fas fa-cards', callback: () => ui.cards?.renderPopout() },
      { id: 'playlists', label: 'Playlists', icon: 'fas fa-music', callback: () => ui.playlists?.renderPopout() },
      { id: 'compendium', label: 'Compendium Packs', icon: 'fas fa-atlas', callback: () => ui.compendium?.renderPopout() },
      { id: 'settings', label: 'Game Settings', icon: 'fas fa-cogs', callback: () => game.settings?.sheet?.render(true) }
    ];

    for (const tab of sidebarTabs) {
      this.detectedButtons.push({
        id: `sidebar-${tab.id}`,
        label: tab.label,
        icon: tab.icon,
        action: 'open-sidebar',
        type: 'sidebar',
        callback: tab.callback
      });
    }
  }

  hasOpenHandler(module) {
    // Check if module has any standard open method
    if (typeof module.open === 'function') return true;
    if (module.api?.open || module.api?.render) return true;
    if (module.public?.open || module.public?.render) return true;
    if (module.sheet?.render) return true;
    if (module.apps?.[0]?.render) return true;
    
    // Check global objects
    const globalName = module.id;
    const globalObj = window[globalName] || window[globalName.charAt(0).toUpperCase() + globalName.slice(1)];
    if (globalObj?.render || globalObj?.open) return true;
    
    // Check if module adds custom header buttons
    if (module.api?.headerButtons || window[module.id]?.headerButtons) return true;
    
    return false;
  }

  extractModuleButtons(module) {
    const buttons = [];
    
    if (module.api?.headerButtons) {
      for (const button of module.api.headerButtons) {
        buttons.push({
          id: `${module.id}-${button.id}`,
          label: button.label || button.id,
          icon: button.icon || 'fas fa-puzzle-piece',
          action: button.action,
          type: 'module',
          moduleId: module.id,
          moduleName: module.title,
          callback: button.callback
        });
      }
    }
    
    if (window[module.id]?.headerButtons) {
      const moduleButtons = window[module.id].headerButtons;
      for (const button of moduleButtons) {
        buttons.push({
          id: `${module.id}-${button.id}`,
          label: button.label || button.id,
          icon: button.icon || 'fas fa-puzzle-piece',
          action: button.action,
          type: 'module',
          moduleId: module.id,
          moduleName: module.title,
          callback: button.callback
        });
      }
    }

    return buttons;
  }

  getButton(buttonId) {
    return this.detectedButtons.find(b => b.id === buttonId);
  }

  getAllButtons() {
    return this.detectedButtons;
  }

  getStandardButtons() {
    return this.standardButtons;
  }

  getModuleButtons() {
    return this.detectedButtons.filter(b => b.type === 'module');
  }

  registerButton(buttonConfig) {
    const existingIndex = this.detectedButtons.findIndex(b => b.id === buttonConfig.id);
    if (existingIndex >= 0) {
      this.detectedButtons[existingIndex] = buttonConfig;
    } else {
      this.detectedButtons.push(buttonConfig);
    }
    console.log('RNK Header | Registered button:', buttonConfig.id);
  }

  unregisterButton(buttonId) {
    const index = this.detectedButtons.findIndex(b => b.id === buttonId);
    if (index >= 0) {
      this.detectedButtons.splice(index, 1);
      console.log('RNK Header | Unregistered button:', buttonId);
      return true;
    }
    return false;
  }
}
