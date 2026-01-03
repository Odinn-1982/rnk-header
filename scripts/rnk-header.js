import { SlotManager } from './modules/slot-manager.js';
import { ModuleDetector } from './modules/module-detector.js';
import { HeaderInjector } from './modules/header-injector.js';
import { PermissionManager } from './modules/permission-manager.js';
import { GMHub } from './modules/gm-hub.js';
import { ContextMenuHandler } from './modules/context-menu.js';
import { RNKHeaderAPI } from './modules/api.js';

class RNKHeader {
  constructor() {
    this.slotManager = null;
    this.moduleDetector = null;
    this.headerInjector = null;
    this.permissionManager = null;
    this.gmHub = null;
    this.contextMenu = null;
    this.api = null;
  }

  async initialize() {
    console.log('RNK Header | Initializing...');
    
    this.registerSettings();
    
    this.slotManager = new SlotManager();
    this.moduleDetector = new ModuleDetector();
    this.permissionManager = new PermissionManager();
    
    await this.slotManager.initialize();
    await this.moduleDetector.initialize();
    await this.permissionManager.initialize();
    
    this.headerInjector = new HeaderInjector(this.slotManager, this.moduleDetector, this.permissionManager);
    this.contextMenu = new ContextMenuHandler(this.slotManager);
    this.api = new RNKHeaderAPI(this.slotManager, this.moduleDetector);
    this.gmHub = null;
    
    this.registerHooks();
    this.registerAPI();
    
    console.log('RNK Header | Initialized successfully');
  }

  registerSettings() {
    game.settings.registerMenu('rnk-header', 'gmHub', {
      name: 'RNK Header Configuration',
      label: 'Open Configuration Hub',
      hint: 'Configure button slots, custom images, and player permissions.',
      icon: 'fas fa-sliders-h',
      type: GMHub,
      restricted: true
    });

    game.settings.register('rnk-header', 'showCloseButton', {
      name: 'Show Close Button',
      hint: 'Show the red close button on the left side of the header.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: () => {
        Object.values(ui.windows).forEach(w => w.render(true));
      }
    });

    game.settings.register('rnk-header', 'headerHeight', {
      name: 'Header Height (px)',
      hint: 'Adjust the height of the custom header. Default is 30px.',
      scope: 'world',
      config: true,
      type: Number,
      default: 30,
      onChange: (value) => {
        document.documentElement.style.setProperty('--rnk-header-height', `${value}px`);
      }
    });

    game.settings.register('rnk-header', 'psychedelicBackground', {
      name: 'Psychedelic GM Hub Background',
      hint: 'Enable animated gradient in the configuration hub.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: () => {
        if (window.RNKHeader?.gmHub) window.RNKHeader.gmHub.render();
      }
    });

    game.settings.register('rnk-header', 'slotConfiguration', {
      name: 'Slot Configuration',
      scope: 'world',
      config: false,
      type: Object,
      default: null
    });

    game.settings.register('rnk-header', 'permissions', {
      name: 'Button Permissions',
      scope: 'world',
      config: false,
      type: Object,
      default: null
    });

    game.settings.register('rnk-header', 'manualModules', {
      name: 'Manually Added Modules',
      hint: 'Comma-separated list of module IDs to always show as buttons (e.g., "item-piles,simple-calendar")',
      scope: 'world',
      config: true,
      type: String,
      default: '',
      onChange: async () => {
        if (window.RNKHeader?.moduleDetector) {
          await window.RNKHeader.moduleDetector.detectModuleButtons();
        }
      }
    });
  }

  registerHooks() {
    // V1 Application hooks (legacy)
    Hooks.on('renderApplication', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderActorSheet', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderActorSheet5e', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderActorSheet5eCharacter', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderActorSheet5eNPC', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderItemSheet', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderItemSheet5e', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderJournalSheet', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderJournalPageSheet', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderSceneConfig', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderCombatTracker', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    
    // V2 Application hooks (v13+)
    Hooks.on('renderApplicationV2', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    Hooks.on('renderActorSheetV2', this.headerInjector.onRenderApplication.bind(this.headerInjector));
    
    // Catch-all for ANY window render
    Hooks.on('render', (app, html, data) => {
      // Only process if it's an application window
      if (app instanceof Application || app instanceof foundry.applications.api.ApplicationV2) {
        this.headerInjector.onRenderApplication(app, html, data);
      }
    });
    
    Hooks.on('getSceneControlButtons', GMHub.addSceneControl);
    
    Hooks.on('ready', async () => {
      // Set CSS variables from settings
      const height = game.settings.get('rnk-header', 'headerHeight');
      document.documentElement.style.setProperty('--rnk-header-height', `${height}px`);

      await this.moduleDetector.detectModuleButtons();
      if (!this.slotManager.config) {
        await this.slotManager.saveConfiguration();
      }
      if (!this.permissionManager.permissions) {
        await this.permissionManager.savePermissions();
      }
    });
  }

  registerAPI() {
    game.modules.get('rnk-header').api = this.api;
    console.log('RNK Header | API registered');
  }
}

Hooks.once('init', async () => {
  // Register Handlebars helpers
  Handlebars.registerHelper('add', (a, b) => a + b);
  Handlebars.registerHelper('eq', (a, b) => a === b);
  
  window.RNKHeader = new RNKHeader();
  await window.RNKHeader.initialize();
});
