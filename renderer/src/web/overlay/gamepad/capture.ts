/**
 * Fork: gamepad support — renderer-side combo-capture state. While a
 * "press the combo" input in the settings window is recording, gamepad
 * buttons are committed to the binding instead of driving navigation
 * (keyboard intents stay live). Main has its own capture flag that stops
 * filtering combo buttons; this one only mutes the intent layer.
 */
let captureArmed = false;

export function setGamepadCaptureArmed(armed: boolean) {
  captureArmed = armed;
}

export function isGamepadCaptureArmed() {
  return captureArmed;
}
