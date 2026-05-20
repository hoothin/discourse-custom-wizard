# frozen_string_literal: true

require "digest"
require "json"

class CustomWizard::StepAutoPrefill
  def initialize(wizard:, step_template:, steps:, data:)
    @wizard = wizard
    @step_template = step_template
    @steps = steps || []
    @data = (data || {}).with_indifferent_access
    @config = (step_template["auto_prefill"] || {}).with_indifferent_access
  end

  def apply!(target_fields, prefill_state)
    return {} if @config.blank?

    target_fields = target_fields.with_indifferent_access
    state = (prefill_state || {}).with_indifferent_access
    step_state = (state[@step_template["id"]] || {}).with_indifferent_access
    previous_auto_values = (step_state["auto_values"] || {}).with_indifferent_access
    generated_values = build_values
    applied_values = {}

    generated_values.each do |field_id, generated_value|
      existing_value = target_fields[field_id]
      previous_auto_value = previous_auto_values[field_id]

      if should_apply?(existing_value, previous_auto_value, generated_value)
        target_fields[field_id] = generated_value
        applied_values[field_id] = generated_value
      end
    end

    state[@step_template["id"]] = {
      "depends_hash" => depends_hash,
      "auto_values" => current_auto_values(target_fields, generated_values),
    }

    { fields: target_fields, prefill_state: state, applied_values: applied_values }
  end

  private

  def should_apply?(existing_value, previous_auto_value, generated_value)
    blank_value?(existing_value) || existing_value == previous_auto_value ||
      existing_value == generated_value
  end

  def blank_value?(value)
    value.nil? || (value.respond_to?(:empty?) && value.empty?)
  end

  def current_auto_values(target_fields, generated_values)
    generated_values.each_with_object({}) do |(field_id, generated_value), result|
      result[field_id] = generated_value if target_fields[field_id] == generated_value
    end
  end

  def build_values
    values = {}
    values.merge!(render_field_values(@config["fields"] || {}))

    if (rule = matching_rule)
      values.merge!(render_field_values(rule["fields"] || {}, rule))
    end

    values
  end

  def matching_rule
    (@config["rules"] || []).find do |rule|
      (rule["when"] || {}).all? do |field_id, expected_value|
        @data[field_id].to_s == expected_value.to_s
      end
    end
  end

  def render_field_values(fields, rule = {})
    fields.each_with_object({}) do |(field_id, value), result|
      result[field_id] = render_value(value, rule)
    end
  end

  def render_value(value, rule)
    return value unless value.is_a?(String)

    context = template_context(rule)
    value.gsub(/\{([a-zA-Z0-9_]+)\}/) do
      context[$1] || ""
    end
  end

  def template_context(rule)
    major_key = @data["listing_major_category"].to_s
    sub_field_id = "#{major_key}_subcategory"
    sub_key = @data[sub_field_id].to_s
    major_label = option_label("listing_major_category", major_key)
    fallback_sub_label = rule["fallback_sub_label"].presence || major_label.presence || "分類資訊"
    sub_label = option_label(sub_field_id, sub_key).presence || fallback_sub_label
    location_text = build_location_text

    {
      "major_label" => major_label,
      "sub_label" => sub_label,
      "location_text" => location_text,
      "location_or_japan" => location_text.presence || "日本",
    }
  end

  def build_location_text
    raw_location = @data["step_1_field_3"]

    if raw_location.is_a?(Hash)
      state = raw_location["state"].to_s.strip
      city = raw_location["city"].to_s.strip
      area_text = [state, city].select(&:present?).join(" ")
      return area_text if area_text.present?

      return raw_location["address"].to_s.strip if raw_location["address"].present?
    end

    raw_location.to_s.strip
  end

  def option_label(field_id, option_key)
    return "" if option_key.blank?

    field = field_by_id[field_id]
    return "" if field.blank?

    association = (field["content"] || []).find { |item| item["type"] == "association" }
    pair = (association&.[]("pairs") || []).find { |item| item["key"].to_s == option_key.to_s }
    pair ? pair["value"].to_s : ""
  end

  def field_by_id
    @field_by_id ||=
      @steps.each_with_object({}) do |step, result|
        (step["fields"] || []).each do |field|
          result[field["id"]] = field
        end
      end
  end

  def depends_hash
    values =
      (@config["depends_on"] || []).each_with_object({}) do |field_id, result|
        result[field_id] = @data[field_id]
      end

    Digest::SHA256.hexdigest(JSON.generate(values.sort.to_h))
  end
end
