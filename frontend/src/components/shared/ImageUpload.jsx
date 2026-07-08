import { useState, useRef } from 'react';

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/* Self-contained (own tokens) — renders inside the CreateQuestion form. */
const IU_CSS = `
  .cr-iu-root{
    --cr-bg2:#0d1117; --cr-panel2:#1c232d; --cr-border:#2a323d; --cr-border2:#3a444f;
    --cr-text:#e6edf3; --cr-dim:#8b949e; --cr-dimmer:#5c6773; --cr-green:#3fb950; --cr-green2:#238636;
    --cr-body:'Inter',system-ui,sans-serif;
    font-family:var(--cr-body);
  }
  .cr-iu-drop{border:2px dashed var(--cr-border);border-radius:10px;padding:18px;text-align:center;cursor:pointer;background:var(--cr-bg2);transition:all .2s;}
  .cr-iu-drop:hover{border-color:var(--cr-border2);}
  .cr-iu-drop.over{border-color:var(--cr-green2);background:rgba(35,134,54,0.08);}
  .cr-iu-uploading{display:flex;align-items:center;justify-content:center;gap:8px;}
  .cr-iu-uploading span{font-size:12px;color:var(--cr-dim);}
  .cr-iu-spin{animation:cr-iu-spin 1s linear infinite;color:var(--cr-green);}
  @keyframes cr-iu-spin{to{transform:rotate(360deg);}}
  .cr-iu-title{font-size:13px;color:var(--cr-dim);}
  .cr-iu-hint{font-size:11px;color:var(--cr-dimmer);margin-top:4px;}
  .cr-iu-input{display:none;}
`;

const ImageUpload = ({ onInsert }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver]       = useState(false);
    const fileRef = useRef(null);

    const upload = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Only image files allowed');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', UPLOAD_PRESET);
            formData.append('folder', 'questions');

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                { method: 'POST', body: formData }
            );
            const data = await res.json();

            if (data.secure_url) {
                // Insert as markdown image
                onInsert(`![image](${data.secure_url})`);
            } else {
                alert('Upload failed: ' + (data.error?.message || 'Unknown error'));
            }
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
        e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
    };

    return (
        <div className="cr-iu-root">
            <style>{IU_CSS}</style>
            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`cr-iu-drop${dragOver ? ' over' : ''}`}
            >
                {isUploading ? (
                    <div className="cr-iu-uploading">
                        <svg className="cr-iu-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        <span>Uploading...</span>
                    </div>
                ) : (
                    <div>
                        <p className="cr-iu-title">📷 Drop image here or click to upload</p>
                        <p className="cr-iu-hint">PNG, JPG, GIF, SVG — inserts as markdown</p>
                    </div>
                )}
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cr-iu-input"
            />
        </div>
    );
};

export default ImageUpload;