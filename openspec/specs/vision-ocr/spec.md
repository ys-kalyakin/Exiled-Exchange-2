# vision-ocr Specification

## Purpose
Screen recognition in the main process (`main/src/vision/`): a comlink-based OCR worker (`OcrWorker`) with WASM bindings used for features that read pixels instead of item text, currently the heist gems finder.

## Requirements

### Requirement: OCR worker lifecycle
The main process SHALL run OCR in a dedicated worker (`OcrWorker.create()`) so heavy recognition does not block the main loop, and SHALL update its language options from config (`updateOptions`).

#### Scenario: Language change in settings
- **WHEN** the user changes the app language
- **THEN** the OCR worker receives updated language options for subsequent recognitions

### Requirement: Heist gems recognition
On the `ocr-text` action with target `heist-gems` (Windows only) the main process SHALL screenshot the game window, recognize heist gems in it, and send `MAIN->CLIENT::ocr-text` with press time, recognition elapsed time, and recognized paragraph texts.

#### Scenario: Heist gems hotkey
- **WHEN** the user triggers the heist-gems OCR action in game
- **THEN** the renderer receives the recognized gem paragraphs and the timings

### Requirement: Platform guard
The heist-gems OCR flow SHALL do nothing on platforms other than Windows, where the feature is supported.

#### Scenario: Trigger on Linux
- **WHEN** the action fires on Linux
- **THEN** the handler returns without taking a screenshot or sending an event
