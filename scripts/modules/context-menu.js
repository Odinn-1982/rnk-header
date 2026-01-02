export class ContextMenuHandler {
  constructor(slotManager) {
    this.slotManager = slotManager;
    this.currentMenu = null;
    this.setupGlobalListener();
  }

  setupGlobalListener() {
    $(document).on('click', (event) => {
      if (this.currentMenu && !$(event.target).closest('.rnk-context-menu').length) {
        this.hide();
      }
    });
  }

  show(button, event) {
    this.hide();

    const menu = this.createMenu(button);
    this.currentMenu = menu;

    $('body').append(menu);

    const x = Math.min(event.clientX, window.innerWidth - menu.outerWidth() - 10);
    const y = Math.min(event.clientY, window.innerHeight - menu.outerHeight() - 10);

    menu.css({
      left: `${x}px`,
      top: `${y}px`
    });
  }

  hide() {
    if (this.currentMenu) {
      this.currentMenu.remove();
      this.currentMenu = null;
    }
  }

  createMenu(button) {
    const menu = $('<div class="rnk-context-menu"></div>');

    const currentSlot = this.slotManager.getSlotByButton(button.id);
    
    if (currentSlot) {
      const unassignItem = this.createMenuItem(
        'Unassign',
        'fas fa-times',
        () => {
          this.slotManager.unassignButton(button.id);
          this.hide();
          ui.notifications.info(`${button.label} unassigned`);
        }
      );
      menu.append(unassignItem);
      menu.append('<div class="rnk-context-menu-divider"></div>');
    }

    const slotsHeader = $('<div class="rnk-context-menu-item" style="font-weight: bold; cursor: default;">Move to Slot</div>');
    menu.append(slotsHeader);

    // If we know the current slot, only show that main slot and its sub-slots to keep the list tight.
    const mainIndex = currentSlot?.type === 'sub' ? currentSlot.parentIndex : currentSlot?.index;

    const renderTargets = [];
    if (Number.isInteger(mainIndex)) {
      const mainSlot = this.slotManager.getMainSlot(mainIndex);
      if (mainSlot) {
        renderTargets.push({ mainSlot, subSlots: mainSlot.subSlots, mainNumber: mainIndex + 1 });
      }
    } else {
      // Fallback: show all slots if we cannot determine the current slot (should be rare)
      for (let i = 0; i < this.slotManager.MAIN_SLOTS; i++) {
        renderTargets.push({
          mainSlot: this.slotManager.getMainSlot(i),
          subSlots: this.slotManager.getMainSlot(i)?.subSlots || [],
          mainNumber: i + 1
        });
      }
    }

    for (const target of renderTargets) {
      if (!target.mainSlot) continue;

      const mainSlotItem = this.createMenuItem(
        `Main Slot ${target.mainNumber}`,
        target.mainSlot.button ? 'fas fa-check' : 'fas fa-square',
        () => {
          this.slotManager.assignButton(target.mainSlot.id, button);
          this.hide();
          ui.notifications.info(`${button.label} assigned to Main Slot ${target.mainNumber}`);
        }
      );
      menu.append(mainSlotItem);

      for (let j = 0; j < target.subSlots.length; j++) {
        const subSlot = target.subSlots[j];
        const subSlotItem = this.createMenuItem(
          `  Sub Slot ${target.mainNumber}.${j + 1}`,
          subSlot.button ? 'fas fa-check' : 'fas fa-square',
          () => {
            this.slotManager.assignButton(subSlot.id, button);
            this.hide();
            ui.notifications.info(`${button.label} assigned to Sub Slot ${target.mainNumber}.${j + 1}`);
          }
        );
        menu.append(subSlotItem);
      }
    }

    return menu;
  }

  createMenuItem(label, icon, callback) {
    const item = $(`
      <div class="rnk-context-menu-item">
        <i class="${icon}"></i>
        <span>${label}</span>
      </div>
    `);

    item.on('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      callback();
    });

    return item;
  }
}
