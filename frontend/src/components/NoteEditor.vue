<script>
import { notify } from "@kyvg/vue3-notification";
import { FontAwesomeIcon } from "../icon.ts";
import { baseURL } from "../app.js";

const alphaTab = await import("@coderline/alphatab");

export default {
    name: "NoteEditor",
    components: { FontAwesomeIcon },
    props: {
        api: {
            type: Object,
            required: true,
        },
        tabID: {
            type: [String, Number],
            required: true,
        },
    },
    emits: ["close", "saved"],
    data() {
        return {
            editMode: false,
            selectedNote: null,
            selectedBeat: null,
            selectedBar: null,
            selectedStaff: null,
            numStrings: 6,
            stringTunings: [],
            trackName: "",
            // Preserved original note style for undo highlight
            _originalNoteStyle: null,
            // Drag state
            isDragging: false,
            dragStartY: 0,
            dragStartFret: 0,
            // Duration options (value = numeric enum)
            durationOptions: [
                { value: 1, labelKey: "editor.durationWhole" },
                { value: 2, labelKey: "editor.durationHalf" },
                { value: 4, labelKey: "editor.durationQuarter" },
                { value: 8, labelKey: "editor.durationEighth" },
                { value: 16, labelKey: "editor.duration16th" },
                { value: 32, labelKey: "editor.duration32nd" },
            ],
            // Saving state
            isSaving: false,
            // Has unsaved changes
            hasChanges: false,
            // Block note/beat mouse events during render (set to 0 when render finishes)
            _skipNoteEventCounter: 0,
            // Unsub for renderFinished
            _unsubRenderFinished: null,
            // Bound key handler reference for cleanup
            _boundKeyHandler: null,
            // Beat mouse down unsub
            _unsubBeatDown: null,
        };
    },
    computed: {
        selectedNoteInfo() {
            if (!this.selectedNote) return null;
            const note = this.selectedNote;
            return {
                string: note.string,
                fret: note.fret,
                octave: note.octave,
                tone: note.tone,
                isGhost: note.isGhost,
                isDead: note.isDead,
                isLetRing: note.isLetRing,
                isPalmMute: note.isPalmMute,
                isStaccato: note.isStaccato,
                isHammerPullOrigin: note.isHammerPullOrigin,
                isSlurOrigin: note.isSlurOrigin,
                isTieDestination: note.isTieDestination,
                vibrato: note.vibrato,
                slideOutType: note.slideOutType,
                slideInType: note.slideInType,
                harmonicType: note.harmonicType,
                durationPercent: note.durationPercent,
                dynamics: note.dynamics,
            };
        },
        currentDuration() {
            return this.selectedBeat?.duration;
        },
        currentDots() {
            return this.selectedBeat?.dots || 0;
        },
    },
    methods: {
        // ====== Edit Mode ======
        toggleEditMode() {
            if (this.editMode) {
                this.exitEditMode();
            } else {
                this.enterEditMode();
            }
        },

        enterEditMode() {
            console.log("[NoteEditor] enterEditMode, api:", !!this.api, "score:", !!this.api?.score);
            if (!this.api || !this.api.score) {
                console.warn("[NoteEditor] Cannot enter edit mode: api or score not ready");
                return;
            }

            if (this.editMode) {
                return; // already in edit mode
            }

            this.editMode = true;
            this.hasChanges = false;
            this.clearSelection();

            // Get track info
            this.updateTrackInfo();

            // Subscribe to note mouse events
            const unsubNoteDown = this.api.noteMouseDown.on((note) => {
                console.log("[NoteEditor] noteMouseDown fired, note:", note?.fret, note?.string);
                this.onNoteMouseDown(note);
            });
            const unsubNoteUp = this.api.noteMouseUp.on(() => {
                this.onNoteMouseUp();
            });
            // Also subscribe to beat mouse down (easier to click on)
            const unsubBeatDown = this.api.beatMouseDown.on((beat) => {
                console.log("[NoteEditor] beatMouseDown fired, beat:", beat?.index, "notes:", beat?.notes?.length);
                this.onBeatMouseDown(beat);
            });
            this._unsubMouseDown = unsubNoteDown;
            this._unsubMouseUp = unsubNoteUp;
            this._unsubBeatDown = unsubBeatDown;

            // Change cursor style for the container
            try {
                const container = this.api.visualRenderer?.canvasElement;
                if (container) {
                    container.style.cursor = "pointer";
                }
            } catch (e) {
                // ignore
            }
        },

        exitEditMode() {
            this.editMode = false;
            this.clearSelection();

            // Unsubscribe from mouse events
            if (this._unsubMouseDown) {
                this._unsubMouseDown();
                this._unsubMouseDown = null;
            }
            if (this._unsubMouseUp) {
                this._unsubMouseUp();
                this._unsubMouseUp = null;
            }
            if (this._unsubBeatDown) {
                this._unsubBeatDown();
                this._unsubBeatDown = null;
            }
            this._unblockAfterRender();

            // Restore cursor
            try {
                const container = this.api?.visualRenderer?.canvasElement;
                if (container) {
                    container.style.cursor = "";
                }
            } catch (e) {
                // ignore
            }

            this.$emit("close");
        },

        // Check if our event handlers are still active
        isEventActive() {
            return this.editMode;
        },

        updateTrackInfo() {
            if (!this.api || !this.api.score) return;
            const trackIdx = this.activeTrackIndex();
            const track = this.api.score.tracks[trackIdx];
            if (!track) return;
            this.trackName = track.name || `Track ${trackIdx + 1}`;
            if (track.staves && track.staves.length > 0) {
                const staff = track.staves[0];
                const tunings = staff.stringTuning?.tunings;
                if (tunings && tunings.length > 0) {
                    this.numStrings = tunings.length;
                    this.stringTunings = [...tunings];
                } else {
                    this.numStrings = 6;
                    this.stringTunings = [];
                }
            }
        },

        activeTrackIndex() {
            // Get the currently selected track from parent's data
            // We read it from the api score
            if (!this.api || !this.api.score || !this.api.score.tracks) return 0;
            // Find the first visible/rendered track
            return 0;
        },

        // ====== Note Selection ======
        onNoteMouseDown(note) {
            if (!this.isEventActive() || !note) {
                console.log("[NoteEditor] noteMouseDown REJECTED: isEventActive:", this.isEventActive(), "note:", !!note);
                return;
            }

            // Skip note mouse events that fire during re-render
            if (this._skipNoteEventCounter > 0) {
                this._skipNoteEventCounter--;
                return;
            }

            this.selectNote(note);
        },

        onNoteMouseUp() {
            // Not needed for now
        },

        // ====== Beat Selection (click on staff area) ======
        onBeatMouseDown(beat) {
            console.log("[NoteEditor] onBeatMouseDown, beat:", beat?.index, "notes:", beat?.notes?.length);
            if (!this.isEventActive() || !beat) return;

            // Skip events during re-render
            if (this._skipNoteEventCounter > 0) {
                this._skipNoteEventCounter--;
                return;
            }

            // If beat has notes, select the first one
            if (beat.notes && beat.notes.length > 0) {
                this.selectNote(beat.notes[0]);
            }
        },

        selectNote(note) {
            if (!note) {
                this.clearSelection();
                return;
            }

            // Update track info from the clicked note's staff
            const staff = note.beat?.voice?.bar?.staff;
            if (staff) {
                const tunings = staff.stringTuning?.tunings;
                if (tunings && tunings.length > 0) {
                    this.numStrings = tunings.length;
                    this.stringTunings = [...tunings];
                }
                const track = staff.track;
                if (track && track.name) {
                    this.trackName = track.name;
                }
            }

            // Clear previous highlight
            this.clearNoteHighlight();

            this.selectedNote = note;
            this.selectedBeat = note.beat;
            this.selectedStaff = note.beat?.voice?.bar?.staff || null;
            this.selectedBar = note.beat?.voice?.bar || null;

            // Highlight the selected note
            this.highlightNote(note);

            // Play the selected note for audio feedback
            if (this.api && this.editMode) {
                try {
                    this.api.playNote(note);
                } catch (e) {
                    // Ignore playback errors
                }
            }
        },

        highlightNote(note) {
            if (!note) return;
            // Save original style
            this._originalNoteStyle = note.style ? { ...note.style } : null;
            // Apply highlight style
            if (!note.style) {
                note.style = new alphaTab.model.NoteStyle();
            }
            note.style.color = alphaTab.model.Color.fromJson("#FFD700"); // Gold highlight
        },

        clearNoteHighlight() {
            if (this.selectedNote && this._originalNoteStyle !== undefined) {
                // Restore original style
                if (this._originalNoteStyle) {
                    this.selectedNote.style = this._originalNoteStyle;
                } else {
                    this.selectedNote.style = null;
                }
                this._originalNoteStyle = null;
            }
        },

        clearSelection() {
            this.clearNoteHighlight();
            this.selectedNote = null;
            this.selectedBeat = null;
            this.selectedBar = null;
            this.selectedStaff = null;
        },

        // ====== Fret Editing ======
        changeFret(delta) {
            if (!this.selectedNote) return;
            const maxFret = 24;
            const newFret = Math.max(0, Math.min(maxFret, this.selectedNote.fret + delta));
            if (newFret !== this.selectedNote.fret) {
                this.selectedNote.fret = newFret;
                this.hasChanges = true;
                this.applyEdit();
            }
        },

        setFret(fret) {
            if (!this.selectedNote) return;
            const maxFret = 24;
            const newFret = Math.max(0, Math.min(maxFret, parseInt(fret) || 0));
            if (newFret !== this.selectedNote.fret) {
                this.selectedNote.fret = newFret;
                this.hasChanges = true;
                this.applyEdit();
            }
        },

        // ====== String Editing ======
        setString(stringNum) {
            if (!this.selectedNote || !this.selectedBeat || !this.selectedStaff) return;
            // Validate string number against available strings
            if (stringNum < 1 || stringNum > this.numStrings) return;
            // Check if string is already occupied
            const existingNote = this.selectedBeat.notes.find(
                (n) => n.string === stringNum && n !== this.selectedNote
            );
            if (existingNote) {
                // Swap strings
                const oldString = this.selectedNote.string;
                existingNote.string = oldString;
                this.selectedNote.string = stringNum;
                this._updateNoteStringColor(existingNote);
            } else {
                this.selectedNote.string = stringNum;
            }
            // Update note color to match the new string
            this._updateNoteStringColor(this.selectedNote);
            this.hasChanges = true;
            this.applyEdit();
        },

        // ====== Duration Editing ======
        setDuration(durationValue) {
            if (!this.selectedBeat) return;
            const numVal = parseInt(durationValue);
            if (!isNaN(numVal)) {
                this.selectedBeat.duration = numVal;
                this.hasChanges = true;
                this.applyEdit();
            }
        },

        setDots(dotsCount) {
            if (!this.selectedBeat) return;
            this.selectedBeat.dots = Math.max(0, Math.min(3, parseInt(dotsCount) || 0));
            this.hasChanges = true;
            this.applyEdit();
        },

        cycleDots() {
            if (!this.selectedBeat) return;
            this.selectedBeat.dots = (this.selectedBeat.dots + 1) % 4;
            this.hasChanges = true;
            this.applyEdit();
        },

        // ====== Toggle Techniques (Note-level) ======
        toggleGhost() {
            if (!this.selectedNote) return;
            this.selectedNote.isGhost = !this.selectedNote.isGhost;
            this.hasChanges = true;
            this.applyEdit();
        },

        toggleDead() {
            if (!this.selectedNote) return;
            this.selectedNote.isDead = !this.selectedNote.isDead;
            this.hasChanges = true;
            this.applyEdit();
        },

        toggleLetRing() {
            if (!this.selectedNote) return;
            this.selectedNote.isLetRing = !this.selectedNote.isLetRing;
            this.hasChanges = true;
            this.applyEdit();
        },

        togglePalmMute() {
            if (!this.selectedNote) return;
            this.selectedNote.isPalmMute = !this.selectedNote.isPalmMute;
            this.hasChanges = true;
            this.applyEdit();
        },

        toggleStaccato() {
            if (!this.selectedNote) return;
            this.selectedNote.isStaccato = !this.selectedNote.isStaccato;
            this.hasChanges = true;
            this.applyEdit();
        },

        toggleHammerPull() {
            if (!this.selectedNote) return;
            this.selectedNote.isHammerPullOrigin = !this.selectedNote.isHammerPullOrigin;
            this.hasChanges = true;
            this.applyEdit();
        },

        toggleSlide() {
            if (!this.selectedNote) return;
            const types = alphaTab.model.SlideOutType;
            if (!types) return;
            // Cycle through: None -> Shift -> Legato -> OutDown -> OutUp
            const current = this.selectedNote.slideOutType;
            if (!current || current === types.None) {
                this.selectedNote.slideOutType = types.Shift;
            } else if (current === types.Shift) {
                this.selectedNote.slideOutType = types.Legato;
            } else if (current === types.Legato) {
                this.selectedNote.slideOutType = types.OutDown;
            } else if (current === types.OutDown) {
                this.selectedNote.slideOutType = types.OutUp;
            } else {
                this.selectedNote.slideOutType = types.None;
            }
            this.hasChanges = true;
            this.applyEdit();
        },

        // ====== Delete Note ======
        deleteSelectedNote() {
            if (!this.selectedNote || !this.selectedBeat) return;

            const beat = this.selectedBeat;
            const note = this.selectedNote;

            // Remove note from beat
            beat.removeNote(note);

            this.clearSelection();
            this.hasChanges = true;
            this.applyEdit();
        },

        // ====== Add Note ======
        addNoteToBeat(stringNum, fretValue) {
            if (!this.selectedBeat) return;

            // Check if string is already occupied
            const existingNote = this.selectedBeat.notes.find(
                (n) => n.string === stringNum
            );
            if (existingNote) {
                // Select the existing note instead
                this.selectNote(existingNote);
                return;
            }

            // Create a new note
            const newNote = new alphaTab.model.Note();
            newNote.string = stringNum;
            newNote.fret = fretValue || 0;
            newNote.isVisible = true;
            newNote.dynamics = 5; // DynamicValue.F = 5

            // Add to beat
            this.selectedBeat.addNote(newNote);
            this.hasChanges = true;

            // Select the new note
            this.selectNote(newNote);
            this.applyEdit();
        },

        addNoteToString(stringNum) {
            if (!this.selectedBeat) return;
            this.addNoteToBeat(stringNum, 0);
        },

        // ====== Apply & Render ======
        applyEdit() {
            if (!this.api || !this.api.score) return;

            try {
                // Unblock any previous renderFinished listener
                this._unblockAfterRender();

                // Block all note/beat mouse events during re-render
                this._skipNoteEventCounter = 999999;

                // Subscribe to renderFinished to unblock once rendering completes
                this._unsubRenderFinished = this.api.renderFinished.on(() => {
                    this._skipNoteEventCounter = 0;
                    this._unsubRenderFinished = null;
                });

                // Re-render the score preserving viewport
                this.api.render({ reuseViewport: true });

                // Play preview of the selected note after edit
                if (this.selectedNote && this.editMode) {
                    setTimeout(() => {
                        try {
                            this.api.playNote(this.selectedNote);
                        } catch (e) {
                            // Ignore playback errors during rapid edits
                        }
                    }, 50);
                }
            } catch (e) {
                console.error("Error applying edit:", e);
                this._skipNoteEventCounter = 0;
            }
        },

        // Unblock after render and clean up renderFinished subscription
        _unblockAfterRender() {
            this._skipNoteEventCounter = 0;
            if (this._unsubRenderFinished) {
                this._unsubRenderFinished();
                this._unsubRenderFinished = null;
            }
        },

        // Update note color to match its string (mirrors Tab.vue's stringColors)
        _updateNoteStringColor(note) {
            if (!note || !note.style) return;
            const stringColorMap = {
                1: "#bf3732",  // red
                2: "#fff800",  // yellow
                3: "#0080ff",  // blue
                4: "#e07b39",  // orange
                5: "#2A8E08",  // green
                6: "#A349A4",  // purple
            };
            const colorHex = stringColorMap[note.string];
            if (colorHex && alphaTab.model?.NoteSubElement) {
                note.style.colors.set(
                    alphaTab.model.NoteSubElement.GuitarTabFretNumber,
                    alphaTab.model.Color.fromJson(colorHex)
                );
            }
        },

        // ====== Drag to change fret ======
        onDragStart(event) {
            if (!this.selectedNote) return;
            this.isDragging = true;
            const clientY = event.clientY ?? event.touches?.[0]?.clientY ?? 0;
            this.dragStartY = clientY;
            this.dragStartFret = this.selectedNote.fret;

            const onMove = (e) => {
                if (!this.isDragging || !this.selectedNote) return;
                const currentY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
                const deltaY = this.dragStartY - currentY;
                const fretDelta = Math.round(deltaY / 20); // 20px = 1 fret
                const newFret = Math.max(
                    0,
                    Math.min(24, this.dragStartFret + fretDelta)
                );
                if (newFret !== this.selectedNote.fret) {
                    this.selectedNote.fret = newFret;
                    this.hasChanges = true;
                    // Use a flag to batch re-renders
                    if (!this._dragRenderPending) {
                        this._dragRenderPending = true;
                        requestAnimationFrame(() => {
                            this._dragRenderPending = false;
                            this.applyEdit();
                        });
                    }
                    this.dragStartY = currentY;
                    this.dragStartFret = newFret;
                }
                e.preventDefault();
            };

            const onEnd = () => {
                this.isDragging = false;
                this._dragRenderPending = false;
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onEnd);
                document.removeEventListener("touchmove", onMove);
                document.removeEventListener("touchend", onEnd);
            };

            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onEnd);
            document.addEventListener("touchmove", onMove, { passive: false });
            document.addEventListener("touchend", onEnd);

            event.preventDefault();
        },

        // ====== Save ======
        async saveChanges() {
            if (!this.api || !this.api.score || this.isSaving) return;

            this.isSaving = true;
            try {
                // Export the score as GP format using Gp7Exporter
                const exporter = new alphaTab.exporter.Gp7Exporter();
                const settings = this.api.settings;
                const data = exporter.export(this.api.score, settings);

                // Upload to server
                const formData = new FormData();
                const blob = new Blob([data], { type: "application/octet-stream" });
                formData.append("file", blob, "tab.gp");

                const res = await fetch(baseURL + `/api/tab/${this.tabID}/replace`, {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                });

                if (!res.ok) {
                    const err = await res.text().catch(() => "Unknown error");
                    throw new Error(err);
                }

                this.hasChanges = false;
                this.$emit("saved");
            } catch (e) {
                console.error("Save error:", e);
                notify({
                    type: "error",
                    title: "Save failed",
                    text: e.message || "Could not save changes",
                });
            } finally {
                this.isSaving = false;
            }
        },

        // ====== Keyboard handling ======
        handleKeyDown(e) {
            console.log("[NoteEditor] handleKeyDown INVOKED, key:", e.key, "editMode:", this.editMode, "target:", e.target.tagName);

            if (!this.editMode) {
                console.log("[NoteEditor] REJECTED: editMode is false");
                return;
            }

            // Don't handle if focus is on an input
            const tag = e.target.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) {
                console.log("[NoteEditor] REJECTED: focus on input/textarea");
                return;
            }

            const key = e.key;
            console.log("[NoteEditor] keydown ACCEPTED:", key, "editMode:", this.editMode);

            // Fret up/down
            if (key === "ArrowUp") {
                e.preventDefault();
                this.changeFret(1);
            } else if (key === "ArrowDown") {
                e.preventDefault();
                this.changeFret(-1);
            }
            // String switching
            else if (key === "]") {
                e.preventDefault();
                if (this.selectedNote && this.selectedNote.string < this.numStrings) {
                    this.setString(this.selectedNote.string + 1);
                }
            } else if (key === "[") {
                e.preventDefault();
                if (this.selectedNote && this.selectedNote.string > 1) {
                    this.setString(this.selectedNote.string - 1);
                }
            }
            // Delete note
            else if (key === "Delete" || key === "Backspace") {
                e.preventDefault();
                this.deleteSelectedNote();
            }
            // Duration shortcuts (on numpad or number row)
            else if (key === "1") {
                this.setDuration(1); e.preventDefault(); // Whole
            } else if (key === "2") {
                this.setDuration(2); e.preventDefault(); // Half
            } else if (key === "3") {
                this.setDuration(4); e.preventDefault(); // Quarter
            } else if (key === "4") {
                this.setDuration(8); e.preventDefault(); // Eighth
            } else if (key === "5") {
                this.setDuration(16); e.preventDefault(); // Sixteenth
            } else if (key === "6") {
                this.setDuration(32); e.preventDefault(); // ThirtySecond
            }
            // Toggle dots
            else if (key === ".") {
                e.preventDefault();
                this.cycleDots();
            }
            // Save
            else if (key === "s" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.saveChanges();
            }
            // Exit edit mode
            else if (key === "Escape") {
                e.preventDefault();
                this.exitEditMode();
            }
        },

        // ====== Utility ======
        getStringLabel(stringNum) {
            const idx = stringNum - 1;
            if (this.stringTunings && idx >= 0 && idx < this.stringTunings.length) {
                return this.noteName(this.stringTunings[idx]);
            }
            return `S${stringNum}`;
        },

        noteName(midiValue) {
            const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
            const note = ((midiValue % 12) + 12) % 12;
            const octave = Math.floor(midiValue / 12) - 1;
            return `${names[note]}${octave}`;
        },
    },
    mounted() {
        this._boundKeyHandler = (e) => this.handleKeyDown(e);
        window.addEventListener("keydown", this._boundKeyHandler);
        // Auto-enter edit mode when component mounts
        this.enterEditMode();
    },
    beforeUnmount() {
        if (this._boundKeyHandler) {
            window.removeEventListener("keydown", this._boundKeyHandler);
            this._boundKeyHandler = null;
        }
        if (this.editMode) {
            this.exitEditMode();
        }
    },
};
</script>

<template>
    <div v-if="editMode" class="note-editor-overlay">
        <!-- Edit Toolbar/Panel -->
        <div class="note-editor-panel">
            <div class="editor-header">
                <span class="editor-title">
                    <font-awesome-icon :icon='["fas", "pen"]' />
                    {{ $t('editor.editMode') }}
                </span>
                <span class="track-name">{{ trackName }}</span>
                <div class="editor-actions">
                    <button
                        class="btn btn-sm btn-success"
                        @click="saveChanges"
                        :disabled="isSaving || !hasChanges"
                    >
                        <font-awesome-icon :icon='["fas", "floppy-disk"]' />
                        {{ isSaving ? $t('editor.saving') : $t('editor.save') }}
                    </button>
                    <button class="btn btn-sm btn-secondary" @click="exitEditMode">
                        <font-awesome-icon :icon='["fas", "xmark"]' />
                        {{ $t('editor.exit') }}
                    </button>
                </div>
            </div>

            <!-- Selected Note Info & Edit Controls -->
            <div v-if="selectedNote" class="editor-controls">
                <!-- Fret Control -->
                <div class="control-group">
                    <label>{{ $t('editor.fret') }}</label>
                    <div class="control-row">
                        <button
                            class="btn btn-sm btn-outline-light"
                            @click="changeFret(-1)"
                        >
                            −
                        </button>
                        <input
                            type="number"
                            class="form-control form-control-sm fret-input"
                            :value="selectedNote.fret"
                            @input="setFret($event.target.value)"
                            min="0"
                            max="24"
                        />
                        <button
                            class="btn btn-sm btn-outline-light"
                            @click="changeFret(1)"
                        >
                            +
                        </button>
                    </div>
                </div>

                <!-- String Control -->
                <div class="control-group">
                    <label>{{ $t('editor.string') }}</label>
                    <div class="control-row string-buttons">
                        <button
                            v-for="s in numStrings"
                            :key="s"
                            class="btn btn-sm"
                            :class="
                                selectedNote.string === s
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="setString(s)"
                            :title="getStringLabel(s)"
                        >
                            {{ s }}<br /><small>{{ getStringLabel(s) }}</small>
                        </button>
                    </div>
                </div>

                <!-- Duration Control -->
                <div class="control-group" v-if="selectedBeat">
                    <label>{{ $t('editor.duration') }}</label>
                    <div class="control-row">
                        <select
                            class="form-select form-select-sm"
                            :value="currentDuration"
                            @change="setDuration($event.target.value)"
                        >
                            <option
                                v-for="d in durationOptions"
                                :key="d.value"
                                :value="d.value"
                            >
                                {{ $t(d.labelKey) }}
                            </option>
                        </select>
                        <button
                            class="btn btn-sm"
                            :class="
                                currentDots > 0 ? 'btn-primary' : 'btn-outline-light'
                            "
                            @click="cycleDots"
                        >
                            {{ $t('editor.dots') }}: {{ currentDots }}
                        </button>
                    </div>
                </div>

                <!-- Note Techniques -->
                <div class="control-group">
                    <label>{{ $t('editor.techniques') }}</label>
                    <div class="control-row technique-buttons">
                        <button
                            class="btn btn-sm"
                            :class="
                                selectedNote.isGhost
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="toggleGhost"
                            :title="$t('editor.ghostTitle')"
                        >
                            {{ $t('editor.ghost') }}
                        </button>
                        <button
                            class="btn btn-sm"
                            :class="
                                selectedNote.isDead
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="toggleDead"
                            :title="$t('editor.deadTitle')"
                        >
                            {{ $t('editor.dead') }}
                        </button>
                        <button
                            class="btn btn-sm"
                            :class="
                                selectedNote.isLetRing
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="toggleLetRing"
                            :title="$t('editor.letRingTitle')"
                        >
                            {{ $t('editor.letRing') }}
                        </button>
                        <button
                            class="btn btn-sm"
                            :class="
                                selectedNote.isPalmMute
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="togglePalmMute"
                            :title="$t('editor.palmMuteTitle')"
                        >
                            {{ $t('editor.palmMute') }}
                        </button>
                        <button
                            class="btn btn-sm"
                            :class="
                                selectedNote.isStaccato
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="toggleStaccato"
                            :title="$t('editor.staccatoTitle')"
                        >
                            {{ $t('editor.staccato') }}
                        </button>
                        <button
                            class="btn btn-sm"
                            :class="
                                (selectedNote.slideOutType &&
                                    selectedNote.slideOutType !== 0)
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="toggleSlide"
                            :title="$t('editor.slideTitle')"
                        >
                            {{ $t('editor.slide') }}
                        </button>
                        <button
                            class="btn btn-sm"
                            :class="
                                selectedNote.isHammerPullOrigin
                                    ? 'btn-primary'
                                    : 'btn-outline-light'
                            "
                            @click="toggleHammerPull"
                            :title="$t('editor.hammerPullTitle')"
                        >
                            {{ $t('editor.hammerPull') }}
                        </button>
                    </div>
                </div>

                <!-- Actions -->
                <div class="control-group actions">
                    <button class="btn btn-sm btn-danger" @click="deleteSelectedNote">
                        <font-awesome-icon :icon='["fas", "trash"]' />
                        {{ $t('editor.deleteNote') }}
                    </button>
                </div>
            </div>

            <!-- No Selection -->
            <div v-else class="no-selection">
                <p>{{ $t('editor.clickToEdit') }}</p>
                <p class="keyboard-hints">
                    <strong>{{ $t('editor.keyboardHints') }}:</strong><br />
                    {{ $t('editor.keyUpDown') }} · {{ $t('editor.keyBracket') }} · {{ $t('editor.keyDelete') }} · {{ $t('editor.keyDuration') }}<br />
                    {{ $t('editor.keyDots') }} · {{ $t('editor.keySave') }} · {{ $t('editor.keyExit') }}
                </p>
            </div>
        </div>

        <!-- Drag handle overlay (shown when a note is selected) -->
        <div
            v-if="selectedNote && !isDragging"
            class="drag-overlay"
            @mousedown="onDragStart"
            @touchstart.prevent="onDragStart"
        >
            <div class="drag-hint">
                <font-awesome-icon :icon='["fas", "up-down"]' />
                {{ $t('editor.dragHint') }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.note-editor-overlay {
    position: fixed;
    bottom: 70px;
    left: 0;
    right: 0;
    z-index: 999;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
}

.note-editor-overlay > * {
    pointer-events: auto;
}

.note-editor-panel {
    background: #1e1e2e;
    border: 1px solid #3c3b40;
    border-radius: 8px;
    padding: 12px 16px;
    max-width: 750px;
    width: 95%;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
    color: #d6d6d6;
    margin-bottom: 8px;
}

.editor-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #3c3b40;
}

.editor-title {
    font-weight: bold;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.track-name {
    color: #888;
    font-size: 12px;
    flex-grow: 1;
}

.editor-actions {
    display: flex;
    gap: 6px;
}

.editor-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 120px;
}

.control-group label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.control-row {
    display: flex;
    gap: 4px;
    align-items: center;
}

.fret-input {
    width: 60px;
    text-align: center;
    background: #32393e;
    border: 1px solid #555b60;
    color: white;
}

.string-buttons {
    flex-wrap: wrap;
}

.string-buttons .btn {
    min-width: 44px;
    font-size: 11px;
    line-height: 1.1;
    padding: 4px 6px;
}

.string-buttons .btn small {
    font-size: 9px;
    opacity: 0.7;
}

.technique-buttons {
    flex-wrap: wrap;
}

.technique-buttons .btn {
    font-size: 10px;
    padding: 4px 8px;
}

.actions {
    flex-grow: 1;
    align-items: flex-end;
}

.no-selection {
    text-align: center;
    padding: 10px 0;
    color: #aaa;
}

.no-selection p {
    margin: 4px 0;
}

.keyboard-hints {
    font-size: 11px;
    color: #777;
    line-height: 1.6;
}

.drag-overlay {
    position: fixed;
    bottom: 280px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 30, 46, 0.9);
    border: 1px dashed #555;
    border-radius: 6px;
    padding: 6px 14px;
    cursor: ns-resize;
    user-select: none;
    font-size: 12px;
    color: #aaa;
    z-index: 1000;
}

.drag-hint {
    display: flex;
    align-items: center;
    gap: 6px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
    .note-editor-panel {
        padding: 8px 10px;
        max-width: 100%;
        border-radius: 8px 8px 0 0;
        bottom: 60px;
    }
    .editor-controls {
        gap: 6px;
    }
    .control-group {
        min-width: 80px;
    }
    .string-buttons .btn {
        min-width: 36px;
        font-size: 10px;
        padding: 3px 4px;
    }
}
</style>
