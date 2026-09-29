"use client"

import * as React from "react"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import TextAlign from "@tiptap/extension-text-align"
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style"
import Youtube from "@tiptap/extension-youtube"
import { CharacterCount, Placeholder } from "@tiptap/extensions"
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { toast } from "sonner"

import {
  FindReplaceForm,
  ImageForm,
  IMAGE_TYPES,
  LinkForm,
  readImage,
  VideoForm,
} from "@/components/blog/editor/editor-dialogs"
import { EditorToolbar, type EditorDialog } from "@/components/blog/editor/editor-toolbar"
import { richTextClass } from "@/components/blog/post-content"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// Extras on top of the shared post typography that only matter while
// editing: table cell selection and column resizing, image resize handles,
// the selected node, and the empty-editor placeholder.
const editingClass = cn(
  "[&_.selectedCell]:after:pointer-events-none [&_.selectedCell]:after:absolute [&_.selectedCell]:after:inset-0 [&_.selectedCell]:after:bg-primary/15 [&_.selectedCell]:after:content-['']",
  "[&_.column-resize-handle]:pointer-events-none [&_.column-resize-handle]:absolute [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:-right-0.5 [&_.column-resize-handle]:-bottom-px [&_.column-resize-handle]:w-1 [&_.column-resize-handle]:bg-primary [&_.resize-cursor]:cursor-col-resize",
  "[&_[data-resize-wrapper]]:inline-block [&_[data-resize-handle]]:z-10 [&_[data-resize-handle]]:size-3 [&_[data-resize-handle]]:rounded-full [&_[data-resize-handle]]:border-2 [&_[data-resize-handle]]:border-background [&_[data-resize-handle]]:bg-primary [&_[data-resize-handle]]:opacity-0 [&_[data-resize-wrapper]:hover_[data-resize-handle]]:opacity-100 [&_.ProseMirror-selectednode_[data-resize-handle]]:opacity-100",
  "[&_[data-resize-handle=top-left]]:cursor-nwse-resize [&_[data-resize-handle=bottom-right]]:cursor-nwse-resize [&_[data-resize-handle=top-right]]:cursor-nesw-resize [&_[data-resize-handle=bottom-left]]:cursor-nesw-resize",
  "[&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-primary [&_.ProseMirror-selectednode>iframe]:outline-2 [&_.ProseMirror-selectednode>iframe]:outline-primary [&_hr.ProseMirror-selectednode]:border-primary",
  "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
)

// Puts block tags on their own lines so the source view is readable.
function formatHtml(html: string) {
  return html
    .replace(/(<\/(p|h[1-6]|li|blockquote|pre|tr|table|ul|ol|div|thead|tbody)>)/g, "$1\n")
    .replace(/(<(ul|ol|table|thead|tbody|tr|blockquote)(\s[^>]*)?>)/g, "$1\n")
    .replace(/(<hr[^>]*>)/g, "$1\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
}

function insertImageFiles(editor: Editor, files: File[], pos?: number) {
  const images = files.filter((f) => IMAGE_TYPES.includes(f.type))
  if (!images.length) return false
  for (const file of images) {
    const ok = readImage(file, (src) => {
      const content = { type: "image", attrs: { src, alt: file.name.replace(/\.[^.]+$/, "") } }
      if (pos == null) editor.chain().focus().insertContent(content).run()
      else editor.chain().focus().insertContentAt(pos, content).run()
    })
    if (!ok) toast.error(`${file.name} is over 2 MB and wasn't added.`)
  }
  return true
}

// The post content editor, in the spirit of the legacy CKEditor toolbar:
// paragraph styles and headings, font, size and colours, bold / italic /
// underline / strike / sub- and superscript, alignment, lists and indent,
// quotes, links, images (upload, paste or drop; resizable), YouTube
// embeds, tables, special characters, find and replace, an HTML source
// view, full screen and a word count. It emits HTML; whatever shows it must
// sanitise it (PostContent does). `value` is read once: remount it (a new
// `key`) to load other content.
export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  invalid,
}: {
  id?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  invalid?: boolean
}) {
  const [dialog, setDialog] = React.useState<EditorDialog | null>(null)
  const [source, setSource] = React.useState<string | null>(null)
  const [fullscreen, setFullscreen] = React.useState(false)

  const editor = useEditor({
    // Rendered on the client only; Next pre-renders pages on the server.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ["top-left", "top-right", "bottom-left", "bottom-right"],
          minWidth: 48,
          minHeight: 48,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Youtube.configure({ nocookie: true, modestBranding: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder: placeholder ?? "Write the post…" }),
      CharacterCount,
    ],
    content: value,
    editorProps: {
      attributes: {
        ...(id && { id }),
        spellcheck: "true",
        class: cn(richTextClass, editingClass, "min-h-72 px-4 py-3 outline-none"),
      },
      handleKeyDown: (_view, event) => {
        const mod = event.ctrlKey || event.metaKey
        if (mod && !event.shiftKey && event.key.toLowerCase() === "k") {
          setDialog("link")
          return true
        }
        if (mod && !event.shiftKey && event.key.toLowerCase() === "f") {
          setDialog("find")
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  })

  // Pasted and dropped image files become images (data URLs for now).
  React.useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handlePaste: (_view, event) => insertImageFiles(editor, [...(event.clipboardData?.files ?? [])]),
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false
          const files = [...(event.dataTransfer?.files ?? [])]
          if (!files.length) return false
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
          if (!insertImageFiles(editor, files, pos)) return false
          event.preventDefault()
          return true
        },
      },
    })
  }, [editor])

  // Esc leaves full screen; the page behind doesn't scroll meanwhile.
  React.useEffect(() => {
    if (!fullscreen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialog) setFullscreen(false)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener("keydown", onKey)
    }
  }, [fullscreen, dialog])

  function toggleSource() {
    if (!editor) return
    if (source == null) {
      setSource(formatHtml(editor.getHTML()))
      return
    }
    editor.commands.setContent(source, { emitUpdate: true })
    setSource(null)
    editor.commands.focus()
  }

  return (
    <div
      aria-invalid={invalid}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive",
        fullscreen && "fixed inset-0 z-50 rounded-none border-0 focus-within:ring-0"
      )}
    >
      {editor ? (
        <EditorToolbar
          editor={editor}
          source={source != null}
          fullscreen={fullscreen}
          onSource={toggleSource}
          onFullscreen={() => setFullscreen((f) => !f)}
          onDialog={setDialog}
        />
      ) : (
        <div className="h-10 border-b bg-muted/40" />
      )}
      <div className={cn("overflow-y-auto", fullscreen ? "flex-1" : "max-h-[70vh]", fullscreen && "mx-auto w-full max-w-4xl")}>
        {source != null ? (
          <textarea
            aria-label="HTML source"
            spellCheck={false}
            className="block min-h-72 w-full resize-y bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed outline-none"
            style={{ height: fullscreen ? "100%" : undefined }}
            value={source}
            onChange={(e) => {
              setSource(e.target.value)
              onChange(e.target.value)
            }}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
      {editor && <StatusBar editor={editor} source={source != null} />}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          {editor && dialog === "link" && <LinkForm editor={editor} onDone={() => setDialog(null)} />}
          {editor && dialog === "image" && <ImageForm editor={editor} onDone={() => setDialog(null)} />}
          {editor && dialog === "video" && <VideoForm editor={editor} onDone={() => setDialog(null)} />}
          {editor && dialog === "find" && <FindReplaceForm editor={editor} onDone={() => setDialog(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBar({ editor, source }: { editor: Editor; source: boolean }) {
  const { words, characters } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      words: e.storage.characterCount.words() as number,
      characters: e.storage.characterCount.characters() as number,
    }),
  })
  return (
    <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
      <span>{source ? "Editing HTML source. Switch back to see the post." : "Paste or drop images straight in."}</span>
      <span className="tabular-nums">
        {words.toLocaleString()} word{words === 1 ? "" : "s"} · {characters.toLocaleString()} characters
      </span>
    </div>
  )
}
