export class HeaderInjector {
  constructor(slotManager, moduleDetector, permissionManager) {
    this.slotManager = slotManager;
    this.moduleDetector = moduleDetector;
    this.permissionManager = permissionManager;
  }

  async onRenderApplication(app, html, data) {
    console.log('RNK Header | Hook fired for:', app.constructor.name);
    
    if (!game.user) {
      console.log('RNK Header | No game.user, skipping');
      return;
    }
    
    if (!html.jquery) {
      html = $(html);
    }
    const isSceneControls = app.constructor?.name === 'SceneControls' || html.hasClass('scene-controls') || app?.id === 'sceneControls';
    if (isSceneControls) {
      return;
    }

    // Skip the RNK GM Hub itself
    if (app.id === 'rnk-gm-hub' || app.options?.id === 'rnk-gm-hub' || app.constructor.name === 'GMHub') {
      console.log('RNK Header | Skipping GM Hub injection');
      return;
    }

    const maybeWindow = app.element?.length ? (app.element.jquery ? app.element : $(app.element)) : html.closest('.app.window-app, .window-app, .app');
    if (!maybeWindow.length) {
      return;
    }

    const header = maybeWindow.find('.window-header');
    if (!header.length) {
      return;
    }

    console.log('RNK Header | SUCCESS! Injecting into:', app.constructor.name, 'with', this.slotManager.MAIN_SLOTS, 'slots');
    await this.injectCustomHeader(app, header);
  }

  async injectCustomHeader(app, header) {
    // Hide existing controls
    const existingControls = header.find('.window-title, .header-button, [data-action]');
    existingControls.css('display', 'none');

    // Remove any existing RNK header
    header.find('.rnk-custom-header').remove();

    const rnkHeader = $('<div class="rnk-custom-header"></div>');
    
    // Add a permanent close button at the start of the custom header (left side of slots)
    if (game.settings.get('rnk-header', 'showCloseButton')) {
      const closeButton = $(`
        <a class="rnk-header-button rnk-close-button" title="Close Window">
          <i class="fas fa-times"></i>
        </a>
      `);
      closeButton.on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        app.close();
      });
      rnkHeader.append(closeButton);
    }

    // Create main slot elements
    for (let i = 0; i < this.slotManager.MAIN_SLOTS; i++) {
      const mainSlot = this.slotManager.getMainSlot(i);
      
      // Skip if slot is hidden globally
      if (mainSlot.hidden) continue;

      // Check if user can see this slot (GM always sees all)
      if (!game.user.isGM && !this.permissionManager.canUserSeeSlot(game.user.id, i)) {
        continue;
      }

      const mainSlotElement = this.createMainSlotElement(app, mainSlot, i);
      rnkHeader.append(mainSlotElement);
    }

    console.log('RNK Header | Injected', rnkHeader.children().length, 'slots');

    header.append(rnkHeader);
  }

  createMainSlotElement(app, mainSlot, index) {
    const container = $('<div class="rnk-header-slot rnk-main-slot"></div>');
    container.attr('data-slot-id', mainSlot.id);
    container.attr('data-slot-index', index);

    // Always show a slot - blank if no button assigned
    if (mainSlot.button) {
      const hasSubButtons = mainSlot.subSlots.some(sub => sub.button);
      
      if (hasSubButtons) {
        const dropdown = this.createDropdownElement(app, mainSlot);
        container.append(dropdown);
      } else {
        const buttonElement = this.createButtonElement(app, mainSlot.button);
        container.append(buttonElement);
      }
    } else {
      // Show blank/empty slot
      const blankSlot = $(`
        <a class="rnk-header-button rnk-blank-slot" title="Empty Slot ${index + 1} (Right-click to assign)">
          <i class="far fa-circle"></i>
        </a>
      `);
      
      // GM can right-click blank slots to assign
      if (game.user.isGM) {
        blankSlot.on('contextmenu', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.handleBlankSlotRightClick(mainSlot, event);
        });
      }
      
      container.append(blankSlot);
    }

    return container;
  }

  createDropdownElement(app, mainSlot) {
    const dropdown = $('<div class="rnk-header-dropdown"></div>');
    
    const mainButton = this.createButtonElement(app, mainSlot.button);
    mainButton.on('click', (event) => {
      event.stopPropagation();
      dropdown.toggleClass('active');
      $('.rnk-header-dropdown').not(dropdown).removeClass('active');
    });
    
    dropdown.append(mainButton);
    
    const dropdownContent = $('<div class="rnk-header-dropdown-content"></div>');
    
    for (const subSlot of mainSlot.subSlots) {
      if (subSlot.button) {
        if (!this.permissionManager.canUserSee(game.user.id, subSlot.button.id)) continue;
        
        const subItem = this.createDropdownItemElement(app, subSlot.button);
        dropdownContent.append(subItem);
      }
    }
    
    dropdown.append(dropdownContent);
    
    return dropdown;
  }

  createButtonElement(app, button) {
    if (!this.permissionManager.canUserSee(game.user.id, button.id)) {
      return $('<span></span>');
    }

    let content = `<i class="${button.icon}"></i>`;
    if (button.image) {
      content = `<img src="${button.image}" class="rnk-button-image" />`;
    }

    const buttonElement = $(`
      <a class="rnk-header-button" data-button-id="${button.id}" title="${button.label}">
        ${content}
      </a>
    `);

    buttonElement.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleButtonClick(app, button, event);
    });

    buttonElement.on('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (game.user.isGM) {
        this.handleButtonRightClick(button, event);
      }
    });

    return buttonElement;
  }

  createDropdownItemElement(app, button) {
    let iconContent = `<i class="${button.icon}"></i>`;
    if (button.image) {
      iconContent = `<img src="${button.image}" class="rnk-button-image-small" />`;
    }

    const item = $(`
      <div class="rnk-header-dropdown-item" data-button-id="${button.id}">
        ${iconContent}
        <span>${button.label}</span>
      </div>
    `);

    item.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleButtonClick(app, button, event);
      $('.rnk-header-dropdown').removeClass('active');
    });

    item.on('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (game.user.isGM) {
        this.handleButtonRightClick(button, event);
      }
    });

    return item;
  }

  handleButtonClick(app, button, event) {
    if (button.callback) {
      button.callback(app, button, event);
      return;
    }

    switch (button.action) {
      case 'close':
        app.close();
        break;
      case 'minimize':
        app.minimize();
        break;
      case 'configure':
        if (app.sheet) {
          app.object.sheet.render(true);
        }
        break;
      case 'token':
        if (app.object?.getActiveTokens) {
          const tokens = app.object.getActiveTokens();
          if (tokens.length > 0) {
            tokens[0].control();
          }
        }
        break;
      case 'sheet':
        if (app.object?.sheet) {
          app.object.sheet.render(true);
        }
        break;
      default:
        console.warn('RNK Header | Unknown action:', button.action);
    }
  }

  handleButtonRightClick(button, event) {
    if (window.RNKHeader?.contextMenu) {
      window.RNKHeader.contextMenu.show(button, event);
    }
  }

  handleBlankSlotRightClick(slot, event) {
    // TODO: Show context menu for blank slot assignment
    // For now, just log it
    console.log('RNK Header | Right-clicked blank slot:', slot.id);
    
    // Could open GM Hub automatically
    if (window.RNKHeader?.gmHub) {
      window.RNKHeader.gmHub.render(true);
    }
  }
}

$(document).on('click', () => {
  $('.rnk-header-dropdown').removeClass('active');
});
