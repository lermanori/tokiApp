import { useState, useRef } from 'react';
import { adminApi } from '../../services/adminApi';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import BatchUploadPreview from './BatchUploadPreview';

interface BatchUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'creating' | 'complete';

export default function BatchUploadModal({ onClose, onSuccess }: BatchUploadModalProps) {
  const { user } = useAdminAuth();
  const [step, setStep] = useState<Step>('upload');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a ZIP file');
      return;
    }
    setZipFile(file);
    setError('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!zipFile) return;

    setLoading(true);
    setError('');
    try {
      const response = await adminApi.previewBatchTokis(zipFile);
      setPreview(response);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to preview batch upload');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index: number, updatedToki: any) => {
    if (!preview || !preview.preview) return;

    // Get the preview data structure
    const previewData = preview.preview;
    const valid = Array.isArray(previewData.valid) ? previewData.valid : [];
    const invalid = Array.isArray(previewData.invalid) ? previewData.invalid : [];

    // Find and update the toki in preview
    const allItems = [...valid, ...invalid];
    const item = allItems.find((i: any) => i.index === index);
    if (!item) return;

    // Update the toki data
    item.toki = { ...item.toki, ...updatedToki };

    // Update the preview state with the modified data
    setPreview({
      ...preview,
      preview: {
        valid: valid.map((i: any) => i.index === index ? item : i),
        invalid: invalid.map((i: any) => i.index === index ? item : i)
      }
    });
  };

  const handleCreate = async () => {
    if (!zipFile || !preview) return;

    setStep('creating');
    setError('');
    try {
      const response = await adminApi.createBatchTokis(zipFile);
      setResults(response);
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to create tokis');
      setStep('preview');
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }} onClick={onClose}>
      <div 
        className="glass-card" 
        style={{
          width: '100%',
          maxWidth: step === 'preview' ? '95vw' : 600,
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          padding: 24
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(0,0,0,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>

        <h2 style={{
          fontSize: 24,
          fontFamily: 'var(--font-bold)',
          color: '#1C1C1C',
          marginBottom: 24
        }}>
          Batch Upload Tokis
        </h2>

        {/* Upload Step */}
        {step === 'upload' && (
          <div>
            {/* Host Information */}
            {user && (
              <div style={{
                padding: 12,
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 8,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ fontSize: 16 }}>👤</span>
                <div>
                  <div style={{
                    fontSize: 12,
                    color: '#6B7280',
                    fontFamily: 'var(--font-medium)'
                  }}>
                    Default Host
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: '#1C1C1C',
                    fontFamily: 'var(--font-semi)'
                  }}>
                    {user.name}
                  </div>
                </div>
              </div>
            )}

            <p style={{
              fontSize: 14,
              color: '#6B7280',
              marginBottom: 24,
              lineHeight: 1.6
            }}>
              Upload a ZIP file containing:
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>A JSON file with toki data (e.g., <code>tokis.json</code>)</li>
                <li>Image files referenced in the JSON</li>
              </ul>
              {user && (
                <div style={{
                  marginTop: 12,
                  padding: 8,
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 6,
                  fontSize: 13
                }}>
                  <strong>Note:</strong> All tokis will be created with <strong>{user.name}</strong> as the host. 
                  You can change the host for individual tokis in the preview step.
                </div>
              )}
            </p>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? '#8B5CF6' : '#D1D5DB'}`,
                borderRadius: 12,
                padding: 48,
                textAlign: 'center',
                background: dragActive ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: 16
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <div style={{
                fontSize: 18,
                fontFamily: 'var(--font-semi)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                {zipFile ? zipFile.name : 'Click or drag ZIP file here'}
              </div>
              <div style={{
                fontSize: 14,
                color: '#6B7280'
              }}>
                {zipFile ? `${(zipFile.size / 1024 / 1024).toFixed(2)} MB` : 'Maximum 50MB'}
              </div>
            </div>

            {error && (
              <div style={{
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
                color: '#EF4444',
                marginBottom: 16,
                fontSize: 14
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                onClick={onClose}
                style={{
                  background: 'rgba(107, 114, 128, 0.8)'
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handlePreview}
                disabled={!zipFile || loading}
              >
                {loading ? 'Processing...' : 'Preview'}
              </button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && preview && (
          <div>
            <BatchUploadPreview
              preview={preview.preview}
              summary={preview.summary}
              onEdit={handleEdit}
              onCreate={handleCreate}
            />
            {error && (
              <div style={{
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
                color: '#EF4444',
                marginTop: 16,
                fontSize: 14
              }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                className="btn-primary"
                onClick={() => setStep('upload')}
                style={{
                  background: 'rgba(107, 114, 128, 0.8)'
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Creating Step */}
        {step === 'creating' && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{
              fontSize: 18,
              fontFamily: 'var(--font-semi)',
              color: '#1C1C1C',
              marginBottom: 8
            }}>
              Creating Tokis...
            </div>
            <div style={{
              fontSize: 14,
              color: '#6B7280'
            }}>
              Please wait while we create your tokis
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && results && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{
                fontSize: 20,
                fontFamily: 'var(--font-bold)',
                color: '#1C1C1C',
                marginBottom: 8
              }}>
                Batch Upload Complete!
              </h3>
            </div>

            <div style={{
              padding: 16,
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div style={{
                fontSize: 14,
                fontFamily: 'var(--font-semi)',
                color: '#10B981',
                marginBottom: 8
              }}>
                Created: {results.summary.createdCount} tokis
              </div>
              {results.summary.failedCount > 0 && (
                <div style={{
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#EF4444',
                  marginTop: 8
                }}>
                  Failed: {results.summary.failedCount} tokis
                </div>
              )}
            </div>

            {results.results.failed.length > 0 && (
              <div style={{
                padding: 16,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 12,
                marginBottom: 16,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                <div style={{
                  fontSize: 14,
                  fontFamily: 'var(--font-semi)',
                  color: '#EF4444',
                  marginBottom: 8
                }}>
                  Failed Tokis:
                </div>
                {results.results.failed.map((item: any, idx: number) => (
                  <div key={idx} style={{
                    fontSize: 12,
                    color: '#EF4444',
                    marginBottom: 4
                  }}>
                    • {item.title || `Toki ${item.index + 1}`}: {item.error}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="btn-primary"
                onClick={handleComplete}
                style={{
                  background: 'linear-gradient(135deg,#10B981,#4DC4AA)'
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
