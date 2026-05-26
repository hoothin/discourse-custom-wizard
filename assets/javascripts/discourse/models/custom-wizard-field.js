import EmberObject from "@ember/object";
import I18n from "I18n";
import discourseComputed from "discourse-common/utils/decorators";
import { translationOrText } from "discourse/plugins/discourse-custom-wizard/discourse/lib/wizard";
import ValidState from "discourse/plugins/discourse-custom-wizard/discourse/mixins/valid-state";

const StandardFieldValidation = [
  "text",
  "number",
  "textarea",
  "dropdown",
  "radio",
  "tag",
  "image",
  "user_selector",
  "text_only",
  "composer",
  "category",
  "topic",
  "group",
  "date",
  "time",
  "date_time",
];

export default EmberObject.extend(ValidState, {
  id: null,
  type: null,
  value: null,
  required: null,

  @discourseComputed("wizardId", "stepId", "id")
  i18nKey(wizardId, stepId, id) {
    return `${wizardId}.${stepId}.${id}`;
  },

  @discourseComputed("i18nKey", "label")
  translatedLabel(i18nKey, label) {
    return translationOrText(`${i18nKey}.label`, label);
  },

  @discourseComputed("i18nKey", "placeholder")
  translatedPlaceholder(i18nKey, placeholder) {
    return translationOrText(`${i18nKey}.placeholder`, placeholder);
  },

  @discourseComputed("i18nKey", "description")
  translatedDescription(i18nKey, description) {
    return translationOrText(`${i18nKey}.description`, description);
  },

  plainText(value) {
    const element = document.createElement("div");
    element.innerHTML = value || "";
    return element.textContent || element.innerText || value || "";
  },

  requiredMessage() {
    const label = this.plainText(this.get("translatedLabel") || this.id);
    return I18n.t("wizard.field_required", { label });
  },

  check() {
    if (this.customCheck) {
      return this.customCheck();
    }

    let valid = this.valid;

    if (!this.required) {
      this.setValid(true);
      return true;
    }

    const val = this.get("value");
    const type = this.get("type");

    if (type === "checkbox") {
      valid = val;
    } else if (type === "upload") {
      valid = val && val.id > 0;
    } else if (StandardFieldValidation.indexOf(type) > -1) {
      valid = val && val.toString().length > 0;
    } else if (type === "url") {
      valid = true;
    }

    const isValid = Boolean(valid);
    this.setValid(isValid, isValid ? null : this.requiredMessage());

    return isValid;
  },
});
