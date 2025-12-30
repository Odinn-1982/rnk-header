export class RNKHeaderAPI {
  constructor(slotManager, moduleDetector) {
    this.slotManager = slotManager;
    this.moduleDetector = moduleDetector;
  }

  registerButton(buttonConfig) {
    if (!buttonConfig.id) {
      console.error('RNK Header API | Button must have an id');
      return false;
    }

    const fullConfig = {
      id: buttonConfig.id,
      label: buttonConfig.label || buttonConfig.id,
      icon: buttonConfig.icon || 'fas fa-puzzle-piece',
      action: buttonConfig.action || 'custom',
      type: 'api',
      callback: buttonConfig.callback || null
    };

    this.moduleDetector.registerButton(fullConfig);
    console.log('RNK Header API | Button registered:', fullConfig.id);
    return true;
  }

  unregisterButton(buttonId) {
    const result = this.moduleDetector.unregisterButton(buttonId);
    if (result) {
      this.slotManager.unassignButton(buttonId);
    }
    return result;
  }

  assignButtonToSlot(buttonId, slotId) {
    const button = this.moduleDetector.getButton(buttonId);
    if (!button) {
      console.error('RNK Header API | Button not found:', buttonId);
      return false;
    }

    return this.slotManager.assignButton(slotId, button);
  }

  getSlotConfiguration() {
    return this.slotManager.config;
  }

  getAllButtons() {
    return this.moduleDetector.getAllButtons();
  }

  getAssignedButtons() {
    return this.slotManager.getAssignedButtons();
  }
}
