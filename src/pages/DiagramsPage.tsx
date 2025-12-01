import { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Plus,
  Save,
  Trash2,
  FileText,
  Wand2,
  Loader2,
  Download,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings,
  Pencil,
  FolderOpen,
  History,
  Clock,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';

interface DiagramVersion {
  id: string;
  diagramId: string;
  content: string;
  prompt?: string;
  createdAt: number;
}

interface DiagramFile {
  id: string;
  name: string;
  content: string;
  prompt?: string;
  createdAt: number;
  updatedAt: number;
}

// Storage keys for panel widths
const STORAGE_KEYS = {
  sidebarWidth: 'diagrams-sidebar-width',
  editorWidth: 'diagrams-editor-width',
};

// Initialize mermaid with print-friendly neutral theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  themeVariables: {
    // Neutral colors for better printing
    primaryColor: '#e2e8f0',
    primaryTextColor: '#1e293b',
    primaryBorderColor: '#64748b',
    lineColor: '#475569',
    secondaryColor: '#f1f5f9',
    tertiaryColor: '#f8fafc',
    // Node colors
    nodeBorder: '#475569',
    mainBkg: '#ffffff',
    nodeTextColor: '#1e293b',
    // Flowchart specific
    clusterBkg: '#f1f5f9',
    clusterBorder: '#94a3b8',
    defaultLinkColor: '#475569',
    titleColor: '#0f172a',
    edgeLabelBackground: '#ffffff',
    // Sequence diagram
    actorBkg: '#e2e8f0',
    actorBorder: '#475569',
    actorTextColor: '#1e293b',
    actorLineColor: '#64748b',
    signalColor: '#475569',
    signalTextColor: '#1e293b',
    labelBoxBkgColor: '#f1f5f9',
    labelBoxBorderColor: '#94a3b8',
    labelTextColor: '#1e293b',
    loopTextColor: '#1e293b',
    noteBorderColor: '#94a3b8',
    noteBkgColor: '#fef9c3',
    noteTextColor: '#1e293b',
    activationBorderColor: '#475569',
    activationBkgColor: '#e2e8f0',
    sequenceNumberColor: '#ffffff',
    // ER diagram
    attributeBackgroundColorOdd: '#f8fafc',
    attributeBackgroundColorEven: '#f1f5f9',
  },
});

const DEFAULT_DIAGRAM = '';

export function DiagramsPage() {
  const [diagrams, setDiagrams] = useState<DiagramFile[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<DiagramFile | null>(null);
  const [editorContent, setEditorContent] = useState(DEFAULT_DIAGRAM);
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameFileName, setRenameFileName] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [lastUsedPrompt, setLastUsedPrompt] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [openAIModel, setOpenAIModel] = useState('gpt-5');
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Panel widths (persisted to localStorage)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.sidebarWidth);
    return saved ? parseInt(saved, 10) : 256;
  });
  const [editorWidth, setEditorWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.editorWidth);
    return saved ? parseInt(saved, 10) : 50; // percentage
  });

  // Zoom state for preview
  const [zoomLevel, setZoomLevel] = useState(1);

  // Resize state
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingEditor, setIsResizingEditor] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save panel widths to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sidebarWidth, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.editorWidth, editorWidth.toString());
  }, [editorWidth]);

  // Handle sidebar resize
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  // Handle editor resize
  const handleEditorMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingEditor(true);
  }, []);

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(150, Math.min(400, e.clientX - containerRect.left));
        setSidebarWidth(newWidth);
      }
      if (isResizingEditor && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const availableWidth = containerRect.width - sidebarWidth;
        const editorAreaStart = containerRect.left + sidebarWidth;
        const mouseOffset = e.clientX - editorAreaStart;
        const newPercentage = Math.max(20, Math.min(80, (mouseOffset / availableWidth) * 100));
        setEditorWidth(newPercentage);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingEditor(false);
    };

    if (isResizingSidebar || isResizingEditor) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar, isResizingEditor, sidebarWidth]);

  // Handle zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel((prev) => Math.max(0.25, Math.min(3, prev + delta)));
    }
  }, []);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.25, prev - 0.25));
  const handleZoomReset = () => setZoomLevel(1);

  // Load diagrams on mount
  useEffect(() => {
    loadDiagrams();
    loadSettings();
  }, []);

  // Render diagram when content changes
  useEffect(() => {
    const renderDiagram = async () => {
      if (!editorContent.trim()) {
        setRenderedSvg('');
        setRenderError(null);
        return;
      }

      try {
        // Clear previous diagram
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, editorContent);
        setRenderedSvg(svg);
        setRenderError(null);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to render diagram';
        setRenderError(message);
        setRenderedSvg('');
      }
    };

    const timeoutId = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timeoutId);
  }, [editorContent]);

  // Track unsaved changes
  useEffect(() => {
    if (selectedDiagram) {
      setHasUnsavedChanges(editorContent !== selectedDiagram.content);
    } else {
      setHasUnsavedChanges(editorContent !== DEFAULT_DIAGRAM);
    }
  }, [editorContent, selectedDiagram]);

  const loadSettings = async () => {
    try {
      const modelResponse = await window.api.settings.get('openai_model');
      if (modelResponse.success && modelResponse.data) {
        setOpenAIModel(modelResponse.data);
      }
    } catch {
      console.error('Failed to load settings');
    }
  };

  const loadDiagrams = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.diagrams.list();
      if (response.success) {
        setDiagrams(response.data || []);
      } else {
        toast.error('Failed to load diagrams', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to load diagrams');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVersions = async (diagramId: string) => {
    setIsLoadingVersions(true);
    try {
      const response = await window.api.diagrams.listVersions(diagramId);
      if (response.success) {
        setVersions(response.data || []);
        setSelectedVersionIndex(null);
      } else {
        toast.error('Failed to load versions', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to load versions');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleSelectDiagram = (diagram: DiagramFile) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Discard them?');
      if (!confirm) return;
    }
    setSelectedDiagram(diagram);
    setEditorContent(diagram.content);
    setLastUsedPrompt(diagram.prompt || '');
    setHasUnsavedChanges(false);
    setVersions([]);
    setSelectedVersionIndex(null);
  };

  const handleNewDiagram = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Discard them?');
      if (!confirm) return;
    }
    setSelectedDiagram(null);
    setEditorContent(DEFAULT_DIAGRAM);
    setLastUsedPrompt('');
    setHasUnsavedChanges(false);
    setVersions([]);
    setSelectedVersionIndex(null);
  };

  const handleSave = async () => {
    if (selectedDiagram) {
      // Update existing diagram
      setIsSaving(true);
      try {
        const response = await window.api.diagrams.update(selectedDiagram.id, editorContent, lastUsedPrompt || undefined);
        if (response.success) {
          toast.success('Diagram saved');
          setSelectedDiagram(response.data!);
          setHasUnsavedChanges(false);
          loadDiagrams();
        } else {
          toast.error('Failed to save diagram', {
            description: response.error?.message,
          });
        }
      } catch {
        toast.error('Failed to save diagram');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Show save dialog for new diagram
      setNewFileName('');
      setShowSaveDialog(true);
    }
  };

  const handleSaveNew = async () => {
    if (!newFileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    setIsSaving(true);
    try {
      const response = await window.api.diagrams.create(newFileName.trim(), editorContent, lastUsedPrompt || undefined);
      if (response.success) {
        toast.success('Diagram saved');
        setSelectedDiagram(response.data!);
        setHasUnsavedChanges(false);
        setShowSaveDialog(false);
        loadDiagrams();
      } else {
        toast.error('Failed to save diagram', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to save diagram');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDiagram) return;

    try {
      const response = await window.api.diagrams.delete(selectedDiagram.id);
      if (response.success) {
        toast.success('Diagram deleted');
        setSelectedDiagram(null);
        setEditorContent(DEFAULT_DIAGRAM);
        setHasUnsavedChanges(false);
        setShowDeleteDialog(false);
        loadDiagrams();
      } else {
        toast.error('Failed to delete diagram', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to delete diagram');
    }
  };

  const handleRename = async () => {
    if (!selectedDiagram || !renameFileName.trim()) return;

    try {
      const response = await window.api.diagrams.rename(selectedDiagram.id, renameFileName.trim());
      if (response.success) {
        toast.success('Diagram renamed');
        setSelectedDiagram(response.data!);
        setShowRenameDialog(false);
        loadDiagrams();
      } else {
        toast.error('Failed to rename diagram', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to rename diagram');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await window.api.diagrams.generate(aiPrompt.trim(), editorContent);
      if (response.success && response.data) {
        setEditorContent(response.data);
        setLastUsedPrompt(aiPrompt.trim());
        setAiPrompt('');
        toast.success('Diagram generated');
      } else if (!response.success) {
        toast.error('Failed to generate diagram', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to generate diagram');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportSvg = () => {
    if (!renderedSvg) {
      toast.error('No diagram to export');
      return;
    }

    const blob = new Blob([renderedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDiagram?.name || 'diagram'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('SVG exported');
  };

  const handleExportPng = async () => {
    if (!renderedSvg) {
      toast.error('No diagram to export');
      return;
    }

    try {
      // Parse SVG from the rendered output
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(renderedSvg, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) {
        toast.error('Failed to parse SVG');
        return;
      }

      // Ensure SVG has xmlns attribute
      if (!svgElement.getAttribute('xmlns')) {
        svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }

      // Get dimensions from viewBox (most reliable for Mermaid SVGs)
      let width = 800;
      let height = 600;
      
      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          width = parts[2];
          height = parts[3];
        }
      } else {
        // Fallback to width/height attributes
        const attrWidth = svgElement.getAttribute('width');
        const attrHeight = svgElement.getAttribute('height');
        if (attrWidth) width = parseFloat(attrWidth) || width;
        if (attrHeight) height = parseFloat(attrHeight) || height;
      }

      // Scale up for better quality (2x)
      const scale = 2;
      const scaledWidth = Math.round(width * scale);
      const scaledHeight = Math.round(height * scale);

      // Set explicit dimensions on SVG to match canvas
      svgElement.setAttribute('width', String(scaledWidth));
      svgElement.setAttribute('height', String(scaledHeight));
      
      // Update viewBox to match the content dimensions
      if (viewBox) {
        // Keep original viewBox - it defines what part of the SVG to show
      } else {
        svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        toast.error('Failed to create canvas context');
        return;
      }

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, scaledWidth, scaledHeight);

      // Serialize SVG to string with proper encoding
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      
      // Create a data URL
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

      // Load SVG as image
      const img = new Image();
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error('Failed to create PNG');
            return;
          }
          const pngUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `${selectedDiagram?.name || 'diagram'}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pngUrl);
          toast.success('PNG exported');
        }, 'image/png');
      };

      img.onerror = (e) => {
        console.error('Failed to load SVG:', e);
        toast.error('Failed to load SVG for PNG export');
      };

      img.src = dataUrl;
    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('Failed to export PNG');
    }
  };

  const handleSaveSettings = async () => {
    try {
      if (apiKey.trim()) {
        await window.api.settings.set('openai_api_key', apiKey.trim());
      }
      await window.api.settings.set('openai_model', openAIModel);
      toast.success('Settings saved');
      setShowSettingsDialog(false);
      setApiKey(''); // Clear the API key field after saving
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await window.api.openai.test();
      if (response.success) {
        toast.success(`Connected to OpenAI`, {
          description: `Model: ${response.data?.model}`,
        });
      } else {
        toast.error('Failed to connect', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to test connection');
    }
  };

  const handleOpenVersions = async () => {
    if (!selectedDiagram) return;
    await loadVersions(selectedDiagram.id);
    setShowVersionsDialog(true);
  };

  const handleRestoreVersion = async (version: DiagramVersion) => {
    if (!selectedDiagram) return;

    try {
      const response = await window.api.diagrams.restoreVersion(selectedDiagram.id, version.id);
      if (response.success) {
        toast.success('Version restored');
        setSelectedDiagram(response.data!);
        setEditorContent(response.data!.content);
        setLastUsedPrompt(response.data!.prompt || '');
        setHasUnsavedChanges(false);
        setShowVersionsDialog(false);
        loadDiagrams();
      } else {
        toast.error('Failed to restore version', {
          description: response.error?.message,
        });
      }
    } catch {
      toast.error('Failed to restore version');
    }
  };

  const handleUseVersionAsNew = (version: DiagramVersion) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Discard them?');
      if (!confirm) return;
    }
    setSelectedDiagram(null);
    setEditorContent(version.content);
    setLastUsedPrompt(version.prompt || '');
    setHasUnsavedChanges(true);
    setShowVersionsDialog(false);
    setVersions([]);
    setSelectedVersionIndex(null);
    toast.success('Content loaded from version', {
      description: 'Save as a new diagram to keep these changes',
    });
  };

  const handlePreviewVersion = (index: number) => {
    setSelectedVersionIndex(index);
  };

  const navigateVersion = (direction: 'prev' | 'next') => {
    if (selectedVersionIndex === null) return;
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedVersionIndex - 1)
      : Math.min(versions.length - 1, selectedVersionIndex + 1);
    setSelectedVersionIndex(newIndex);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - draggable region for window */}
      <div className="border-b bg-card pl-20 pr-6 py-4" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">MarkdownFlows</h1>
              <p className="text-muted-foreground text-sm">
                Create and edit Mermaid diagrams with AI assistance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <Button variant="outline" size="sm" onClick={handleNewDiagram}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || (!hasUnsavedChanges && selectedDiagram !== null)}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
            {selectedDiagram && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenVersions}
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRenameFileName(selectedDiagram.name);
                    setShowRenameDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleExportSvg} disabled={!renderedSvg}>
              <Download className="h-4 w-4 mr-2" />
              SVG
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPng} disabled={!renderedSvg}>
              <Download className="h-4 w-4 mr-2" />
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File List */}
        <div className="border-r bg-card flex flex-col flex-shrink-0" style={{ width: sidebarWidth }}>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Saved Diagrams
            </h2>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : diagrams.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No diagrams saved yet
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {diagrams.map((diagram) => (
                  <button
                    key={diagram.id}
                    onClick={() => handleSelectDiagram(diagram)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedDiagram?.id === diagram.id
                        ? 'bg-secondary text-secondary-foreground'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">{diagram.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(diagram.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
          {/* Reveal in Finder button */}
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={async () => {
                const response = await window.api.diagrams.revealInFinder();
                if (!response.success) {
                  toast.error('Failed to open folder');
                }
              }}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              {window.api.platform.platform === 'darwin'
                ? 'Reveal in Finder'
                : window.api.platform.platform === 'win32'
                  ? 'Show in Explorer'
                  : 'Show in File Manager'}
            </Button>
          </div>
        </div>

        {/* Sidebar Resize Handle */}
        <div
          className="w-1 bg-transparent hover:bg-primary/20 cursor-col-resize flex-shrink-0 transition-colors"
          onMouseDown={handleSidebarMouseDown}
        />

        {/* Center and Right - Editor and Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor and Preview Split */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor */}
            <div className="flex flex-col border-r flex-shrink-0" style={{ width: `${editorWidth}%` }}>
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">
                  {selectedDiagram ? selectedDiagram.name : 'New Diagram'}
                  {hasUnsavedChanges && <span className="text-orange-500 ml-2">*</span>}
                </h3>
              </div>
              <div className="flex-1 p-4">
                <Textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="h-full font-mono text-sm resize-none"
                  placeholder="Enter your Mermaid diagram code..."
                />
              </div>
            </div>

            {/* Editor Resize Handle */}
            <div
              className="w-1 bg-transparent hover:bg-primary/20 cursor-col-resize flex-shrink-0 transition-colors"
              onMouseDown={handleEditorMouseDown}
            />

            {/* Preview */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Preview</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={handleZoomOut} title="Zoom out">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom in">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleZoomReset} title="Reset zoom">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditorContent(editorContent + ' ')}
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto" onWheel={handleWheel}>
                <div
                  ref={previewRef}
                  className="p-4 flex items-center justify-center min-h-full"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {renderError ? (
                    <Card className="w-full max-w-md border-destructive">
                      <CardHeader>
                        <CardTitle className="text-destructive text-sm">Render Error</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground font-mono">{renderError}</p>
                      </CardContent>
                    </Card>
                  ) : renderedSvg ? (
                    <div
                      className="mermaid-preview"
                      dangerouslySetInnerHTML={{ __html: renderedSvg }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">Enter Mermaid code to see preview</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Prompt Area */}
          <div className="border-t bg-card p-4">
            {lastUsedPrompt && (
              <div className="mb-3 p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Last prompt:</strong> {lastUsedPrompt}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want to create or modify...

Examples:
• Create a flowchart for user authentication
• Add a decision node for error handling
• Convert this to a sequence diagram
• Add a new step between X and Y"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAIGenerate();
                    }
                  }}
                  disabled={isGenerating}
                  className="min-h-[100px] resize-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="h-auto py-3"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">⌘+Enter</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              AI will generate or modify the diagram based on your prompt. Existing code will be used
              as context.
            </p>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Diagram</DialogTitle>
            <DialogDescription>Enter a name for your diagram file.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="My Diagram"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveNew();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNew} disabled={isSaving || !newFileName.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Diagram</DialogTitle>
            <DialogDescription>Enter a new name for your diagram.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameFileName}
              onChange={(e) => setRenameFileName(e.target.value)}
              placeholder="New name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameFileName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Diagram</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedDiagram?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Configure your OpenAI API settings for AI-powered diagram generation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">OpenAI API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely on your device.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={openAIModel}
                onChange={(e) => setOpenAIModel(e.target.value)}
                placeholder="gpt-5"
              />
              <p className="text-xs text-muted-foreground">
                The OpenAI model to use for diagram generation.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleTestConnection}>
              Test Connection
            </Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions History Dialog */}
      <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Browse and restore previous versions of &quot;{selectedDiagram?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No version history available
            </div>
          ) : (
            <div className="flex-1 flex gap-4 overflow-hidden min-h-[400px]">
              {/* Version List */}
              <div className="w-64 flex-shrink-0 border-r pr-4">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {versions.map((version, index) => (
                      <button
                        key={version.id}
                        onClick={() => handlePreviewVersion(index)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedVersionIndex === index
                            ? 'bg-secondary text-secondary-foreground'
                            : 'hover:bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(version.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {index === 0 && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Latest
                          </span>
                        )}
                        {version.prompt && (
                          <p className="text-xs text-muted-foreground mt-1 truncate" title={version.prompt}>
                            Prompt: {version.prompt}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Version Preview */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedVersionIndex !== null ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateVersion('prev')}
                          disabled={selectedVersionIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Version {versions.length - selectedVersionIndex} of {versions.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateVersion('next')}
                          disabled={selectedVersionIndex === versions.length - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUseVersionAsNew(versions[selectedVersionIndex])}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Use as New
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRestoreVersion(versions[selectedVersionIndex])}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                      </div>
                    </div>

                    {versions[selectedVersionIndex].prompt && (
                      <div className="mb-2 p-2 bg-muted rounded text-xs">
                        <strong>Prompt used:</strong> {versions[selectedVersionIndex].prompt}
                      </div>
                    )}

                    <div className="flex-1 overflow-auto border rounded bg-muted/30">
                      <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                        {versions[selectedVersionIndex].content}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Select a version to preview
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
