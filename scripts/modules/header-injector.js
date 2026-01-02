export class HeaderInjector {
  constructor(slotManager, moduleDetector, permissionManager) {
    this.slotManager = slotManager;
    this.moduleDetector = moduleDetector;
    this.permissionManager = permissionManager;
  }

  async onRenderApplication(app, html, data) {
    console.log('RNK Header | Hook fired for:', app.constructor.name, 'Actor:', app.actor?.name || app.object?.name || 'N/A');
    
    if (!game.user) {
      console.log('RNK Header | No game.user, skipping');
      return;
    }
    
    // For v2 apps, html might be the app itself, not a jQuery object
    if (!html) {
      console.log('RNK Header | No html passed to render hook');
      return;
    }
    
    if (!html.jquery) {
      html = $(html);
    }
    
    const isSceneControls = app.constructor?.name === 'SceneControls' || html.hasClass('scene-controls') || app?.id === 'sceneControls';
    if (isSceneControls) {
      console.log('RNK Header | Skipping scene controls');
      return;
    }

    // Skip the RNK GM Hub itself
    if (app.id === 'rnk-gm-hub' || app.options?.id === 'rnk-gm-hub' || app.constructor.name === 'GMHub') {
      console.log('RNK Header | Skipping GM Hub injection');
      return;
    }

    // Only inject on actor sheets, and only for player characters
    const actor = app.actor
      || (app.document?.documentName === 'Actor' ? app.document : null)
      || (app.object?.documentName === 'Actor' ? app.object : null);

    if (!actor) {
      console.log('RNK Header | No actor, skipping for:', app.constructor.name);
      return;
    }

    const allowedTypes = ['character', 'pc'];
    if (!allowedTypes.includes(actor.type)) {
      console.log('RNK Header | Non-character actor type, skipping:', actor.type || 'unknown');
      return;
    }

    // For players: only show on owned actors
    if (!game.user.isGM && !actor.isOwner) {
      console.log('RNK Header | Player: does not own this actor, skipping');
      return;
    }

    // Find the window header - try multiple selectors
    let header = null;
    const maybeWindow = app.element?.length ? (app.element.jquery ? app.element : $(app.element)) : html.closest('.app.window-app, .window-app, .app, [role="dialog"]');
    
    if (maybeWindow.length) {
      header = maybeWindow.find('.window-header');
    }
    
    if (!header || !header.length) {
      console.log('RNK Header | Could not find header element for:', app.constructor.name);
      return;
    }

    const targetName = actor?.name || 'N/A';
    console.log('RNK Header | SUCCESS! Injecting into:', app.constructor.name, 'Target:', targetName, 'with', this.slotManager.MAIN_SLOTS, 'slots');
    await this.injectCustomHeader(app, header);
  }

  async injectCustomHeader(app, header) {
    // Remove any existing RNK header
    header.find('.rnk-custom-header').remove();

    const rnkHeader = $('<div class="rnk-custom-header"></div>');
    const slotsContainer = $('<div style="display: flex; align-items: center; gap: 8px;"></div>');
    
    // Add a permanent close button variable
    let closeButton = null;
    if (game.settings.get('rnk-header', 'showCloseButton')) {
      closeButton = $(`
        <a class="rnk-header-button rnk-close-button" title="Close Window">
          <i class="fas fa-times"></i>
        </a>
      `);
      closeButton.on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        app.close();
      });
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
      slotsContainer.append(mainSlotElement);
    }

    // Append slots container and close button to main header
    rnkHeader.append(slotsContainer);
    if (closeButton) {
      rnkHeader.append(closeButton);
    }

    console.log('RNK Header | Injected', slotsContainer.children().length, 'slots');

    // For v13+ ApplicationV2, inject into header-elements if it exists
    const headerElements = header.find('.header-elements');
    if (headerElements.length) {
      headerElements.append(rnkHeader);
      console.log('RNK Header | Injected into .header-elements');
    } else {
      // Fallback for v1 applications
      header.append(rnkHeader);
      console.log('RNK Header | Injected directly into header');
    }
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
      case 'open-module': {
        const mod = button.moduleId ? game.modules.get(button.moduleId) : null;
        if (mod?.api?.open) {
          mod.api.open();
        } else if (mod?.api?.render) {
          mod.api.render(true);
        } else if (mod?.sheet) {
          mod.sheet.render(true);
        } else {
          ui.notifications?.info(`Module ${mod?.title || button.label || 'module'} is active but has no open handler.`);
        }
        break;
      }
      case 'import':
        if (app.import) {
          app.import();
        } else {
          ui.notifications?.warn('No import handler available for this sheet.');
        }
        break;
      case 'open-sidebar':
        // Sidebar buttons usually include a callback; this is a fallback.
        if (ui[button.id]?.renderPopout) {
          ui[button.id].renderPopout();
        } else {
          ui.notifications?.warn('Sidebar panel is unavailable.');
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
