/* eslint-disable */
export const AccessMode = (acs) => {
  if (acs) {
    this.given = typeof acs.given === 'number' ? acs.given : AccessMode.decode(acs.given);
    this.want = typeof acs.want === 'number' ? acs.want : AccessMode.decode(acs.want);
    this.mode = acs.mode ? (typeof acs.mode === 'number' ? acs.mode : AccessMode.decode(acs.mode)) :
      (this.given & this.want);
  }
};
AccessMode._NONE = 0x00;
AccessMode._JOIN = 0x01;
AccessMode._READ = 0x02;
AccessMode._WRITE = 0x04;
AccessMode._PRES = 0x08;
AccessMode._APPROVE = 0x10;
AccessMode._SHARE = 0x20;
AccessMode._DELETE = 0x40;
AccessMode._OWNER = 0x80;

AccessMode._BITMASK = AccessMode._JOIN | AccessMode._READ | AccessMode._WRITE | AccessMode._PRES |
  AccessMode._APPROVE | AccessMode._SHARE | AccessMode._DELETE | AccessMode._OWNER;
AccessMode._INVALID = 0x100000;
AccessMode.decode = (str) => {
  if (!str) {
    return null;
  } else if (typeof str === 'number') {
    return str & AccessMode._BITMASK;
  } else if (str === 'N' || str === 'n') {
    return AccessMode._NONE;
  }

  const bitmask = {
    J: AccessMode._JOIN,
    R: AccessMode._READ,
    W: AccessMode._WRITE,
    P: AccessMode._PRES,
    A: AccessMode._APPROVE,
    S: AccessMode._SHARE,
    D: AccessMode._DELETE,
    O: AccessMode._OWNER,
  };

  let m0 = AccessMode._NONE;

  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i).toUpperCase();
    const bit = bitmask[c];
    if (!bit) {
      continue;
    }
    m0 |= bit;
  }
  return m0;
};
AccessMode.encode = (val) => {
  if (val === null || val === AccessMode._INVALID) {
    return null;
  } else if (val === AccessMode._NONE) {
    return 'N';
  }

  const bitmask = ['J', 'R', 'W', 'P', 'A', 'S', 'D', 'O'];
  let res = "";
  for (let i = 0; i < bitmask.length; i++) {
    if ((val & (1 << i)) !== 0) {
      res += bitmask[i];
    }
  }
  return res;
};
AccessMode.update = (val, upd) => {
  if (!upd || typeof upd !== 'string') {
    return val;
  }

  let action = upd.charAt(0);
  let val0;
  if (action === '+' || action === '-') {
    val0 = val;
    const parts = upd.split(/([-+])/);
    for (let i = 1; i < parts.length - 1; i += 2) {
      action = parts[i];
      const m0 = AccessMode.decode(parts[i + 1]);
      if (m0 === AccessMode._INVALID) {
        return val;
      }
      if (m0 === null) {
        continue;
      }
      if (action === '+') {
        val0 |= m0;
      } else if (action === '-') {
        val0 &= ~m0;
      }
    }
    val = val0;
  } else {
    // The string is an explicit new value 'ABC' rather than delta.
    val0 = AccessMode.decode(upd);
    if (val0 !== AccessMode._INVALID) {
      val = val0;
    }
  }

  return val;
};

AccessMode.prototype = {
  setMode(m) { this.mode = AccessMode.decode(m); return this; },
  updateMode(u) { this.mode = AccessMode.update(this.mode, u); return this; },
  getMode() { return AccessMode.encode(this.mode); },

  setGiven(g) { this.given = AccessMode.decode(g); return this; },
  updateGiven(u) { this.given = AccessMode.update(this.given, u); return this; },
  getGiven() { return AccessMode.encode(this.given); },

  setWant(w) { this.want = AccessMode.decode(w); return this; },
  updateWant(u) { this.want = AccessMode.update(this.want, u); return this; },
  getWant() { return AccessMode.encode(this.want); },

  updateAll(val) {
    if (val) {
      this.updateGiven(val.given);
      this.updateWant(val.want);
      this.mode = this.given & this.want;
    }
    return this;
  },

  isOwner() { return ((this.mode & AccessMode._OWNER) !== 0); },
  isMuted() { return ((this.mode & AccessMode._PRES) === 0); },
  isPresencer() { return ((this.mode & AccessMode._PRES) !== 0); },
  isJoiner() { return ((this.mode & AccessMode._JOIN) !== 0); },
  isReader() { return ((this.mode & AccessMode._READ) !== 0); },
  isWriter() { return ((this.mode & AccessMode._WRITE) !== 0); },
  isApprover() { return ((this.mode & AccessMode._APPROVE) !== 0); },
  isAdmin() { return this.isOwner() || this.isApprover(); },
  isSharer() { return ((this.mode & AccessMode._SHARE) !== 0); },
  isDeleter() { return ((this.mode & AccessMode._DELETE) !== 0); },
};
