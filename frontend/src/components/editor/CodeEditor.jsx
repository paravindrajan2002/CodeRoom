import { useRef, useEffect, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { go } from '@codemirror/lang-go';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { LANGUAGES } from '../../utils/constants.js';

const getLanguageExtension = (language) => {
    switch (language) {
        case 'JAVASCRIPT': return javascript({ jsx: false });
        case 'JAVA':       return java();
        case 'PYTHON':     return python();
        case 'GO':         return go();
        case 'CPP':        return cpp();
        default:           return javascript();
    }
};

// Editor chrome retuned to the cr- token palette (near-black bg, cr border/gutter
// colors) so the surface matches the rest of the room. Syntax highlighting still
// comes from oneDark.
const customTheme = EditorView.theme({
    '&': { height: '100%', fontSize: '14px', backgroundColor: '#0d1117' },
    '.cm-scroller': {
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineHeight: '1.6',
        overflow: 'auto',
    },
    '.cm-content': { padding: '16px 0', caretColor: '#3fb950' },
    '.cm-line': { padding: '0 16px' },
    '.cm-gutters': {
        backgroundColor: '#0a0e14',
        borderRight: '1px solid #2a323d',
        color: '#5c6773',
        minWidth: '48px',
    },
    '.cm-activeLineGutter': { backgroundColor: '#161b22' },
    '.cm-activeLine': { backgroundColor: '#161b22' },
    '.cm-cursor': { borderLeftColor: '#3fb950', borderLeftWidth: '2px' },
    '.cm-selectionBackground': { backgroundColor: '#1c3a5e !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#1c3a5e !important' },
});

const CodeEditor = ({ code, language, onChange, isRemoteChange }) => {
    const editorViewRef = useRef(null);
    const isRemoteChangeRef = useRef(false);

    // ─── Apply remote code change to editor ───────────────────────────────────
    useEffect(() => {
        if (!isRemoteChange) return;
        if (!editorViewRef.current) return;

        const view = editorViewRef.current;
        const currentDoc = view.state.doc.toString();

        // Skip if already same
        if (currentDoc === code) return;

        // Flag as remote so onChange doesn't fire back to relay
        isRemoteChangeRef.current = true;

        // Save cursor
        const selection = view.state.selection;

        // Apply full replacement
        view.dispatch({
            changes: {
                from: 0,
                to: currentDoc.length,
                insert: code || '',
            },
            selection,
            // Prevent this from triggering onChange
            annotations: [],
        });

        // Reset flag after tick
        setTimeout(() => {
            isRemoteChangeRef.current = false;
        }, 0);

    }, [code, isRemoteChange]); // ← runs every time isRemoteChange flips to true

    const handleChange = useCallback((value) => {
        if (isRemoteChangeRef.current) return;
        onChange(value);
    }, [onChange]);

    const handleEditorMount = useCallback((view) => {
        editorViewRef.current = view;
    }, []);

    return (
        <div className="cr-room-editor">
            <div className="cr-room-editor-bar">
                <div className="cr-room-editor-tab">
                    <div className="cr-room-editor-tab-dot" />
                    <span>
                        {LANGUAGES.find(l => l.value === language)?.label || language}
                    </span>
                </div>
            </div>
            <div className="cr-room-editor-body">
                <CodeMirror
                    value={code}
                    height="100%"
                    theme={oneDark}
                    extensions={[
                        getLanguageExtension(language),
                        customTheme,
                        EditorView.lineWrapping,
                    ]}
                    onChange={handleChange}
                    onCreateEditor={handleEditorMount}
                    basicSetup={{
                        lineNumbers: true,
                        highlightActiveLineGutter: true,
                        history: true,
                        foldGutter: false,
                        drawSelection: true,
                        indentOnInput: true,
                        syntaxHighlighting: true,
                        bracketMatching: true,
                        closeBrackets: false,
                        autocompletion: false,
                        highlightActiveLine: true,
                        highlightSelectionMatches: true,
                    }}
                    style={{ height: '100%' }}
                />
            </div>
        </div>
    );
};

export default CodeEditor;