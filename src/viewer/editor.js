export default (function() {
  var editor = {};
  var editable = false;
  
  var events = null;
  /**
   * Attach events object so editor module can communicate with the others.
   * @param {Object} ev Notochord events system.
   */
  editor.attachEvents = function(ev) {
    events = ev;
    events.create('Editor.setSelectedBeat');
    events.create('Editor.commitUpdate');
    events.on('Player.play', () => editor.setSelectedBeat(null));
  };
  
  var viewer = null;
  /**
   * Attach viewer object so editor module can communicate with it.
   * @param {Object} _viewer Viewer to attach.
   */
  editor.attachViewer = function(_viewer) {
    viewer = _viewer;
  };
  
  // @todoo docs
  editor.setEditable = function(_editable) {
    editable = _editable;
    if(editable) {
      viewer._svgElem.classList.add('NotochordEditable');
    } else {
      viewer._svgElem.classList.remove('NotochordEditable');
    }
  };
  
  editor.editedBeat = null;
  /**
   * Open the editor on a BeatView.
   * @param {?BeatView} beatView BeatView to edit, or null to close editor.
   * @public
   */
  editor.setSelectedBeat = function(beatView) {
    if(!editable) return;
    if(editor.editedBeat) editor.editedBeat.setEditing(false);
    if(!beatView || editor.editedBeat == beatView) {
      editor.editedBeat = null;
      editor._input.classList.remove('show');
      editor._input.style.top = 0;
      editor._input.style.left = 0;
      return;
    }
    editor.editedBeat = beatView;
    beatView.setEditing(true);
    document.body.appendChild(editor._input);
    var bvRect = beatView._svgGroup.getBoundingClientRect();
    var elemRect = editor._input.getBoundingClientRect();
    var top = document.body.scrollTop + bvRect.top;
    top -= elemRect.height + 10;
    var left = document.body.scrollLeft + bvRect.left;
    left += (bvRect.width * 0.5) - (elemRect.width * 0.5);
    editor._input.classList.add('show');
    editor._input.style.top = `${top}px`;
    editor._input.style.left = `${left}px`;
    
    var measure = beatView.measureView.measure;
    var chord = measure.getBeat(beatView.index);
    if(chord) {
      editor._input.value = chord;
    } else {
      editor._input.value = '';
    }
    editor._input.focus();
    if(events) events.dispatch('Editor.setSelectedBeat');
  };
  
  var toNextBeat = function(arrow) {
    let beat = editor.editedBeat;
    if(beat.index == beat.measureView.measure.length - 1) {
      let newMeasure = beat.measureView.measure.getNextMeasure();
      if(newMeasure) {
        let newMeasureView = newMeasure.measureView;
        let newBeat = newMeasureView.beatViews[0];
        newBeat._svgGroup.focus();
      } else if(!arrow) { // only do this for tab
        editor.setSelectedBeat(null);
        viewer._hiddenTabbable.focus();
      }
    } else {
      let newBeat = beat.measureView.beatViews[beat.index + 1];
      newBeat._svgGroup.focus();
    }
  };
  
  var toPrevBeat = function(arrow) {
    let beat = editor.editedBeat;
    if(beat.index == 0) {
      let newMeasure = beat.measureView.measure.getPreviousMeasure();
      if(newMeasure) {
        let newMeasureView = newMeasure.measureView;
        let newBeat = newMeasureView.beatViews[newMeasure.length - 1];
        newBeat._svgGroup.focus();
      } else if(!arrow) { // only do this for tab
        editor.setSelectedBeat(null);
        viewer._titleText.focus();
      }
    } else {
      let newBeat = beat.measureView.beatViews[beat.index - 1];
      newBeat._svgGroup.focus();
    }
  };
  
  // @todo docs
  var handleNonTextualKeyboardInput = function(e) {
    switch(e.key) {
      case 'Enter':
      case 'Escape': {
        editor.setSelectedBeat(null);
        break;
      }
      case 'ArrowRight': {
        if(editor._input.selectionStart !== editor._input.value.length) {
          return true;
        }
        toNextBeat(true);
        break;
      }
      case 'Tab': {
        if(e.shiftKey) {
          toPrevBeat();
        } else {
          toNextBeat();
        }
        break;
      }
      case 'ArrowLeft': {
        if(editor._input.selectionStart !== 0) {
          return true;
        }
        toPrevBeat(true);
        break;
      }
      case 'ArrowUp': {
        let rawChord = editor._input.value;
        let chordParts = Tonal.Chord.tokenize(rawChord);
        chordParts[0] = Tonal.Note.enharmonic(
          Tonal.transpose(chordParts[0], 'm2')
        );
        editor._input.value = chordParts.join('');
        handleTextualKeyboardInput();
        break;
      }
      case 'ArrowDown': {
        let rawChord = editor._input.value;
        let chordParts = Tonal.Chord.tokenize(rawChord);
        chordParts[0] = Tonal.Note.enharmonic(
          Tonal.transpose(chordParts[0], 'm-2')
        );
        editor._input.value = chordParts.join('');
        handleTextualKeyboardInput();
        break;
      }
      default: {
        return true;
      }
    }
    e.stopPropagation();
    e.preventDefault();
    return false;
  };
  
  var handleTextualKeyboardInput = function() {
    var chord = editor._input.value;
    var beat = editor.editedBeat;
    var measure = beat.measureView.measure;
    measure.parseChordToBeat(chord, beat.index, true);
    editor.editedBeat.renderChord(measure.getBeat(beat.index));
    if(events) events.dispatch('Editor.commitUpdate');
  };
  
  var handleBlur = function(e) {
    if(!e.relatedTarget || (e.relatedTarget
    && !viewer._svgElem.contains(e.relatedTarget))) {
      editor.setSelectedBeat(null);
    }
  };
  
  editor._input = document.createElement('input');
  editor._input.classList.add('NotochordChordEditor');
  editor._input.setAttribute('type', 'text');
  editor._input.addEventListener('keydown', handleNonTextualKeyboardInput);
  editor._input.addEventListener('input', handleTextualKeyboardInput);
  editor._input.addEventListener('blur', handleBlur);
  
  return editor;
})();

