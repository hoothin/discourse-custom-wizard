import { action } from "@ember/object";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { withPluginApi } from "discourse/lib/plugin-api";
import DiscourseURL from "discourse/lib/url";
import getUrl from "discourse-common/lib/get-url";
import CustomWizardTextareaEditor from "../components/custom-wizard-textarea-editor";

/**
 * 构建分类对应的向导跳转地址。
 *
 * @param {object | null | undefined} category 分类对象
 * @returns {string | null} 配置了向导则返回地址，否则返回 null
 */
export function buildCreateTopicWizardUrl(category) {
  const createTopicWizard = category?.custom_fields?.create_topic_wizard;

  if (!createTopicWizard) {
    return null;
  }

  const categoryId = category?.id;

  return categoryId
    ? `/w/${createTopicWizard}?category_id=${categoryId}`
    : `/w/${createTopicWizard}`;
}

/**
 * 若分类启用了发帖向导，则跳转到对应 wizard。
 *
 * @param {object | null | undefined} category 分类对象
 * @returns {boolean} 是否已处理跳转
 */
function redirectToCreateTopicWizard(category) {
  const wizardUrl = buildCreateTopicWizardUrl(category);

  if (!wizardUrl) {
    return false;
  }

  window.location.href = getUrl(wizardUrl);
  return true;
}

export default {
  name: "custom-wizard-edits",
  initialize(container) {
    const siteSettings = container.lookup("service:site-settings");

    if (!siteSettings.custom_wizard_enabled) {
      return;
    }

    const existing = DiscourseURL.routeTo;
    DiscourseURL.routeTo = function (path, opts) {
      if (path && path.indexOf("/w/") > -1) {
        return (window.location = path);
      }
      return existing.apply(this, [path, opts]);
    };

    withPluginApi("0.8.36", (api) => {
      api.modifyClass(
        "component:d-navigation",
        (Superclass) =>
          class extends Superclass {
            @action
            clickCreateTopicButton() {
              const targetCategory =
                this.createTopicTargetCategory || this.category;

              if (!redirectToCreateTopicWizard(targetCategory)) {
                super.clickCreateTopicButton();
              }
            }
          }
      );

      if (container.factoryFor("component:sidebar-new-topic-button")) {
        api.modifyClass(
          "component:sidebar-new-topic-button",
          (Superclass) =>
            class extends Superclass {
              @action
              createNewTopic() {
                const targetCategory =
                  this.createTopicTargetCategory ||
                  this.args?.category ||
                  this.category;

                if (!redirectToCreateTopicWizard(targetCategory)) {
                  super.createNewTopic(...arguments);
                }
              }
            }
        );
      }

      api.modifyClass("component:d-editor", {
        pluginId: "custom-wizard",

        init() {
          this._super(...arguments);
          this.editorComponent = CustomWizardTextareaEditor;
        },

        didInsertElement() {
          this._super(...arguments);

          if (this.wizardComposer) {
            this.appEvents.on(
              `wizard-editor:insert-text`,
              this,
              "_wizardInsertText"
            );
            this.appEvents.on(
              "wizard-editor:replace-text",
              this,
              "_wizardReplaceText"
            );
          }
        },

        _wizardInsertText(text, options) {
          if (
            this.session.wizardEventFieldId === this.fieldId &&
            this.element
          ) {
            this.textManipulation.insertText(text, options);
          }
        },

        _wizardReplaceText(oldVal, newVal, opts = {}) {
          if (this.session.wizardEventFieldId === this.fieldId) {
            this.textManipulation.replaceText(oldVal, newVal, opts);
          }
        },
      });

      api.modifyClass("component:category-chooser", {
        pluginId: "custom-wizard",

        categoriesByScope(options = {}) {
          let categories = this._super(options);
          const currentUser = this.currentUser;
          if (!currentUser?.staff) {
            categories = categories.filter((category) => {
              return !category.custom_fields?.create_topic_wizard;
            });
          }
          return categories;
        },
      });

      api.addAdminSidebarSectionLink("plugins", {
        name: "admin_wizards",
        label: "admin.wizard.nav_label",
        route: "adminWizardsWizard",
        icon: "hat-wizard",
      });

      if (api.getCurrentUser()?.admin) {
        api.modifyClass("model:admin-user", {
          pluginId: "custom-wizard",

          clearWizardRedirect(user) {
            return ajax(`/admin/users/${user.id}/wizards/clear_redirect`, {
              type: "PUT",
            })
              .then(() => {
                user.setProperties({
                  redirect_to_wizard: null,
                });
              })
              .catch(popupAjaxError);
          },
        });
      }
    });
  },
};
