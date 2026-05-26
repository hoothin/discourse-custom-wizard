# frozen_string_literal: true
class CustomWizard::ActionResult
  attr_accessor :success, :handler, :output, :submission, :error_message

  def initialize
    @success = false
  end

  def success?
    @success
  end

  def failed?
    !success
  end
end
