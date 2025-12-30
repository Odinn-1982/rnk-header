export class GMHub extends FormApplication {
  constructor(slotManager, moduleDetector, permissionManager, options = {}) {
    super({}, options);
    
    // If called from Foundry settings menu, arguments will be missing
    if (!slotManager && window.RNKHeader) {
      this.slotManager = window.RNKHeader.slotManager;
      this.moduleDetector = window.RNKHeader.moduleDetector;
      this.permissionManager = window.RNKHeader.permissionManager;
    } else {
      this.slotManager = slotManager;
      this.moduleDetector = moduleDetector;
      this.permissionManager = permissionManager;
    }
    
    // Register Handlebars helpers if not already registered
    if (!Handlebars.helpers.add) {
      Handlebars.registerHelper('add', (a, b) => a + b);
    }
    if (!Handlebars.helpers.eq) {
      Handlebars.registerHelper('eq', (a, b) => a === b);
    }
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'rnk-gm-hub',
      title: 'RNK Header Configuration',
      template: 'modules/rnk-header/templates/gm-hub.html',
      width: 700,
      height: 'auto',
      closeOnSubmit: false,
      submitOnChange: false,
      tabs: [
        { navSelector: '.rnk-nav-tabs', contentSelector: '.rnk-content', initial: 'slots' }
      ]
    });
  }

  static addSceneControl(controls) {
    try {
      if (!game?.user?.isGM) return;

      controls['rnk-header'] = {
        name: 'rnk-header',
        title: 'RNK Header',
        icon: 'fas fa-sliders-h',
        visible: true,
        layer: 'controls',
        tools: {
          configure: {
            name: 'configure',
            title: 'Open Configuration',
            icon: 'fas fa-cog',
            button: true,
            visible: true,
            onClick: () => {
              try {
                console.log('RNK Header | Button clicked');
                const header = window.RNKHeader;
                if (!header) {
                  console.error('RNK Header | window.RNKHeader not found');
                  return;
                }
                
                if (!header.gmHub) {
                  console.log('RNK Header | Creating new GMHub instance...');
                  header.gmHub = new GMHub(header.slotManager, header.moduleDetector, header.permissionManager);
                }
                
                console.log('RNK Header | Rendering GMHub...');
                header.gmHub.render(true, { focus: true });
              } catch (error) {
                console.error('RNK Header | Error opening GMHub:', error);
                ui.notifications.error('Failed to open RNK Header configuration');
              }
            }
          }
        },
        activeTool: 'configure'
      };
      console.log('RNK Header | Scene control added');
    } catch (error) {
      console.error('RNK Header | Error in addSceneControl:', error);
    }
  }

  getData(options = {}) {
    const data = super.getData(options);
    
    console.log('RNK Header | GMHub getData called');
    data.slots = this.slotManager.config.slots;
    data.availableButtons = this.moduleDetector.getAllButtons();
    data.users = game.users.filter(u => !u.isGM);
    data.slotVisibility = this.permissionManager.getSlotVisibility();
    data.psychedelic = game.settings.get('rnk-header', 'psychedelicBackground');
    
    console.log('RNK Header | Slots:', data.slots);
    console.log('RNK Header | Available Buttons:', data.availableButtons);
    
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('.rnk-close-button').on('click', () => this.close());
    html.find('.slot-assignment').on('change', this._onSlotAssignment.bind(this));
    html.find('.slot-hide-toggle').on('change', this._onSlotHideToggle.bind(this));
    html.find('.slot-image-path').on('change', this._onSlotImageChange.bind(this));
    html.find('.rnk-file-picker').on('click', this._onFilePickerClick.bind(this));
    html.find('.slot-visibility-toggle').on('change', this._onSlotVisibilityToggle.bind(this));
    html.find('.reset-config').on('click', this._onResetConfig.bind(this));
    html.find('.save-config').on('click', () => this.close());
  }

  async _onSlotHideToggle(event) {
    const checkbox = $(event.currentTarget);
    const slotId = checkbox.data('slot-id');
    const isHidden = checkbox.is(':checked');

    this.slotManager.setSlotHidden(slotId, isHidden);
    this.render(false);
  }

  async _onSlotImageChange(event) {
    const input = $(event.currentTarget);
    const slotId = input.data('slot-id');
    const imagePath = input.val();

    console.log(`RNK Header | Image change for slot ${slotId}: ${imagePath}`);

    const slot = this.slotManager.findSlotById(slotId);
    if (slot?.button) {
      slot.button.image = imagePath;
      await this.slotManager.saveConfiguration();
      this.render(false);
    } else {
      ui.notifications.warn("Please assign a button to this slot before setting a custom image.");
    }
  }

  async _onFilePickerClick(event) {
    const button = $(event.currentTarget);
    const slotId = button.data('slot-id');
    
    new FilePicker({
      type: "image",
      callback: async (path) => {
        console.log(`RNK Header | File picked for slot ${slotId}: ${path}`);
        const input = button.siblings('.slot-image-path');
        input.val(path);
        
        const slot = this.slotManager.findSlotById(slotId);
        if (slot?.button) {
          slot.button.image = path;
          await this.slotManager.saveConfiguration();
          this.render(false);
        } else {
          ui.notifications.warn("Please assign a button to this slot before setting a custom image.");
        }
      }
    }).browse();
  }

  async _onSlotAssignment(event) {
    const select = $(event.currentTarget);
    const slotId = select.data('slot-id');
    const buttonId = select.val();

    console.log(`RNK Header | Slot assignment: ${slotId} -> ${buttonId}`);

    if (buttonId === 'none') {
      this.slotManager.unassignButtonInSlot(slotId);
    } else {
      const button = this.moduleDetector.getButton(buttonId);
      if (button) {
        // Clone the button object to avoid modifying the original in ModuleDetector
        const buttonClone = { ...button };
        this.slotManager.assignButton(slotId, buttonClone);
      }
    }
    this.render(false);
  }

  async _onSlotVisibilityToggle(event) {
    const checkbox = $(event.currentTarget);
    const userId = checkbox.data('user-id');
    const slotIndex = checkbox.data('slot-index');
    const isVisible = checkbox.is(':checked');

    this.permissionManager.setSlotVisibility(userId, slotIndex, isVisible);
  }

  async _onPermissionToggle(event) {
    const checkbox = $(event.currentTarget);
    const buttonId = checkbox.data('button-id');
    const userId = checkbox.data('user-id');
    const canSee = checkbox.is(':checked');

    this.permissionManager.setButtonPermission(buttonId, userId, canSee);
  }

  async _onPermissionModeChange(event) {
    const select = $(event.currentTarget);
    const buttonId = select.data('button-id');
    const mode = select.val();

    this.permissionManager.setButtonPermissionMode(buttonId, mode);
    this.render(false);
  }

  async _onResetConfig(event) {
    event.preventDefault();
    
    const confirm = await Dialog.confirm({
      title: 'Reset Configuration',
      content: '<p>Are you sure you want to reset all RNK Header configuration?</p>',
      yes: () => true,
      no: () => false
    });

    if (confirm) {
      this.slotManager.reset();
      this.permissionManager.reset();
      ui.notifications.info('RNK Header configuration reset to defaults');
      this.render(false);
    }
  }

  async _onSaveConfig(event) {
    event.preventDefault();
    await this.slotManager.saveConfiguration();
    await this.permissionManager.savePermissions();
    ui.notifications.info('RNK Header configuration saved');
  }

  async _updateObject(event, formData) {
    // Handle form submission if needed
  }

  async close(options = {}) {
    console.log('RNK Header | Closing GMHub...');
    if (window.RNKHeader) window.RNKHeader.gmHub = null;
    return super.close(options);
  }
}
