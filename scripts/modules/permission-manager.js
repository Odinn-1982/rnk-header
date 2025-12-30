export class PermissionManager {
  constructor() {
    this.permissions = null;
  }

  async initialize() {
    await this.loadPermissions();
    if (!this.permissions) {
      this.permissions = this.createDefaultPermissions();
    }
  }

  createDefaultPermissions() {
    return {
      buttons: {},
      slots: {} // Store per-user slot visibility: { userId: { 0: true, 1: false, ... } }
    };
  }

  async loadPermissions() {
    try {
      const savedPermissions = await game.settings.get('rnk-header', 'permissions');
      this.permissions = savedPermissions;
    } catch (error) {
      console.warn('RNK Header | No saved permissions found, using defaults');
      this.permissions = null;
    }
  }

  async savePermissions() {
    try {
      await game.settings.set('rnk-header', 'permissions', this.permissions);
      console.log('RNK Header | Permissions saved');
    } catch (error) {
      console.error('RNK Header | Failed to save permissions:', error);
    }
  }

  setButtonPermission(buttonId, userId, canSee) {
    if (!this.permissions.buttons[buttonId]) {
      this.permissions.buttons[buttonId] = {
        mode: 'all',
        users: {}
      };
    }

    this.permissions.buttons[buttonId].users[userId] = canSee;
    
    const allUsers = game.users.filter(u => !u.isGM);
    const allowedCount = allUsers.filter(u => this.permissions.buttons[buttonId].users[u.id] !== false).length;
    
    if (allowedCount === allUsers.length) {
      this.permissions.buttons[buttonId].mode = 'all';
    } else if (allowedCount === 0) {
      this.permissions.buttons[buttonId].mode = 'gm-only';
    } else {
      this.permissions.buttons[buttonId].mode = 'selected';
    }

    this.savePermissions();
  }

  setButtonPermissionMode(buttonId, mode) {
    if (!this.permissions.buttons[buttonId]) {
      this.permissions.buttons[buttonId] = {
        mode: mode,
        users: {}
      };
    } else {
      this.permissions.buttons[buttonId].mode = mode;
    }

    if (mode === 'all') {
      this.permissions.buttons[buttonId].users = {};
    } else if (mode === 'gm-only') {
      const allUsers = game.users.filter(u => !u.isGM);
      for (const user of allUsers) {
        this.permissions.buttons[buttonId].users[user.id] = false;
      }
    }

    this.savePermissions();
  }

  canUserSee(userId, buttonId) {
    const user = game.users.get(userId);
    if (!user) return false;
    
    if (user.isGM) return true;

    const buttonPermission = this.permissions.buttons[buttonId];
    if (!buttonPermission) return true;

    switch (buttonPermission.mode) {
      case 'all':
        return true;
      case 'gm-only':
        return false;
      case 'selected':
        return buttonPermission.users[userId] !== false;
      default:
        return true;
    }
  }

  getButtonPermission(buttonId) {
    return this.permissions.buttons[buttonId] || {
      mode: 'all',
      users: {}
    };
  }

  getAllButtonPermissions() {
    return this.permissions.buttons;
  }

  getUsersForButton(buttonId) {
    const buttonPermission = this.getButtonPermission(buttonId);
    const users = [];
    
    for (const user of game.users) {
      if (user.isGM) continue;
      
      const canSee = this.canUserSee(user.id, buttonId);
      users.push({
        id: user.id,
        name: user.name,
        canSee: canSee
      });
    }

    return users;
  }

  reset() {
    this.permissions = this.createDefaultPermissions();
    this.savePermissions();
  }

  // Slot-based visibility methods
  setSlotVisibility(userId, slotIndex, isVisible) {
    if (!this.permissions.slots) {
      this.permissions.slots = {};
    }
    
    if (!this.permissions.slots[userId]) {
      this.permissions.slots[userId] = {};
    }
    
    // Store true for hidden slots (checkbox checked means visible, so we store the inverse)
    this.permissions.slots[userId][slotIndex] = !isVisible;
    this.savePermissions();
  }

  canUserSeeSlot(userId, slotIndex) {
    const user = game.users.get(userId);
    if (!user) return false;
    if (user.isGM) return true;

    if (!this.permissions.slots || !this.permissions.slots[userId]) return true; // Default to visible

    const userSlots = this.permissions.slots[userId];
    return userSlots[slotIndex] !== true; // True means hidden
  }

  getSlotVisibility() {
    return this.permissions.slots || {};
  }
}
