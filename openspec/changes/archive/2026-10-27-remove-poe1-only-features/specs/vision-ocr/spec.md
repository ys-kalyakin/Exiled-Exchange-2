# Spec Delta: vision-ocr (capability removed)

## REMOVED Requirements

### Requirement: OCR worker lifecycle
The main process SHALL run OCR in a dedicated worker (`OcrWorker.create()`) so heavy recognition does not block the main loop, and SHALL update its language options from config (`updateOptions`).

#### Scenario: Language change in settings
- **WHEN** the user changes the app language
- **THEN** the OCR worker receives updated language options for subsequent recognitions

**Reason**: The only consumer of the OCR subsystem was the Heist gems finder, a Path of Exile 1 feature. With Heist removed from the product scope there is no screen-recognition consumer left, so the whole `main/src/vision/` subsystem is deleted rather than maintained as dead code.

**Migration**: No replacement. The OCR worker, its WASM bindings, and the runtime assets (Tesseract/OpenCV bundles, `heist-lock.bmp`) are removed; shortcuts bound to the `ocr-text` action no longer dispatch anything, and users should unbind the stale hotkey in settings.

### Requirement: Heist gems recognition
On the `ocr-text` action with target `heist-gems` (Windows only) the main process SHALL screenshot the game window, recognize heist gems in it, and send `MAIN->CLIENT::ocr-text` with press time, recognition elapsed time, and recognized paragraph texts.

#### Scenario: Heist gems hotkey
- **WHEN** the user triggers the heist-gems OCR action in game
- **THEN** the renderer receives the recognized gem paragraphs and the timings

**Reason**: Heist does not exist in Path of Exile 2; recognizing heist gems on screen has no target audience in this app.

**Migration**: The feature is removed entirely. The item search widget no longer listens for `MAIN->CLIENT::ocr-text` events and loses its heist-gem fuzzy-search path; its starred-item and search-by-name behavior is unchanged.

### Requirement: Platform guard
The heist-gems OCR flow SHALL do nothing on platforms other than Windows, where the feature is supported.

#### Scenario: Trigger on Linux
- **WHEN** the action fires on Linux
- **THEN** the handler returns without taking a screenshot or sending an event

**Reason**: Removed together with the feature it guarded; with no OCR flow there is no platform-specific behavior left.

**Migration**: None. The removal simplifies the shortcut handler; Linux behavior is unchanged (the flow already did nothing there).
