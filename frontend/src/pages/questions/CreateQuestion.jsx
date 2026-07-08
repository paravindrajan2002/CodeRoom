import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { questionAPI } from '../../services/api.js';
import useAuthStore from '../../store/authStore.js';
import ImageUpload from '../../components/shared/ImageUpload.jsx';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const LANGUAGES    = ['JAVASCRIPT', 'PYTHON', 'JAVA', 'GO', 'CPP'];

const STARTER_CODE_TEMPLATES = {
    PYTHON: `import sys\n\ndef solution(data):\n    # Write your solution here\n    pass\n\ndata = sys.stdin.read().strip()\nprint(solution(data))\n`,
    JAVASCRIPT: `const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nlet lines = [];\nrl.on('line', line => lines.push(line));\nrl.on('close', () => {\n    // lines[0], lines[1], ... contain your input\n    // Write your solution here\n    console.log(lines[0]);\n});\n`,
    JAVA: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String input = sc.nextLine();\n        \n        // Write your solution here\n        System.out.println(input);\n    }\n}\n`,
    GO: `package main\n\nimport (\n    "bufio"\n    "fmt"\n    "os"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    input, _ := reader.ReadString('\\n')\n    \n    // Write your solution here\n    fmt.Println(input)\n}\n`,
    CPP: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string input;\n    getline(cin, input);\n    \n    // Write your solution here\n    cout << input << endl;\n    return 0;\n}\n`,
};

const CQ_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .cr-cq-root{
    --cr-bg:#0a0e14; --cr-bg2:#0d1117; --cr-panel:#161b22; --cr-panel2:#1c232d;
    --cr-border:#2a323d; --cr-border2:#3a444f; --cr-text:#e6edf3; --cr-dim:#8b949e;
    --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636; --cr-blue:#58a6ff;
    --cr-yellow:#d29922; --cr-red:#f85149;
    --cr-mono:'JetBrains Mono',ui-monospace,monospace;
    --cr-display:'Space Grotesk','Segoe UI',sans-serif; --cr-body:'Inter',system-ui,sans-serif;
    min-height:100vh; background:var(--cr-bg); color:var(--cr-text);
    font-family:var(--cr-body); line-height:1.6; -webkit-font-smoothing:antialiased;
  }
  .cr-cq-root *{margin:0;padding:0;box-sizing:border-box;}
  .cr-cq-root ::selection{background:rgba(63,185,80,0.3);}

  /* Nav */
  .cr-cq-nav{position:sticky;top:0;z-index:10;background:rgba(10,14,20,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--cr-border);}
  .cr-cq-nav-inner{max-width:960px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;}
  .cr-cq-nav-left{display:flex;align-items:center;gap:28px;}
  .cr-cq-logo{display:flex;align-items:center;gap:8px;font-family:var(--cr-display);font-weight:700;font-size:18px;letter-spacing:-0.02em;}
  .cr-cq-logo b{color:var(--cr-green);}
  .cr-cq-logo-dot{width:8px;height:8px;border-radius:50%;background:var(--cr-green);box-shadow:0 0 10px var(--cr-green);}
  .cr-cq-links{display:flex;align-items:center;gap:20px;}
  .cr-cq-navlink{font-family:var(--cr-body);font-size:14px;color:var(--cr-dim);background:none;border:none;cursor:pointer;transition:color .2s;}
  .cr-cq-navlink:hover{color:var(--cr-text);}
  .cr-cq-navlink.active{color:var(--cr-text);font-weight:500;padding-bottom:2px;border-bottom:2px solid var(--cr-green);}
  .cr-cq-nav-right{display:flex;align-items:center;gap:14px;}
  .cr-cq-nav-right p{font-size:14px;color:var(--cr-dim);}
  .cr-cq-signout{font-family:var(--cr-body);font-size:14px;color:var(--cr-dim);background:none;border:1px solid var(--cr-border);padding:7px 12px;border-radius:9px;cursor:pointer;transition:all .2s;}
  .cr-cq-signout:hover{color:var(--cr-text);border-color:var(--cr-border2);}

  .cr-cq-main{max-width:960px;margin:0 auto;padding:32px 24px;}
  .cr-cq-head{margin-bottom:24px;}
  .cr-cq-title{font-family:var(--cr-display);font-weight:700;font-size:26px;letter-spacing:-0.02em;}
  .cr-cq-sub{font-size:14px;color:var(--cr-dim);margin-top:4px;}

  .cr-cq-form{display:flex;flex-direction:column;gap:24px;}
  .cr-cq-grid3{display:grid;grid-template-columns:2fr 1fr;gap:16px;}
  .cr-cq-label{display:block;font-family:var(--cr-mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--cr-dim);margin-bottom:8px;}
  .cr-cq-req{color:var(--cr-red);}
  .cr-cq-muted{color:var(--cr-dimmer);text-transform:none;letter-spacing:0;font-family:var(--cr-body);}
  .cr-cq-input,.cr-cq-select{width:100%;background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:10px;padding:10px 12px;font-size:14px;color:var(--cr-text);font-family:var(--cr-body);transition:border-color .2s,box-shadow .2s;}
  .cr-cq-input::placeholder{color:var(--cr-dimmer);}
  .cr-cq-input:focus,.cr-cq-select:focus{outline:none;border-color:var(--cr-green);box-shadow:0 0 0 3px rgba(63,185,80,0.12);}
  .cr-cq-select{cursor:pointer;}
  .cr-cq-select option{background:var(--cr-panel);color:var(--cr-text);}

  /* Description editor */
  .cr-cq-desc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;flex-wrap:wrap;}
  .cr-cq-desc-actions{display:flex;align-items:center;gap:8px;}
  .cr-cq-btn-mini{font-size:12px;color:var(--cr-dim);background:none;border:1px solid var(--cr-border);padding:5px 10px;border-radius:8px;cursor:pointer;transition:all .2s;}
  .cr-cq-btn-mini:hover{color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-cq-btn-mini.accent{color:var(--cr-blue);border-color:transparent;}
  .cr-cq-btn-mini.accent:hover{color:var(--cr-text);}
  .cr-cq-editor{border:1px solid var(--cr-border);border-radius:10px;overflow:hidden;transition:border-color .2s;}
  .cr-cq-editor:focus-within{border-color:var(--cr-green);}
  .cr-cq-toolbar{display:flex;align-items:center;gap:4px;flex-wrap:wrap;background:var(--cr-panel);border-bottom:1px solid var(--cr-border);padding:6px 10px;}
  .cr-cq-tool{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dim);background:var(--cr-panel2);border:1px solid transparent;padding:3px 8px;border-radius:6px;cursor:pointer;transition:all .2s;}
  .cr-cq-tool:hover{color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-cq-code{width:100%;background:var(--cr-bg2);border:none;padding:12px;font-size:13px;color:var(--cr-text);font-family:var(--cr-mono);resize:none;line-height:1.6;}
  .cr-cq-code::placeholder{color:var(--cr-dimmer);}
  .cr-cq-code:focus{outline:none;}
  .cr-cq-preview{background:var(--cr-bg2);padding:16px;min-height:160px;}
  .cr-cq-preview-empty{font-size:12px;color:var(--cr-dimmer);font-style:italic;}

  /* Markdown preview */
  .cr-cq-md{font-size:13px;color:var(--cr-dim);line-height:1.65;}
  .cr-cq-md p{margin-bottom:10px;}
  .cr-cq-md strong{color:var(--cr-text);font-weight:600;}
  .cr-cq-md em{font-style:italic;}
  .cr-cq-md ul,.cr-cq-md ol{margin:0 0 10px;padding-left:20px;}
  .cr-cq-md li{margin-bottom:4px;}
  .cr-cq-md h1{color:var(--cr-text);font-family:var(--cr-display);font-weight:700;font-size:16px;margin-bottom:8px;}
  .cr-cq-md h2{color:var(--cr-text);font-family:var(--cr-display);font-weight:600;font-size:14px;margin-bottom:8px;}
  .cr-cq-md h3{color:var(--cr-dim);font-weight:600;font-size:13px;margin-bottom:4px;}
  .cr-cq-md blockquote{border-left:2px solid var(--cr-green);padding-left:12px;margin:10px 0;font-style:italic;}
  .cr-cq-md hr{border:none;border-top:1px solid var(--cr-border);margin:14px 0;}
  .cr-cq-md a{color:var(--cr-blue);text-decoration:none;}
  .cr-cq-md a:hover{text-decoration:underline;}
  .cr-cq-md img{border-radius:10px;max-width:100%;margin:12px 0;border:1px solid var(--cr-border);}
  .cr-cq-md table{width:100%;font-size:12px;border-collapse:collapse;margin:12px 0;}
  .cr-cq-md th{border:1px solid var(--cr-border);background:var(--cr-panel2);color:var(--cr-text);padding:6px 10px;text-align:left;}
  .cr-cq-md td{border:1px solid var(--cr-border);padding:6px 10px;}
  .cr-cq-md-code-inline{background:var(--cr-panel2);color:var(--cr-blue);padding:1px 6px;border-radius:5px;font-size:12px;font-family:var(--cr-mono);}
  .cr-cq-md-code-block{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:8px;padding:12px;margin:10px 0;overflow-x:auto;}
  .cr-cq-md-code-block code{font-size:12px;font-family:var(--cr-mono);color:var(--cr-text);}

  /* Starter code */
  .cr-cq-code-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px;flex-wrap:wrap;}
  .cr-cq-code-actions{display:flex;align-items:center;gap:8px;}
  .cr-cq-mini-select{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:8px;padding:5px 10px;font-size:12px;color:var(--cr-text);font-family:var(--cr-body);cursor:pointer;transition:border-color .2s;}
  .cr-cq-mini-select:focus{outline:none;border-color:var(--cr-green);}
  .cr-cq-mini-select option{background:var(--cr-panel);color:var(--cr-text);}
  .cr-cq-save{font-family:var(--cr-body);font-size:12px;font-weight:600;background:var(--cr-green2);color:#fff;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;transition:all .2s;}
  .cr-cq-save:hover{background:var(--cr-green);}
  .cr-cq-saved{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
  .cr-cq-saved-label{font-family:var(--cr-mono);font-size:11px;color:var(--cr-dimmer);}
  .cr-cq-saved-tag{font-family:var(--cr-mono);font-size:10px;font-weight:600;color:var(--cr-green);background:rgba(63,185,80,0.12);padding:2px 8px;border-radius:100px;}
  .cr-cq-saved-note{font-size:11px;color:var(--cr-dimmer);font-style:italic;}
  .cr-cq-code-area{width:100%;background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:10px;padding:12px;font-size:13px;color:var(--cr-text);font-family:var(--cr-mono);resize:none;line-height:1.6;transition:border-color .2s;}
  .cr-cq-code-area:focus{outline:none;border-color:var(--cr-green);}
  .cr-cq-hint{font-size:11px;color:var(--cr-dimmer);margin-top:8px;}

  /* Test cases */
  .cr-cq-tc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
  .cr-cq-add{font-family:var(--cr-body);font-size:12px;color:var(--cr-green);background:none;border:1px solid var(--cr-green2);padding:6px 12px;border-radius:9px;cursor:pointer;transition:all .2s;}
  .cr-cq-add:hover{background:rgba(63,185,80,0.1);}
  .cr-cq-tc-list{display:flex;flex-direction:column;gap:12px;}
  .cr-cq-tc{background:var(--cr-panel);border:1px solid var(--cr-border);border-radius:14px;padding:16px;}
  .cr-cq-tc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
  .cr-cq-tc-name{font-family:var(--cr-mono);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--cr-dim);}
  .cr-cq-tc-controls{display:flex;align-items:center;gap:14px;}
  .cr-cq-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;}
  .cr-cq-switch{position:relative;width:32px;height:16px;border-radius:100px;background:var(--cr-border);transition:background .2s;flex-shrink:0;}
  .cr-cq-switch.on{background:var(--cr-green2);}
  .cr-cq-switch-knob{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:transform .2s;}
  .cr-cq-switch.on .cr-cq-switch-knob{transform:translateX(16px);}
  .cr-cq-toggle-label{font-size:12px;color:var(--cr-dim);}
  .cr-cq-remove{font-size:12px;color:var(--cr-dim);background:none;border:none;cursor:pointer;transition:color .2s;}
  .cr-cq-remove:hover{color:var(--cr-red);}
  .cr-cq-tc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .cr-cq-tc-flabel{display:block;font-family:var(--cr-mono);font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--cr-dimmer);margin-bottom:4px;}
  .cr-cq-tc-input{width:100%;background:var(--cr-bg2);border:1px solid var(--cr-border);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--cr-text);font-family:var(--cr-mono);resize:none;transition:border-color .2s;}
  .cr-cq-tc-input::placeholder{color:var(--cr-dimmer);}
  .cr-cq-tc-input:focus{outline:none;border-color:var(--cr-green);}
  .cr-cq-tc-hidden{font-size:11px;color:var(--cr-green);margin-top:8px;}

  /* Actions */
  .cr-cq-actions{display:flex;align-items:center;gap:12px;padding:8px 0 32px;}
  .cr-cq-cancel{font-family:var(--cr-body);font-size:14px;color:var(--cr-dim);background:none;border:1px solid var(--cr-border);padding:10px 18px;border-radius:10px;cursor:pointer;transition:all .2s;}
  .cr-cq-cancel:hover{color:var(--cr-text);border-color:var(--cr-border2);}
  .cr-cq-submit{font-family:var(--cr-body);font-size:14px;font-weight:600;background:var(--cr-green2);color:#fff;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;transition:all .2s;}
  .cr-cq-submit:hover:not(:disabled){background:var(--cr-green);box-shadow:0 0 24px rgba(63,185,80,0.35);}
  .cr-cq-submit:disabled{opacity:.5;cursor:not-allowed;}

  @media(max-width:640px){.cr-cq-grid3{grid-template-columns:1fr;}.cr-cq-tc-grid{grid-template-columns:1fr;}}
`;

const CreateQuestion = () => {
    const navigate    = useNavigate();
    const { user, logout } = useAuthStore();

    const [form, setForm] = useState({
        title:       '',
        description: '',
        difficulty:  'MEDIUM',
        tags:        '',
        starterCode: STARTER_CODE_TEMPLATES['PYTHON'],
        language:    'PYTHON',
    });

    const [testCases, setTestCases] = useState([
        { input: '', expectedOutput: '', hidden: false }
    ]);

    // Per-language starter codes — saved explicitly by the user
    const [savedCodes, setSavedCodes] = useState({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [descPreview, setDescPreview]   = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const descRef = useRef(null);

    // ─── Markdown toolbar helper ──────────────────────────────────────────────
    const insertMd = (before, after = '') => {
        const el = descRef.current;
        if (!el) return;
        const start    = el.selectionStart;
        const end      = el.selectionEnd;
        const selected = form.description.slice(start, end);
        const newText  =
            form.description.slice(0, start) +
            before + selected + after +
            form.description.slice(end);
        handleFormChange('description', newText);
        setTimeout(() => {
            el.focus();
            el.selectionStart = start + before.length;
            el.selectionEnd   = start + before.length + selected.length;
        }, 0);
    };

    // Insert image markdown from Cloudinary upload
    const handleImageInsert = (markdown) => {
        const el = descRef.current;
        if (!el) {
            handleFormChange('description', form.description + '\n' + markdown + '\n');
            return;
        }
        const pos     = el.selectionStart;
        const newText =
            form.description.slice(0, pos) +
            '\n' + markdown + '\n' +
            form.description.slice(pos);
        handleFormChange('description', newText);
        setShowImageUpload(false);
    };

    const TOOLBAR = [
        { label: 'B',    title: 'Bold',         before: '**',   after: '**'  },
        { label: 'I',    title: 'Italic',        before: '_',    after: '_'   },
        { label: '`',    title: 'Inline code',   before: '`',    after: '`'   },
        { label: '```',  title: 'Code block',    before: '\n```\n', after: '\n```\n' },
        { label: 'H2',   title: 'Heading',       before: '\n## ', after: ''   },
        { label: 'ul',   title: 'Bullet list',   before: '\n- ', after: ''    },
        { label: '1.',   title: 'Numbered list', before: '\n1. ', after: ''   },
        { label: '---',  title: 'Divider',       before: '\n---\n', after: '' },
        { label: 'link', title: 'Link',          before: '[',    after: '](url)' },
    ];

    // ─── Form handlers ────────────────────────────────────────────────────────
    const handleFormChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const saveCurrentCode = () => {
        setSavedCodes(prev => ({ ...prev, [form.language]: form.starterCode }));
        toast.success(`Starter code saved for ${form.language}`);
    };

    const handleLanguageChange = (lang) => {
        handleFormChange('language', lang);
        // Load saved code for this language, or default template if not yet saved
        handleFormChange('starterCode', savedCodes[lang] ?? STARTER_CODE_TEMPLATES[lang]);
    };

    const handleTestCaseChange = (index, field, value) => {
        setTestCases(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const addTestCase = () => {
        setTestCases(prev => [...prev, { input: '', expectedOutput: '', hidden: false }]);
    };

    const removeTestCase = (index) => {
        if (testCases.length === 1) return;
        setTestCases(prev => prev.filter((_, i) => i !== index));
    };

    // ─── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim())       { toast.error('Title is required'); return; }
        if (!form.description.trim()) { toast.error('Description is required'); return; }

        const validTestCases = testCases.filter(
            tc => tc.input.trim() || tc.expectedOutput.trim()
        );

        try {
            setIsSubmitting(true);
            // Merge all saved per-language codes + current language's code
            const allCodes = { ...savedCodes, [form.language]: form.starterCode.trim() };
            const response = await questionAPI.create({
                title:       form.title.trim(),
                description: form.description.trim(),
                difficulty:  form.difficulty,
                tags:        form.tags.trim(),
                starterCode: JSON.stringify(allCodes),
                language:    form.language,
            });

            const questionId = response.data.id;
            for (const tc of validTestCases) {
                await questionAPI.addTestCase(questionId, {
                    input:          tc.input,
                    expectedOutput: tc.expectedOutput,
                    hidden:         tc.hidden,
                });
            }

            toast.success('Question created!');
            navigate('/questions');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create question');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Markdown preview components — only behavior-bearing renderers kept;
    //     everything else is styled via .cr-cq-md descendant CSS ──────────────
    const mdComponents = {
        code: ({ inline, children }) =>
            inline
                ? <code className="cr-cq-md-code-inline">{children}</code>
                : <pre className="cr-cq-md-code-block"><code>{children}</code></pre>,
        a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">{children}</a>
        ),
        img: ({ src, alt }) => <img src={src} alt={alt} />,
    };

    return (
        <div className="cr-cq-root">
            <style>{CQ_CSS}</style>

            {/* Navbar */}
            <nav className="cr-cq-nav">
                <div className="cr-cq-nav-inner">
                    <div className="cr-cq-nav-left">
                        <div className="cr-cq-logo">
                            <span className="cr-cq-logo-dot" />
                            Code<b>Room</b>
                        </div>
                        <div className="cr-cq-links">
                            <button onClick={() => navigate('/dashboard')} className="cr-cq-navlink">
                                Dashboard
                            </button>
                            <button onClick={() => navigate('/questions')} className="cr-cq-navlink">
                                Question Bank
                            </button>
                            <button className="cr-cq-navlink active">Create Question</button>
                        </div>
                    </div>
                    <div className="cr-cq-nav-right">
                        <p>{user?.email}</p>
                        <button onClick={logout} className="cr-cq-signout">Sign out</button>
                    </div>
                </div>
            </nav>

            <div className="cr-cq-main">
                <div className="cr-cq-head">
                    <h2 className="cr-cq-title">Create Question</h2>
                    <p className="cr-cq-sub">Supports markdown — add images, code blocks, tables</p>
                </div>

                <form onSubmit={handleSubmit} className="cr-cq-form">

                    {/* Title + Difficulty */}
                    <div className="cr-cq-grid3">
                        <div>
                            <label className="cr-cq-label">
                                Title <span className="cr-cq-req">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => handleFormChange('title', e.target.value)}
                                placeholder="Two Sum"
                                className="cr-cq-input"
                            />
                        </div>
                        <div>
                            <label className="cr-cq-label">
                                Difficulty <span className="cr-cq-req">*</span>
                            </label>
                            <select
                                value={form.difficulty}
                                onChange={(e) => handleFormChange('difficulty', e.target.value)}
                                className="cr-cq-select"
                            >
                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="cr-cq-label">
                            Tags <span className="cr-cq-muted">(comma separated)</span>
                        </label>
                        <input
                            type="text"
                            value={form.tags}
                            onChange={(e) => handleFormChange('tags', e.target.value)}
                            placeholder="array, hashmap, tree, graph"
                            className="cr-cq-input"
                        />
                    </div>

                    {/* Description — markdown editor */}
                    <div>
                        <div className="cr-cq-desc-head">
                            <label className="cr-cq-label" style={{ marginBottom: 0 }}>
                                Description <span className="cr-cq-req">*</span>
                                <span className="cr-cq-muted"> (markdown supported)</span>
                            </label>
                            <div className="cr-cq-desc-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowImageUpload(p => !p)}
                                    className="cr-cq-btn-mini"
                                >
                                    📷 Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescPreview(p => !p)}
                                    className="cr-cq-btn-mini accent"
                                >
                                    {descPreview ? '✏️ Edit' : '👁 Preview'}
                                </button>
                            </div>
                        </div>

                        {/* Image upload panel */}
                        {showImageUpload && (
                            <div style={{ marginBottom: 8 }}>
                                <ImageUpload onInsert={handleImageInsert} />
                            </div>
                        )}

                        <div className="cr-cq-editor">
                            {/* Markdown toolbar */}
                            {!descPreview && (
                                <div className="cr-cq-toolbar">
                                    {TOOLBAR.map(({ label, title, before, after }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => insertMd(before, after)}
                                            title={title}
                                            className="cr-cq-tool"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {descPreview ? (
                                <div className="cr-cq-preview">
                                    {form.description ? (
                                        <div className="cr-cq-md">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                                {form.description}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="cr-cq-preview-empty">Nothing to preview</p>
                                    )}
                                </div>
                            ) : (
                                <textarea
                                    ref={descRef}
                                    value={form.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    placeholder={`Describe the problem...\n\n**Example 1:**\n\`\`\`\nInput: s = "()"\nOutput: true\n\`\`\`\n\n![diagram](https://your-image.png)`}
                                    rows={10}
                                    className="cr-cq-code"
                                />
                            )}
                        </div>
                    </div>

                    {/* Language + Starter Code */}
                    <div>
                        <div className="cr-cq-code-head">
                            <label className="cr-cq-label" style={{ marginBottom: 0 }}>
                                Starter Code
                                <span className="cr-cq-muted"> (shown in editor when question loads)</span>
                            </label>
                            <div className="cr-cq-code-actions">
                                <select
                                    value={form.language}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                    className="cr-cq-mini-select"
                                >
                                    {LANGUAGES.map(l => (
                                        <option key={l} value={l}>
                                            {savedCodes[l] ? `✓ ${l}` : l}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" onClick={saveCurrentCode} className="cr-cq-save">
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* Saved languages indicator */}
                        {Object.keys(savedCodes).length > 0 && (
                            <div className="cr-cq-saved">
                                <span className="cr-cq-saved-label">Saved:</span>
                                {Object.keys(savedCodes).map(lang => (
                                    <span key={lang} className="cr-cq-saved-tag">{lang}</span>
                                ))}
                                {form.language && !savedCodes[form.language] && (
                                    <span className="cr-cq-saved-note">· {form.language} not saved yet</span>
                                )}
                            </div>
                        )}

                        <textarea
                            value={form.starterCode}
                            onChange={(e) => handleFormChange('starterCode', e.target.value)}
                            rows={8}
                            spellCheck={false}
                            className="cr-cq-code-area"
                        />
                        <p className="cr-cq-hint">
                            Write the template for each language and click Save, then switch languages. All saved codes load in the editor when the question is selected.
                        </p>
                    </div>

                    {/* Test cases */}
                    <div>
                        <div className="cr-cq-tc-head">
                            <label className="cr-cq-label" style={{ marginBottom: 0 }}>
                                Test Cases <span className="cr-cq-muted">(optional)</span>
                            </label>
                            <button type="button" onClick={addTestCase} className="cr-cq-add">
                                + Add Test Case
                            </button>
                        </div>

                        <div className="cr-cq-tc-list">
                            {testCases.map((tc, i) => (
                                <div key={i} className="cr-cq-tc">
                                    <div className="cr-cq-tc-top">
                                        <span className="cr-cq-tc-name">Test Case {i + 1}</span>
                                        <div className="cr-cq-tc-controls">
                                            <label className="cr-cq-toggle">
                                                <div
                                                    onClick={() => handleTestCaseChange(i, 'hidden', !tc.hidden)}
                                                    className={`cr-cq-switch${tc.hidden ? ' on' : ''}`}
                                                >
                                                    <div className="cr-cq-switch-knob" />
                                                </div>
                                                <span className="cr-cq-toggle-label">Hidden</span>
                                            </label>
                                            {testCases.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeTestCase(i)}
                                                    className="cr-cq-remove"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="cr-cq-tc-grid">
                                        <div>
                                            <label className="cr-cq-tc-flabel">Input</label>
                                            <textarea
                                                value={tc.input}
                                                onChange={(e) => handleTestCaseChange(i, 'input', e.target.value)}
                                                placeholder="()"
                                                rows={3}
                                                className="cr-cq-tc-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="cr-cq-tc-flabel">Expected Output</label>
                                            <textarea
                                                value={tc.expectedOutput}
                                                onChange={(e) => handleTestCaseChange(i, 'expectedOutput', e.target.value)}
                                                placeholder="true"
                                                rows={3}
                                                className="cr-cq-tc-input"
                                            />
                                        </div>
                                    </div>

                                    {tc.hidden && (
                                        <p className="cr-cq-tc-hidden">
                                            🔒 Hidden — candidate sees pass/fail only
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="cr-cq-actions">
                        <button type="button" onClick={() => navigate('/questions')} className="cr-cq-cancel">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="cr-cq-submit">
                            {isSubmitting ? 'Creating...' : 'Create Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateQuestion;