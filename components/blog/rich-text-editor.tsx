"use client"

import * as React from "react"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react"

import { richTextClass } from "@/components/blog/post-content"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

// The post content editor (legacy CKEditor). It emits HTML; whatever shows
// it must sanitise it (PostContent does). `value` is read once: remount it
// (a new `key`) to load other content.
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
  const editor = useEditor({
    // Rendered on the client only; Next pre-renders pages on the server.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Write the post…" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        ...(id && { id }),
        class: cn(richTextClass, "min-h-64 px-3 py-2 outline-none"),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  })

  return (
    <div
      aria-invalid={invalid}
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive",
        // Tiptap's placeholder: the empty first paragraph shows data-placeholder.
        "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]"
      )}
    >
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 border-b bg-muted/40" />}
      <EditorContent editor={editor} />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const [linking, setLinking] = React.useState(false)
  const fileId = React.useId()
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      quote: editor.isActive("blockquote"),
      code: editor.isActive("codeBlock"),
      link: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()
  const tools: { label: string; icon: React.ReactNode; on: boolean; run: () => void }[][] = [
    [
      { label: "Heading", icon: <Heading2Icon />, on: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
      { label: "Sub-heading", icon: <Heading3Icon />, on: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
    ],
    [
      { label: "Bold", icon: <BoldIcon />, on: state.bold, run: () => chain().toggleBold().run() },
      { label: "Italic", icon: <ItalicIcon />, on: state.italic, run: () => chain().toggleItalic().run() },
      { label: "Underline", icon: <UnderlineIcon />, on: state.underline, run: () => chain().toggleUnderline().run() },
      { label: "Strikethrough", icon: <StrikethroughIcon />, on: state.strike, run: () => chain().toggleStrike().run() },
    ],
    [
      { label: "Bullet list", icon: <ListIcon />, on: state.bullet, run: () => chain().toggleBulletList().run() },
      { label: "Numbered list", icon: <ListOrderedIcon />, on: state.ordered, run: () => chain().toggleOrderedList().run() },
      { label: "Quote", icon: <QuoteIcon />, on: state.quote, run: () => chain().toggleBlockquote().run() },
      { label: "Code block", icon: <CodeIcon />, on: state.code, run: () => chain().toggleCodeBlock().run() },
    ],
    [
      { label: "Link", icon: <LinkIcon />, on: state.link, run: () => setLinking(true) },
    ],
  ]

  function insertImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !IMAGE_TYPES.includes(file.type)) return
    const reader = new FileReader()
    reader.onload = () => chain().setImage({ src: String(reader.result), alt: file.name }).run()
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1">
      {tools.map((group, index) => (
        <React.Fragment key={index}>
          {index > 0 && <Separator orientation="vertical" className="mx-0.5 h-5!" />}
          {group.map((tool) => (
            <Toggle
              key={tool.label}
              size="sm"
              pressed={tool.on}
              onPressedChange={tool.run}
              aria-label={tool.label}
              title={tool.label}
            >
              {tool.icon}
            </Toggle>
          ))}
        </React.Fragment>
      ))}
      {/* A visually hidden file input under a label: it stays keyboard reachable. */}
      <input
        id={fileId}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="peer sr-only"
        onChange={insertImage}
      />
      <label
        htmlFor={fileId}
        title="Image"
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-[min(var(--radius-md),12px)] hover:bg-muted peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 [&_svg]:size-3.5"
      >
        <ImageIcon />
        <span className="sr-only">Insert image</span>
      </label>
      <div className="ml-auto flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" title="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
          <Undo2Icon />
          <span className="sr-only">Undo</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" title="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
          <Redo2Icon />
          <span className="sr-only">Redo</span>
        </Button>
      </div>
      <Dialog open={linking} onOpenChange={setLinking}>
        <DialogContent className="sm:max-w-md">
          {linking && <LinkForm editor={editor} onDone={() => setLinking(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Sets, changes or removes the link on the selection.
function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const id = React.useId()
  const current = (editor.getAttributes("link").href as string | undefined) ?? ""
  const [href, setHref] = React.useState(current)
  const [error, setError] = React.useState<string>()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    const url = href.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      onDone()
      return
    }
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url) && !/^[\w-]+(\.[\w-]+)+/.test(url)) {
      setError("Enter a web address, e.g. https://example.com.")
      return
    }
    const safe = /^(https?:\/\/|mailto:|\/)/i.test(url) ? url : `https://${url}`
    editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run()
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{current ? "Edit link" : "Add link"}</DialogTitle>
        <DialogDescription>
          Select text first to turn it into a link. Leave the address empty to remove the link.
        </DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={id}>Address</FieldLabel>
        <Input
          id={id}
          autoFocus
          value={href}
          placeholder="https://"
          aria-invalid={!!error}
          onChange={(event) => {
            setHref(event.target.value)
            setError(undefined)
          }}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </form>
  )
}
