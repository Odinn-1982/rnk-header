export class SlotManager {
  constructor() {
    this.MAIN_SLOTS = 8;
    this.SUB_SLOTS_PER_MAIN = 5;
    this.config = null;
  }

  async initialize() {
    await this.loadConfiguration();
    if (!this.config) {
      this.config = this.createDefaultConfiguration();
    } else {
      // Migration: Ensure new slots exist if config was saved with fewer
      this.migrateConfiguration();
    }
  }

  createDefaultConfiguration() {
    const config = {
      slots: []
    };

    for (let i = 0; i < this.MAIN_SLOTS; i++) {
      config.slots.push({
        id: `main-${i}`,
        type: 'main',
        index: i,
        button: null,
        hidden: false,
        subSlots: []
      });

      for (let j = 0; j < this.SUB_SLOTS_PER_MAIN; j++) {
        config.slots[i].subSlots.push({
          id: `main-${i}-sub-${j}`,
          type: 'sub',
          parentIndex: i,
          index: j,
          button: null,
          hidden: false
        });
      }
    }

    return config;
  }

  migrateConfiguration() {
    // Ensure we have 8 slots
    while (this.config.slots.length < this.MAIN_SLOTS) {
      const i = this.config.slots.length;
      this.config.slots.push({
        id: `main-${i}`,
        type: 'main',
        index: i,
        button: null,
        hidden: false,
        subSlots: []
      });

      for (let j = 0; j < this.SUB_SLOTS_PER_MAIN; j++) {
        this.config.slots[i].subSlots.push({
          id: `main-${i}-sub-${j}`,
          type: 'sub',
          parentIndex: i,
          index: j,
          button: null,
          hidden: false
        });
      }
    }

    // Ensure all slots have hidden property
    for (const mainSlot of this.config.slots) {
      if (mainSlot.hidden === undefined) mainSlot.hidden = false;
      for (const subSlot of mainSlot.subSlots) {
        if (subSlot.hidden === undefined) subSlot.hidden = false;
      }
    }
  }

  async loadConfiguration() {
    try {
      const savedConfig = await game.settings.get('rnk-header', 'slotConfiguration');
      this.config = savedConfig;
    } catch (error) {
      console.warn('RNK Header | No saved configuration found, using defaults');
      this.config = null;
    }
  }

  async saveConfiguration() {
    try {
      await game.settings.set('rnk-header', 'slotConfiguration', this.config);
      console.log('RNK Header | Configuration saved');
    } catch (error) {
      console.error('RNK Header | Failed to save configuration:', error);
    }
  }

  getMainSlot(index) {
    if (index < 0 || index >= this.MAIN_SLOTS) return null;
    return this.config.slots[index];
  }

  getSubSlot(mainIndex, subIndex) {
    const mainSlot = this.getMainSlot(mainIndex);
    if (!mainSlot) return null;
    if (subIndex < 0 || subIndex >= this.SUB_SLOTS_PER_MAIN) return null;
    return mainSlot.subSlots[subIndex];
  }

  getSlotByButton(buttonId) {
    for (const mainSlot of this.config.slots) {
      if (mainSlot.button?.id === buttonId) {
        return mainSlot;
      }
      for (const subSlot of mainSlot.subSlots) {
        if (subSlot.button?.id === buttonId) {
          return subSlot;
        }
      }
    }
    return null;
  }

  assignButton(slotId, button) {
    const slot = this.findSlotById(slotId);
    if (!slot) {
      console.error('RNK Header | Slot not found:', slotId);
      return false;
    }

    this.unassignButton(button.id);
    slot.button = button;
    this.saveConfiguration();
    return true;
  }

  setSlotHidden(slotId, hidden) {
    const slot = this.findSlotById(slotId);
    if (slot) {
      slot.hidden = hidden;
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  unassignButton(buttonId) {
    for (const mainSlot of this.config.slots) {
      if (mainSlot.button?.id === buttonId) {
        mainSlot.button = null;
      }
      for (const subSlot of mainSlot.subSlots) {
        if (subSlot.button?.id === buttonId) {
          subSlot.button = null;
        }
      }
    }
    this.saveConfiguration();
  }

  unassignButtonInSlot(slotId) {
    const slot = this.findSlotById(slotId);
    if (slot) {
      slot.button = null;
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  findSlotById(slotId) {
    for (const mainSlot of this.config.slots) {
      if (mainSlot.id === slotId) return mainSlot;
      for (const subSlot of mainSlot.subSlots) {
        if (subSlot.id === slotId) return subSlot;
      }
    }
    return null;
  }

  getAllSlots() {
    const allSlots = [];
    for (const mainSlot of this.config.slots) {
      allSlots.push(mainSlot);
      allSlots.push(...mainSlot.subSlots);
    }
    return allSlots;
  }

  getAssignedButtons() {
    const buttons = [];
    for (const mainSlot of this.config.slots) {
      if (mainSlot.button) buttons.push(mainSlot.button);
      for (const subSlot of mainSlot.subSlots) {
        if (subSlot.button) buttons.push(subSlot.button);
      }
    }
    return buttons;
  }

  isButtonAssigned(buttonId) {
    return this.getSlotByButton(buttonId) !== null;
  }

  moveButton(buttonId, targetSlotId) {
    const button = this.getAssignedButtons().find(b => b.id === buttonId);
    if (!button) return false;
    
    return this.assignButton(targetSlotId, button);
  }

  reset() {
    this.config = this.createDefaultConfiguration();
    this.saveConfiguration();
  }
}
