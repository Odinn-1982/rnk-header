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

    // STRICT CHECK: The document being rendered MUST be an Actor.
    // This prevents the header from appearing on Item sheets that happen to belong to an Actor.
    const isActorDoc = (app.document?.documentName === 'Actor') || (app.object?.documentName === 'Actor');
    if (!isActorDoc) {
      console.log('RNK Header | Not an Actor document (likely Item or other), skipping:', app.constructor.name);
      return;
    }

    const actor = app.actor || app.document || app.object;

    if (!actor) {
      console.log('RNK Header | No actor found despite document check, skipping:', app.constructor.name);
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

    // Hide default Foundry header controls; RNK header will replace them
    // We target wrappers AND individual buttons that are not ours
    const defaultControls = header.find('.window-actions, .window-controls, .window-buttons, .header-actions, .header-button, .close');

    defaultControls.each((i, el) => {
      const $el = $(el);
      // Don't hide our own stuff if it's already there for some reason
      if ($el.closest('.rnk-custom-header').length) return;
      if ($el.hasClass('rnk-custom-header')) return;

      $el.addClass('rnk-hide-default');
    });

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
        if (typeof app.close === 'function') app.close();
        break;
      case 'minimize':
        if (typeof app.minimize === 'function') app.minimize();
        break;
      case 'configure':
        if (app.sheet) {
          app.object?.sheet?.render(true);
        }
        break;
      case 'token':
        if (app.object?.getActiveTokens) {
          const tokens = app.object.getActiveTokens();
          if (tokens && tokens.length > 0) {
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
        if (!mod) {
          ui.notifications?.warn(`Module ${button.moduleId || 'unknown'} not found.`);
          break;
        }

        // 0. Custom handlers for specific modules
        switch (button.moduleId) {
          case 'item-piles':
            if (game.itempiles?.API) {
              // Open Item Piles settings or show available actions
              game.settings.sheet.render(true, { filter: 'item-piles' });
              return;
            }
            break;
          case 'simple-calendar':
            if (window.SimpleCalendar?.api) {
              SimpleCalendar.api.showCalendar();
              return;
            } else if (game.modules.get('simple-calendar')?.api?.showCalendar) {
              game.modules.get('simple-calendar').api.showCalendar();
              return;
            }
            break;
          case 'mastercrafted':
            if (window.Mastercrafted?.openManager) {
              Mastercrafted.openManager();
              return;
            } else if (window.mastercrafted?.openManager) {
              mastercrafted.openManager();
              return;
            } else if (game.mastercrafted?.openManager) {
              game.mastercrafted.openManager();
              return;
            }
            // Try to find the crafting button in scene controls
            try {
              const craftingControl = ui.controls?.controls?.find(c => c.name === 'mastercrafted' || c.tools?.some(t => t.name === 'crafting'));
              if (craftingControl) {
                const tool = craftingControl.tools?.find(t => t.onClick);
                if (tool?.onClick) { tool.onClick(); return; }
              }
            } catch (e) {}
            break;
          case 'pf2e-crafting':
          case 'crafting-manager':
            // Generic crafting module patterns
            if (window.CraftingManager?.open) { CraftingManager.open(); return; }
            if (game.pf2eCrafting?.open) { game.pf2eCrafting.open(); return; }
            break;
          case 'skill-tree':
          case 'pf2e-skill-tree':
            if (window.SkillTree?.open) { SkillTree.open(); return; }
            if (window.skillTree?.open) { skillTree.open(); return; }
            if (game.skillTree?.open) { game.skillTree.open(); return; }
            // Try opening via actor
            try {
              const actor = app.actor || app.document || app.object;
              if (actor) {
                if (window.SkillTree?.openForActor) { SkillTree.openForActor(actor); return; }
                if (game.modules.get('skill-tree')?.api?.openForActor) { 
                  game.modules.get('skill-tree').api.openForActor(actor); 
                  return; 
                }
              }
            } catch (e) {}
            break;
          case 'monks-active-tiles':
            if (game.settings) {
              game.settings.sheet.render(true, { filter: 'monks-active-tiles' });
              return;
            }
            break;
          case 'dice-so-nice':
            if (game.dice3d) {
              game.settings.sheet.render(true, { filter: 'dice-so-nice' });
              return;
            }
            break;
        }

        // 1. Standard API patterns
        try {
          if (typeof mod.open === 'function') { mod.open(); return; }
          if (mod.api?.open) { mod.api.open(); return; }
          if (mod.api?.render) { mod.api.render(true); return; }
          if (mod.public?.open) { mod.public.open(); return; }
          if (mod.public?.render) { mod.public.render(true); return; }
        } catch (e) { console.warn('RNK Header | Error in standard API open:', e); }

        // 2. Sheet pattern
        try {
          if (mod.sheet) { mod.sheet.render(true); return; }
        } catch (e) { console.warn('RNK Header | Error opening module sheet:', e); }

        // 3. Apps array pattern
        try {
          if (mod.apps?.[0]?.render) { mod.apps[0].render(true); return; }
        } catch (e) { console.warn('RNK Header | Error opening module app:', e); }

        // 4. Global Object Pattern (ID or Title)
        const globalName = button.moduleId;
        const globalObj = window[globalName] || window[globalName.charAt(0).toUpperCase() + globalName.slice(1)];
        try {
          if (globalObj?.render) { globalObj.render(true); return; }
          if (globalObj?.open) { globalObj.open(); return; }
        } catch (e) { console.warn('RNK Header | Error opening global object:', e); }

        // 5. Sidebar Tab Pattern
        try {
          if (ui.sidebar?.tabs) {
            const sidebarTab = Object.values(ui.sidebar.tabs).find(t => t.id === button.moduleId || t.options?.id === button.moduleId);
            if (sidebarTab) { sidebarTab.activate(); return; }
          }
        } catch (e) { console.warn('RNK Header | Error checking sidebar tabs:', e); }

        // 6. Scene Control Pattern
        try {
          if (ui.controls?.controls && Array.isArray(ui.controls.controls)) {
            const control = ui.controls.controls.find(c => c.name === button.moduleId || c.title === mod.title);
            if (control) {
                if (control.layer) ui.controls.initialize({layer: control.layer, tool: control.tools[0]?.name});
                return;
            }
          }
        } catch (e) { console.warn('RNK Header | Error checking scene controls:', e); }

        // 7. Hidden Header Button Pattern (The "Click the hidden button" trick)
        // If the module added a button to the header that we hid, try to find it and click it.
        try {
          // Ensure we have a jQuery object for the element
          const $appElement = app.element instanceof $ ? app.element : $(app.element);

          if ($appElement && $appElement.length) {
              const hiddenButtons = $appElement.find('.window-header .rnk-hide-default');
              let targetButton = null;

              hiddenButtons.each((i, el) => {
                  const btn = $(el);
                  const title = (btn.attr('title') || '').toLowerCase();
                  const classes = (btn.attr('class') || '').toLowerCase();
                  const text = (btn.text() || '').toLowerCase();
                  const modId = button.moduleId.toLowerCase();
                  const modTitle = mod.title.toLowerCase();

                  // Robust matching:
                  // 1. Class contains module ID (very common)
                  // 2. Title contains module title OR module title contains button title (fuzzy match)
                  // 3. Text contains module title OR module title contains button text
                  if (classes.includes(modId) ||
                      (title && (title.includes(modTitle) || modTitle.includes(title))) ||
                      (text && (text.includes(modTitle) || modTitle.includes(text)))) {
                      targetButton = btn;
                      return false; // break
                  }
              });

              if (targetButton) {
                  console.log('RNK Header | Found hidden header button for module, clicking it:', targetButton);
                  // Try both jQuery click and native click for maximum compatibility
                  targetButton.trigger('click');
                  if (targetButton[0] && typeof targetButton[0].click === 'function') {
                      targetButton[0].click();
                  }
                  return;
              }
          }
        } catch (e) { console.warn('RNK Header | Error checking hidden buttons:', e); }

        // 8. API Function Pattern (Some modules export a function directly as api)
        try {
            if (typeof mod.api === 'function') { mod.api(); return; }
        } catch (e) { console.warn('RNK Header | Error calling module API function:', e); }

        // 8. Deep Global Search (Last Resort)
        if (globalObj) {
             for (const key in globalObj) {
                 if (globalObj[key]?.render && typeof globalObj[key].render === 'function') {
                     try {
                        globalObj[key].render(true);
                        return;
                     } catch (e) { console.error(e); }
                 }
             }
        }

        // Check if this was manually added
        const isManuallyAdded = button.manuallyAdded;
        if (isManuallyAdded) {
          console.warn('RNK Header | Manually added module has no open handler:', mod.title);
          ui.notifications?.warn(`${mod.title} doesn't have a UI window. Check the module's documentation for how to use it.`);
        } else {
          console.warn('RNK Header | No open handler found for module:', mod.title);
        }
        break;
      }
      case 'import':
        if (typeof app.import === 'function') {
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
      case 'run-macro':
        if (button.uuid) {
          const macro = fromUuidSync(button.uuid);
          if (macro) {
            macro.execute();
          } else {
            ui.notifications?.warn('Macro not found.');
          }
        }
        break;
      case 'open-item':
        if (button.uuid) {
          const item = fromUuidSync(button.uuid);
          if (item) {
            item.sheet.render(true);
          } else {
            ui.notifications?.warn('Item not found.');
          }
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
