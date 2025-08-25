# Recording, Realtime ASR/MT/TTS & Session Archiving — VerblizrRN

## 1. End-to-End Process Overview

### Step 1 — Client Capture & Streaming

- **Hook Used:** `useTurnInterpreter()` (custom React Native hook)
- **Audio Capture:** `react-native-audio-record` records microphone at 16 kHz, mono, PCM16LE.
- **Streaming Protocol:** Base64 PCM chunks wrapped in JSON and sent over WebSocket to backend.
- **Control Messages:** `hello`, `start`, `audio`, `pause`, `resume`, `stop`.

### Step 2 — Backend WebSocket Server

- **Technology:** Node.js + `ws`
- **Session Handling:**

  - On `hello`: create session folder, store mode/fromLang/toLang.
  - On `start`: set sample rate & prepare buffers.
  - On `audio`: append PCM chunk to VAD buffer and full-session PCM file.
  - VAD detects utterance endpoint → triggers ASR → MT → TTS.

### Step 3 — ASR (Speech-to-Text)

- **Model:** Whisper (`whisper-1` via OpenAI API)
- **Format:** PCM is wrapped into WAV and sent to Whisper.
- **Output:** Transcript text, language ID (from text), confidence.

### Step 4 — LID (Language Identification)

- Based on detected script (Arabic characters → Urdu, else English).
- In **auto-lid** mode: determines translation direction automatically.
- In **alternate** mode: flips translation direction each utterance.

### Step 5 — MT (Machine Translation)

- **Model:** `gpt-4o-mini` (OpenAI)
- **Output:** Translated text in target language.

### Step 6 — TTS (Text-to-Speech)

- **Service:** `google-tts-api` (MP3 output)
- **Output:** MP3 audio base64 → sent to client.
- Client plays via `react-native-sound`.

### Step 7 — Session Archiving (Optional but Recommended)

- **Audio:**

  - `session.pcm` accumulates all raw audio.
  - Each utterance saved as `u_<id>.wav` (source speech).
  - TTS saved as `u_<id>.mp3`.
  - On session end: wrap `session.pcm` into `session.wav`.

- **Transcript:**

  - JSON log with utterance details, timestamps, durations.
  - Optional `.txt` export for human readability.

### Step 8 — Distribution

- **Email:** Zip folder & send as attachment (Nodemailer).
- **Cloud Upload:** S3/GCS + signed link.
- **Download Endpoint:** Serve `session.zip` over HTTP.

---

## 2. Recording & Storage Details

### Where Recorded Audio is Saved

- **Client:** Not stored locally.
- **Backend:** Stored in `sessions/<sessionId>/` when archiving is enabled.

### Audio Format & Flow

- Transport: Base64 PCM16LE 16 kHz mono → JSON over WS.
- ASR Temp File: WAV 16-bit PCM 16 kHz mono.
- TTS Output: MP3 base64.

### Session Folder Structure

```
sessions/<sessionId>/
  ├── session.wav           # Full session audio
  ├── session.pcm           # Raw PCM before WAV header
  ├── transcript.json       # Machine-readable transcript
  ├── u_<id>.wav            # Per-utterance original audio
  ├── u_<id>.mp3            # Per-utterance TTS output
  └── transcript.txt        # (Optional) Human-readable transcript
```

### Transcript JSON Structure

```json
{
  "sessionId": "s_2025-08-16T00-12-34Z",
  "mode": "alternate|auto-lid",
  "fromLang": "en",
  "toLang": "ur",
  "startedAt": "2025-08-16T00:12:34Z",
  "endedAt": "2025-08-16T00:20:02Z",
  "utterances": [
    {
      "id": "u_abc123",
      "asr": "Hello, how are you?",
      "lid": "en",
      "mt": "آپ کیسے ہیں؟",
      "ttsFile": "u_abc123.mp3",
      "audioFile": "u_abc123.wav",
      "timestamps": { "startedAt": "...", "endedAt": "..." }
    }
  ],
  "durations": { "speechMs": 12345, "totalMs": 45678 }
}
```

---

## 3. Backend Archiving Steps

1. On `hello`: Create session folder, initialize transcript object.
2. On `audio`: Append chunk to `session.pcm`.
3. On utterance endpoint: Save WAV, run ASR, MT, TTS, save MP3, log to transcript.
4. On `stop`/close: Wrap `session.pcm` into `session.wav`, save transcript JSON.

---

## 4. Client Changes

- Include `sessionId` in `hello`:

```ts
const sessionId = 's_' + Date.now().toString(36);
ws.send(
  JSON.stringify({
    type: 'hello',
    session: { mode, fromLang, toLang, sessionId },
  }),
);
```

- Hook handles mic start/stop, pause/resume, and playback.

---

## 5. QA Checklist

- `session.wav` contains full conversation.
- `transcript.json` matches actual utterances.
- Per-utterance `.wav` and `.mp3` files exist.
- Email/upload contains all files.

---

**Tip:** To share sessions, zip them:

```bash
cd sessions
zip -r <sessionId>.zip <sessionId>
```

---

# End-to-End Plan — How We’ll Do Everything

This section summarizes the full workflow we defined earlier, step by step, so you can follow it from a clean checkout to live streaming with archiving.

## A) Minimal WebSocket Protocol

**Transport:** JSON messages. Audio is base64 PCM16LE @16kHz mono embedded in JSON for RN simplicity.

**Client → Server**

```jsonc
{ "type": "hello", "session": { "mode": "alternate" | "auto-lid", "fromLang": "en" | "ur", "toLang": "en" | "ur", "sessionId": "s_..." } }
{ "type": "start", "sampleRate": 16000 }
{ "type": "audio", "seq": 1, "pcm16le": "<base64>" }
{ "type": "pause" }
{ "type": "resume" }
{ "type": "stop" }
```

**Server → Client**

```jsonc
{ "type": "ready" }
{ "type": "partial_asr", "text": "...", "confidence": 0.87 }
{ "type": "final_asr", "utteranceId": "u_123", "text": "...", "lid": "en" | "ur", "confidence": 0.92 }
{ "type": "mt", "utteranceId": "u_123", "text": "...", "target": "ur" }
{ "type": "tts", "utteranceId": "u_123", "mime": "audio/mpeg", "audio": "<base64 mp3>" }
{ "type": "error", "message": "..." }
```

## B) Client Hook — `useTurnInterpreter`

- Replaces your stub; handles:

  - Mic capture via `react-native-audio-record` (16kHz mono PCM16LE)
  - WebSocket connection & batching base64 audio
  - Pause/Resume (stops/starts recorder & notifies server)
  - Receives ASR/MT/TTS messages, plays MP3 with `react-native-sound`
  - Status updates: `listening → transcribing → translating → speaking`

- **No UI changes required**; wire to your existing mic/pause/resume/stop handlers.

**Install (client)** — run in specified folders:

```bash
# ~/verblizerRN
npm i react-native-audio-record react-native-sound react-native-fs

# iOS deps
cd ios && npx pod-install
```

**iOS**: add `NSMicrophoneUsageDescription` to `Info.plist`.

**Android**: add `RECORD_AUDIO` and `INTERNET` permissions to `AndroidManifest.xml`.

**WS URLs**

- iOS Simulator → `ws://localhost:8082`
- Android Emulator → `ws://10.0.2.2:8082`
- Real device → `ws://<your-mac-ip>:8082`

## C) Minimal Backend — `ws-interpreter.js`

- **Stack:** Node.js + `ws`, OpenAI Whisper (ASR), OpenAI (MT), `google-tts-api` (TTS), simple energy‑based VAD.
- **Install** (\~/verblizr-backend):

```bash
npm i ws openai google-tts-api node-fetch@2 dotenv
node ws-interpreter.js
```

- **.env**

```env
WS_PORT=8082
OPENAI_API_KEY=sk-...
```

- **VAD:** 20ms frames, mean absolute amplitude threshold; hangover 400ms.
- **LID:** Derived from ASR text (Urdu if Arabic-script detected, else English).

## D) Archiving (Audio + Transcript)

- Session directory: `sessions/<sessionId>/`
- Append raw PCM to `session.pcm` during capture; on stop, wrap to `session.wav`.
- Save per-utterance `u_<id>.wav` (source) and `u_<id>.mp3` (TTS).
- Build `transcript.json` incrementally; write on stop/close.
- Optional: generate `transcript.txt` and `session.zip` for emailing.

## E) Dashboard Wiring

- Start/Stop mic button → `interpreter.start()` / confirmation → `interpreter.stop()`.
- Pause/Resume → `interpreter.pause()` / `interpreter.resume()`.
- Status line binds to `interpreter.status`.
- Recent Sessions: push entries from `onFinal({ asr, mt })`.
- Health pills (permissions, network, speed) remain unchanged.

## F) Test Flow (Manual QA)

1. Launch backend (`node ws-interpreter.js`).
2. Run app; choose **Alternate** mode.
3. Start mic; speak short sentence in **English**.
4. Expect cycle: `final_asr (en) → mt (ur) → tts (mp3)` and playback.
5. Speak Urdu; expect reverse direction in **Auto‑LID** or flipped in **Alternate**.
6. Tap **Pause**; confirm no ASR/MT/TTS while paused. **Resume** and continue.
7. **Stop**; verify `sessions/<sessionId>/` contains `session.wav`, utterance files, and `transcript.json`.

## G) Error Handling & Recovery

- **Socket drops:** hook transitions to `idle`; pressing mic **Start** reconnects.
- **ASR/MT/TTS errors:** server emits `{type:"error"}`; client sets status `error` (surface to UI if desired).
- **Permissions denied:** your existing Mic pill opens Settings; start will fail early.

## H) Security & Privacy Notes

- Do **not** log raw audio or full transcripts in production logs.
- Protect `.env` and API keys; rate‑limit and auth your WS endpoint if exposed.
- Consider encrypting session archives at rest and auto‑expiring them.

## I) Performance Tips

- Lower base64 batching interval (e.g., 40–60ms) for snappier ASR; trade off CPU/WS overhead.
- Replace JSON‑base64 with binary WS frames for lower overhead when ready.
- Swap `google-tts-api` with a robust TTS (Amazon Polly, ElevenLabs) for better Urdu prosody.

## J) Folder Layout (Suggested)

```
~/verblizerRN/                 # RN app (client)
  src/hooks/useTurnInterpreter.ts
  src/screens/DashboardScreen.tsx

~/verblizr-backend/            # Node backend
  ws-interpreter.js
  sessions/
  .env
```

## K) Commands Quick Reference

```bash
# Backend
cd ~/verblizr-backend && node ws-interpreter.js

# Client deps
cd ~/verblizerRN && npm i react-native-audio-record react-native-sound react-native-fs
cd ~/verblizerRN/ios && npx pod-install

# Archive zip (optional)
cd ~/verblizr-backend/sessions && zip -r <sessionId>.zip <sessionId>
```
