"use client"

import * as React from "react"
import { Mathematics } from "@tiptap/extension-mathematics"
import Image from "@tiptap/extension-image"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { Placeholder } from "@tiptap/extensions"
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  BoldIcon,
  ImageIcon,
  ItalicIcon,
  ListOrderedIcon,
  SigmaIcon,
  SquareSigmaIcon,
  SubscriptIcon,
  SuperscriptIcon,
  UnderlineIcon,
} from "lucide-react"
import { toast } from "sonner"

import { IMAGE_TYPES, readImage } from "@/components/blog/editor/editor-dialogs"
import { questionTextClass, renderLatex } from "@/components/questions/question-content"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

// A small rich-text editor for question text, options, stimuli and
// solutions: bold / italic / underline, sub- and superscript, numbered
// lists, images (upload, paste or drop; data URLs for now) and equations
// typed in LaTeX and typeset with KaTeX (inline, or on a line of their own).
// It emits HTML that QuestionContent sanitises and renders. `value` is read
// once: remount it (a new `key`) to load other content.

type MathEdit = { mode: "inline" | "block"; latex: string; pos?: number }

const snippets = [
  ["\\frac{a}{b}", "a/b"],
  ["\\sqrt{x}", "√x"],
  ["x^{2}", "x²"],
  ["x_{1}", "x₁"],
  ["\\times", "×"],
  ["\\div", "÷"],
  ["\\pm", "±"],
  ["\\le", "≤"],
  ["\\ge", "≥"],
  ["\\ne", "≠"],
  ["\\pi", "π"],
  ["\\theta", "θ"],
  ["^\\circ", "°"],
  ["\\angle", "∠"],
  ["\\triangle", "△"],
  ["\\cup", "∪"],
  ["\\cap", "∩"],
  ["\\in", "∈"],
  ["\\log_{a}", "log"],
  ["\\overline{x}", "x̄"],
] as const

function insertImages(editor: Editor, files: File[], pos?: number) {
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

export function QuestionEditor({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  compact,
  lang,
}: {
  id?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  invalid?: boolean
  // One-line fields such as options.
  compact?: boolean
  lang?: "bn" | "en"
}) {
  const [math, setMath] = React.useState<MathEdit | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        link: false,
      }),
      Subscript,
      Superscript,
      Image.configure({ allowBase64: true }),
      Mathematics.configure({
        katexOptions: { throwOnError: false, strict: false },
        inlineOptions: {
          onClick: (node, pos) => setMath({ mode: "inline", latex: String(node.attrs.latex ?? ""), pos }),
        },
        blockOptions: {
          onClick: (node, pos) => setMath({ mode: "block", latex: String(node.attrs.latex ?? ""), pos }),
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        ...(id && { id }),
        ...(lang && { lang }),
        class: cn(
          questionTextClass,
          "text-sm outline-none px-3",
          compact ? "min-h-9 py-1.5" : "min-h-20 py-2",
          "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
          "[&_[data-type=inline-math]]:cursor-pointer [&_[data-type=inline-math]]:rounded-sm [&_[data-type=inline-math]:hover]:bg-primary/10 [&_[data-type=block-math]]:cursor-pointer [&_[data-type=block-math]:hover]:bg-primary/10",
          "[&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-primary"
        ),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  })

  React.useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        handlePaste: (_view, event) => insertImages(editor, [...(event.clipboardData?.files ?? [])]),
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false
          const files = [...(event.dataTransfer?.files ?? [])]
          if (!files.length) return false
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
          if (!insertImages(editor, files, pos)) return false
          event.preventDefault()
          return true
        },
      },
    })
  }, [editor])

  function saveMath(latex: string) {
    if (!editor || !math) return
    const chain = editor.chain().focus()
    if (math.pos != null) {
      if (!latex.trim()) {
        if (math.mode === "inline") chain.deleteInlineMath({ pos: math.pos }).run()
        else chain.deleteBlockMath({ pos: math.pos }).run()
      } else if (math.mode === "inline") chain.updateInlineMath({ latex, pos: math.pos }).run()
      else chain.updateBlockMath({ latex, pos: math.pos }).run()
    } else if (latex.trim()) {
      if (math.mode === "inline") chain.insertInlineMath({ latex }).run()
      else chain.insertBlockMath({ latex }).run()
    }
    setMath(null)
  }

  return (
    <div
      aria-invalid={invalid}
      className="flex flex-col overflow-hidden rounded-md border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive"
    >
      {editor ? (
        <Toolbar
          editor={editor}
          compact={compact}
          onImage={() => fileRef.current?.click()}
          onMath={(mode) => setMath({ mode, latex: "" })}
        />
      ) : (
        <div className="h-8 border-b bg-muted/40" />
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        hidden
        onChange={(e) => {
          if (editor && e.target.files) insertImages(editor, [...e.target.files])
          e.target.value = ""
        }}
      />
      <MathDialog edit={math} onCancel={() => setMath(null)} onSave={saveMath} />
    </div>
  )
}

function Toolbar({
  editor,
  compact,
  onImage,
  onMath,
}: {
  editor: Editor
  compact?: boolean
  onImage: () => void
  onMath: (mode: "inline" | "block") => void
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      subscript: e.isActive("subscript"),
      superscript: e.isActive("superscript"),
      ordered: e.isActive("orderedList"),
    }),
  })
  const toggle = (label: string, on: boolean, run: () => void, icon: React.ReactNode) => (
    <Toggle size="sm" pressed={on} onPressedChange={run} aria-label={label} title={label} className="h-7 min-w-7 px-1.5">
      {icon}
    </Toggle>
  )
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1 py-0.5">
      {toggle("Bold", state.bold, () => editor.chain().focus().toggleBold().run(), <BoldIcon />)}
      {toggle("Italic", state.italic, () => editor.chain().focus().toggleItalic().run(), <ItalicIcon />)}
      {toggle("Underline", state.underline, () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon />)}
      {toggle("Subscript", state.subscript, () => editor.chain().focus().toggleSubscript().run(), <SubscriptIcon />)}
      {toggle("Superscript", state.superscript, () => editor.chain().focus().toggleSuperscript().run(), <SuperscriptIcon />)}
      {!compact &&
        toggle("Numbered list", state.ordered, () => editor.chain().focus().toggleOrderedList().run(), <ListOrderedIcon />)}
      <span className="mx-0.5 h-4 w-px bg-border" />
      <Button type="button" variant="ghost" size="icon-sm" className="size-7" title="Equation" aria-label="Equation" onClick={() => onMath("inline")}>
        <SigmaIcon />
      </Button>
      {!compact && (
        <Button type="button" variant="ghost" size="icon-sm" className="size-7" title="Equation on its own line" aria-label="Equation on its own line" onClick={() => onMath("block")}>
          <SquareSigmaIcon />
        </Button>
      )}
      <Button type="button" variant="ghost" size="icon-sm" className="size-7" title="Image" aria-label="Image" onClick={onImage}>
        <ImageIcon />
      </Button>
    </div>
  )
}

// Types or changes an equation in LaTeX, with a live preview. Clearing it
// removes an existing equation.
function MathDialog({
  edit,
  onCancel,
  onSave,
}: {
  edit: MathEdit | null
  onCancel: () => void
  onSave: (latex: string) => void
}) {
  const [latex, setLatex] = React.useState("")
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [opened, setOpened] = React.useState<MathEdit | null>(null)
  // Start from the equation being edited each time the dialog opens.
  if (edit !== opened) {
    setOpened(edit)
    setLatex(edit?.latex ?? "")
  }
  const preview = React.useMemo(() => (latex.trim() ? renderLatex(latex, edit?.mode === "block") : ""), [latex, edit?.mode])

  function insert(snippet: string) {
    const el = ref.current
    const start = el?.selectionStart ?? latex.length
    const end = el?.selectionEnd ?? latex.length
    const next = latex.slice(0, start) + snippet + latex.slice(end)
    setLatex(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  return (
    <Dialog open={!!edit} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSave(latex)
          }}
        >
          <DialogHeader>
            <DialogTitle>{edit?.pos != null ? "Edit equation" : "Insert equation"}</DialogTitle>
            <DialogDescription>
              Type it in LaTeX, e.g. <code className="font-mono">\frac{"{1}{2}"}</code> or{" "}
              <code className="font-mono">x^2 + \sqrt{"{y}"}</code>.{edit?.pos != null && " Clear it to remove the equation."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1">
            {snippets.map(([code, label]) => (
              <Button key={code} type="button" variant="outline" size="sm" className="h-7 px-2 font-normal" title={code} onClick={() => insert(code)}>
                {label}
              </Button>
            ))}
          </div>
          <Textarea
            ref={ref}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSave(latex)
              }
            }}
            spellCheck={false}
            autoFocus
            aria-label="LaTeX"
            className="min-h-20 font-mono text-sm"
          />
          <div className="flex min-h-14 items-center justify-center overflow-x-auto rounded-md border bg-muted/30 px-3 py-2">
            {preview ? (
              <span dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              <span className="text-sm text-muted-foreground">The preview shows here.</span>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">{edit?.pos != null ? "Update" : "Insert"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
