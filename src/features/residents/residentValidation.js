const CONTACT_PATTERN = /^[0-9+()\s.-]+$/;
const MAX_LENGTHS = {
  name: 140,
  contactNumber: 30,
  address: 255,
  group: 140,
  notes: 1000
};

export function validateResidentInput(input = {}) {
  const value = {
    name: clean(input.name || input.fullName),
    contactNumber: clean(input.contactNumber || input.contactNo),
    address: clean(input.address),
    group: clean(input.group || input.organization || input.groupName),
    notes: clean(input.notes)
  };
  const errors = {};

  if (!value.name) {
    errors.name = "Name is required.";
  } else if (value.name.length > MAX_LENGTHS.name) {
    errors.name = "Name must be 140 characters or fewer.";
  }

  if (!value.contactNumber) {
    errors.contactNumber = "Contact number is required.";
  } else if (value.contactNumber.length > MAX_LENGTHS.contactNumber) {
    errors.contactNumber = "Contact number must be 30 characters or fewer.";
  } else if (!CONTACT_PATTERN.test(value.contactNumber)) {
    errors.contactNumber = "Contact number must use digits or common phone symbols only.";
  }

  if (!value.address) {
    errors.address = "Address is required.";
  } else if (value.address.length > MAX_LENGTHS.address) {
    errors.address = "Address must be 255 characters or fewer.";
  }

  if (value.group.length > MAX_LENGTHS.group) {
    errors.group = "Group or organization must be 140 characters or fewer.";
  }

  if (value.notes.length > MAX_LENGTHS.notes) {
    errors.notes = "Notes must be 1000 characters or fewer.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value
  };
}

function clean(value) {
  return String(value ?? "").trim();
}
