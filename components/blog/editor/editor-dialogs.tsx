"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { TextSelection } from "@tiptap/pm/state"
import type { Node as PmNode } from "@tiptap/pm/model"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

// Reads a picked or pasted image as a data URL (there is no media library
// yet); null when it isn't an allowed image or is too big.
export function readImage(file: File, onLoad: (src: string) => void) {
  if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) return false
  const reader = new FileReader()
  reader.onload = () => onLoad(String(reader.result))
  reader.readAsDataURL(file)
  return true
}

const WEB_URL = /^(https?:\/\/|mailto:|tel:|\/|#)/i

// Sets, changes or removes the link on the selection (legacy Link /
// Unlink). With no selection, the address is inserted as linked text.
export function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const id = React.useId()
  const textId = React.useId()
  const current = (editor.getAttributes("link").href as string | undefined) ?? ""
  const empty = editor.state.selection.empty && !editor.isActive("link")
  const [href, setHref] = React.useState(current)
  const [text, setText] = React.useState("")
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
    if (!WEB_URL.test(url) && !/^[\w-]+(\.[\w-]+)+/.test(url)) {
      setError("Enter a web address, e.g. https://example.com.")
      return
    }
    const safe = WEB_URL.test(url) ? url : `https://${url}`
    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: text.trim() || safe, marks: [{ type: "link", attrs: { href: safe } }] })
        .run()
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run()
    }
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{current ? "Edit link" : "Add link"}</DialogTitle>
        <DialogDescription>Leave the address empty to remove the link.</DialogDescription>
      </DialogHeader>
      {empty && (
        <Field>
          <FieldLabel htmlFor={textId}>Text to show</FieldLabel>
          <Input id={textId} value={text} placeholder="The address itself" onChange={(e) => setText(e.target.value)} />
        </Field>
      )}
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

// Legacy Image: upload a picture (or give its address) with the text read
// out for those who can't see it.
export function ImageForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const fileId = React.useId()
  const urlId = React.useId()
  const altId = React.useId()
  const [tab, setTab] = React.useState("upload")
  const [src, setSrc] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [alt, setAlt] = React.useState("")
  const [error, setError] = React.useState<string>()

  function pick(file: File | undefined) {
    setError(undefined)
    if (!file) return
    if (!readImage(file, setSrc)) setError("Pick a JPG, PNG, GIF or WebP image of up to 2 MB.")
    else if (!alt) setAlt(file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    const image = tab === "upload" ? src : url.trim()
    if (!image) {
      setError(tab === "upload" ? "Pick an image." : "Enter the image address.")
      return
    }
    if (tab === "url" && !/^https:\/\//i.test(image)) {
      setError("Use an https:// address.")
      return
    }
    editor.chain().focus().setImage({ src: image, alt: alt.trim() }).run()
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Insert image</DialogTitle>
        <DialogDescription>Drag its corners in the post to resize it. You can also paste or drop images.</DialogDescription>
      </DialogHeader>
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(undefined) }}>
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="url">From address</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="pt-3">
          <Field data-invalid={!!error && tab === "upload"}>
            <FieldLabel htmlFor={fileId}>Image file</FieldLabel>
            <Input id={fileId} type="file" accept={IMAGE_TYPES.join(",")} onChange={(e) => pick(e.target.files?.[0])} />
            <FieldDescription>JPG, PNG, GIF or WebP, up to 2 MB.</FieldDescription>
          </Field>
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="mt-3 max-h-40 rounded-md border object-contain" />
          )}
        </TabsContent>
        <TabsContent value="url" className="pt-3">
          <Field>
            <FieldLabel htmlFor={urlId}>Image address</FieldLabel>
            <Input id={urlId} value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)} />
          </Field>
        </TabsContent>
      </Tabs>
      <Field>
        <FieldLabel htmlFor={altId}>Alternative text</FieldLabel>
        <Input id={altId} value={alt} placeholder="What the image shows" onChange={(e) => setAlt(e.target.value)} />
        <FieldDescription>Read out by screen readers and shown if the image can&apos;t load.</FieldDescription>
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Insert</Button>
      </DialogFooter>
    </form>
  )
}

// A YouTube video, played from youtube-nocookie.com (the only embed a post
// may carry; see sanitizePostHtml).
export function VideoForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const id = React.useId()
  const [url, setUrl] = React.useState("")
  const [error, setError] = React.useState<string>()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    const ok = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{6,}/i.test(url.trim())
    if (!ok) {
      setError("Paste a YouTube video link, e.g. https://www.youtube.com/watch?v=…")
      return
    }
    const inserted = editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run()
    if (!inserted) {
      setError("That link couldn't be embedded.")
      return
    }
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Embed YouTube video</DialogTitle>
        <DialogDescription>It plays inside the post, in YouTube&apos;s privacy-enhanced mode.</DialogDescription>
      </DialogHeader>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={id}>Video link</FieldLabel>
        <Input
          id={id}
          autoFocus
          value={url}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-invalid={!!error}
          onChange={(e) => {
            setUrl(e.target.value)
            setError(undefined)
          }}
        />
        <FieldError>{error}</FieldError>
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Embed</Button>
      </DialogFooter>
    </form>
  )
}

type Match = { from: number; to: number }

// Where the text occurs in the document. A match must sit within one run
// of equally formatted text (e.g. not half bold, half plain).
function findMatches(doc: PmNode, query: string, caseSensitive: boolean): Match[] {
  const matches: Match[] = []
  if (!query) return matches
  const needle = caseSensitive ? query : query.toLocaleLowerCase()
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = caseSensitive ? node.text : node.text.toLocaleLowerCase()
    let at = text.indexOf(needle)
    while (at !== -1) {
      matches.push({ from: pos + at, to: pos + at + query.length })
      at = text.indexOf(needle, at + needle.length)
    }
  })
  return matches
}

// Legacy Find / Replace: step through matches (each is selected and
// scrolled to), replace the selected one, or replace them all at once
// (one undo step).
export function FindReplaceForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const findId = React.useId()
  const replaceId = React.useId()
  const [query, setQuery] = React.useState(() => {
    const { from, to, empty } = editor.state.selection
    return empty ? "" : editor.state.doc.textBetween(from, to, " ").slice(0, 100)
  })
  const [replacement, setReplacement] = React.useState("")
  const [caseSensitive, setCaseSensitive] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const count = findMatches(editor.state.doc, query, caseSensitive).length

  function select(match: Match) {
    const { tr } = editor.state
    editor.view.dispatch(tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView())
  }

  function findNext() {
    const matches = findMatches(editor.state.doc, query, caseSensitive)
    if (!matches.length) {
      setMessage("Not found.")
      return
    }
    const after = editor.state.selection.to
    const next = matches.find((m) => m.from >= after) ?? matches[0]
    select(next)
    setMessage(`Match ${matches.indexOf(next) + 1} of ${matches.length}.`)
  }

  function selectedIsMatch() {
    const { from, to } = editor.state.selection
    return findMatches(editor.state.doc, query, caseSensitive).some((m) => m.from === from && m.to === to)
  }

  function replaceOne() {
    if (!selectedIsMatch()) {
      findNext()
      return
    }
    const { from, to } = editor.state.selection
    editor.chain().insertContentAt({ from, to }, replacement).run()
    findNext()
  }

  function replaceAll() {
    const matches = findMatches(editor.state.doc, query, caseSensitive)
    if (!matches.length) {
      setMessage("Not found.")
      return
    }
    const { tr } = editor.state
    for (const m of [...matches].reverse()) {
      if (replacement) tr.insertText(replacement, m.from, m.to)
      else tr.delete(m.from, m.to)
    }
    editor.view.dispatch(tr)
    setMessage(`${matches.length} replaced.`)
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        findNext()
      }}
    >
      <DialogHeader>
        <DialogTitle>Find and replace</DialogTitle>
        <DialogDescription>{query ? `${count} match${count === 1 ? "" : "es"} in the post.` : "Type what to look for."}</DialogDescription>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor={findId}>Find</FieldLabel>
        <Input id={findId} autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setMessage("") }} />
      </Field>
      <Field>
        <FieldLabel htmlFor={replaceId}>Replace with</FieldLabel>
        <Input id={replaceId} value={replacement} onChange={(e) => setReplacement(e.target.value)} />
      </Field>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={caseSensitive} onCheckedChange={(on) => setCaseSensitive(on === true)} />
        Match case
      </Label>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="outline" onClick={onDone}>
          Close
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={!query}>
            Find next
          </Button>
          <Button type="button" variant="secondary" onClick={replaceOne} disabled={!query}>
            Replace
          </Button>
          <Button type="button" onClick={replaceAll} disabled={!query || !count}>
            Replace all
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
