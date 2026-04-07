import { module, test } from "qunit";
import { buildCreateTopicWizardUrl } from "discourse/plugins/discourse-custom-wizard/discourse/initializers/custom-wizard-edits";

module("discourse-custom-wizard | initializer | custom-wizard-edits", function () {
  test("buildCreateTopicWizardUrl returns null when category has no wizard", function (assert) {
    assert.strictEqual(buildCreateTopicWizardUrl(null), null);
    assert.strictEqual(
      buildCreateTopicWizardUrl({
        id: 12,
        custom_fields: {},
      }),
      null
    );
  });

  test("buildCreateTopicWizardUrl includes category id when available", function (assert) {
    assert.strictEqual(
      buildCreateTopicWizardUrl({
        id: 42,
        custom_fields: {
          create_topic_wizard: "market-listing",
        },
      }),
      "/w/market-listing?category_id=42"
    );
  });

  test("buildCreateTopicWizardUrl falls back to wizard root when category id is unavailable", function (assert) {
    assert.strictEqual(
      buildCreateTopicWizardUrl({
        custom_fields: {
          create_topic_wizard: "market-listing",
        },
      }),
      "/w/market-listing"
    );
  });
});
