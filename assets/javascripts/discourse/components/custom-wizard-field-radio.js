import Component from "@ember/component";
import CustomWizard, {
  updateCachedWizard,
} from "discourse/plugins/discourse-custom-wizard/discourse/models/custom-wizard";

export default Component.extend({
  autoAdvancing: false,

  keyPress(e) {
    e.stopPropagation();
  },

  _singleRadioStep() {
    const fields = this.step?.fields || [];
    return (
      fields.length === 1 &&
      fields[0]?.id === this.field?.id &&
      fields[0]?.type === "radio"
    );
  },

  _advanceIfNeeded() {
    if (!this._singleRadioStep() || this.autoAdvancing) {
      return;
    }

    this.step.validate();
    if (!this.step.get("valid")) {
      return;
    }

    this.set("autoAdvancing", true);

    this.step
      .save()
      .then((response) => {
        updateCachedWizard(CustomWizard.build(response["wizard"]));

        if (response["final"]) {
          CustomWizard.finished(response);
        } else if (this.goNext) {
          this.goNext(response);
        }
      })
      .finally(() => this.set("autoAdvancing", false));
  },

  actions: {
    onChangeValue(value) {
      this.set("field.value", value);
      this._advanceIfNeeded();
    },
  },
});
