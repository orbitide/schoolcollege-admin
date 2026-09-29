"use client"

import * as React from "react"
import { useEditorState, type Editor } from "@tiptap/react"
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BaselineIcon,
  BoldIcon,
  ChevronDownIcon,
  CodeIcon,
  CodeXmlIcon,
  HighlighterIcon,
  ImageIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  OmegaIcon,
  QuoteIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  SearchIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableIcon,
  UnderlineIcon,
  Undo2Icon,
  UnlinkIcon,
  SquarePlayIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

export type EditorDialog = "link" | "image" | "video" | "find"

const blockTypes = [
  { label: "Paragraph", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
  { label: "Heading 4", level: 4 },
] as const

const fontFamilies = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Noto Sans Bengali", value: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif" },
  { label: "SolaimanLipi", value: "SolaimanLipi, 'Noto Sans Bengali', sans-serif" },
]

const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px"]

const palette = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  "#b91c1c", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#2563eb",
  "#7c3aed", "#c026d3", "#db2777", "#78350f", "#065f46", "#1e3a8a",
  "#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#bfdbfe", "#e9d5ff",
]

const specialChars = [
  "©", "®", "™", "৳", "€", "£", "¥", "$", "°", "±", "×", "÷", "½", "¼", "¾", "‰",
  "§", "¶", "•", "…", "—", "–", "«", "»", "“", "”", "‘", "’", "→", "←", "↑", "↓",
  "✓", "✗", "★", "☆", "♥", "☎", "✉", "∞", "≤", "≥", "≠", "√", "π", "Ω", "α", "β",
]
const smileys = ["😀", "😊", "😂", "😍", "🤔", "😢", "👍", "👏", "🙏", "🎉", "🎓", "📚", "✏️", "🏆", "⭐", "❤️", "🇧🇩", "📢"]

// Everything the toolbar reflects, read once per editor change.
function useToolbarState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      level: ([1, 2, 3, 4] as const).find((level) => e.isActive("heading", { level })) ?? 0,
      codeBlock: e.isActive("codeBlock"),
      fontFamily: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
      fontSize: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "",
      highlight: (e.getAttributes("highlight").color as string | undefined) ?? "",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      subscript: e.isActive("subscript"),
      superscript: e.isActive("superscript"),
      align: (["left", "center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      inList: e.isActive("listItem"),
      canIndent: e.can().sinkListItem("listItem"),
      canOutdent: e.can().liftListItem("listItem"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      canMerge: e.can().mergeCells(),
      canSplit: e.can().splitCell(),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
}

function Tool({
  label,
  shortcut,
  on,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  on?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const title = shortcut ? `${label} (${shortcut})` : label
  if (on === undefined) {
    return (
      <Button type="button" variant="ghost" size="icon-sm" title={title} aria-label={label} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    )
  }
  return (
    <Toggle size="sm" pressed={on} onPressedChange={onClick} aria-label={label} title={title} disabled={disabled}>
      {children}
    </Toggle>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5!" />

function MenuButton({ label, title, children, className }: { label: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" title={title} className={cn("gap-1 px-2 font-normal", className)}>
          {label}
          <ChevronDownIcon className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  )
}

function ColorMenu({
  title,
  icon,
  current,
  onPick,
  onClear,
}: {
  title: string
  icon: React.ReactNode
  current: string
  onPick: (color: string) => void
  onClear: () => void
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" title={title} aria-label={title} className="h-7 flex-col gap-0 px-1.5">
          {icon}
          <span className="h-0.5 w-4 rounded-full" style={{ background: current || "currentColor", opacity: current ? 1 : 0.25 }} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto p-2">
        <DropdownMenuLabel className="px-0 pt-0">{title}</DropdownMenuLabel>
        <div className="grid grid-cols-6 gap-1">
          {palette.map((color) => (
            <DropdownMenuItem
              key={color}
              title={color}
              onSelect={() => onPick(color)}
              className={cn(
                "size-6 rounded-sm border p-0 focus:ring-2 focus:ring-ring",
                current.toLowerCase() === color && "ring-2 ring-primary"
              )}
              style={{ background: color }}
            >
              <span className="sr-only">{color}</span>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
            Custom
            <input
              type="color"
              className="size-6 cursor-pointer rounded border bg-transparent"
              value={current && current.startsWith("#") ? current : "#000000"}
              onChange={(e) => onPick(e.target.value)}
            />
          </label>
          <Button type="button" size="xs" variant="ghost" onClick={onClear}>
            Default
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Legacy Table: hover the grid to pick rows × columns (the first row is a
// header row).
function TableMenu({ editor }: { editor: Editor }) {
  const [size, setSize] = React.useState({ rows: 0, cols: 0 })
  return (
    <DropdownMenu modal={false} onOpenChange={() => setSize({ rows: 0, cols: 0 })}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" title="Table" aria-label="Insert table">
          <TableIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto p-2">
        <DropdownMenuLabel className="px-0 pt-0">
          {size.rows ? `${size.rows} × ${size.cols} table` : "Insert table"}
        </DropdownMenuLabel>
        <div className="grid grid-cols-8 gap-0.5" onMouseLeave={() => setSize({ rows: 0, cols: 0 })}>
          {Array.from({ length: 64 }, (_, i) => {
            const row = Math.floor(i / 8) + 1
            const col = (i % 8) + 1
            const on = row <= size.rows && col <= size.cols
            return (
              <DropdownMenuItem
                key={i}
                aria-label={`${row} by ${col} table`}
                onMouseEnter={() => setSize({ rows: row, cols: col })}
                onFocus={() => setSize({ rows: row, cols: col })}
                onSelect={() => editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: true }).run()}
                className={cn("size-4 rounded-[2px] border p-0", on ? "border-primary bg-primary/30" : "bg-background")}
              />
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SpecialCharMenu({ editor }: { editor: Editor }) {
  const insert = (text: string) => editor.chain().focus().insertContent(text).run()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" title="Special character and emoji" aria-label="Special character">
          <OmegaIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <DropdownMenuLabel className="px-0 pt-0">Special characters</DropdownMenuLabel>
        <div className="grid grid-cols-8 gap-0.5">
          {specialChars.map((c) => (
            <DropdownMenuItem key={c} onSelect={() => insert(c)} className="size-8 justify-center p-0 text-base">
              {c}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-0">Emoji</DropdownMenuLabel>
        <div className="grid grid-cols-8 gap-0.5">
          {smileys.map((c) => (
            <DropdownMenuItem key={c} onSelect={() => insert(c)} className="size-8 justify-center p-0 text-base">
              {c}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function EditorToolbar({
  editor,
  source,
  fullscreen,
  onSource,
  onFullscreen,
  onDialog,
}: {
  editor: Editor
  source: boolean
  fullscreen: boolean
  onSource: () => void
  onFullscreen: () => void
  onDialog: (dialog: EditorDialog) => void
}) {
  const s = useToolbarState(editor)
  const chain = () => editor.chain().focus()
  const block = s.codeBlock ? "Code block" : blockTypes.find((b) => b.level === s.level)!.label
  const font = fontFamilies.find((f) => f.value === s.fontFamily)?.label ?? "Font"
  const off = source

  return (
    <div className="flex flex-col border-b bg-muted/40">
      <div className="flex flex-wrap items-center gap-y-1 p-1">
        <Group>
          <MenuButton label={<span className="w-20 truncate text-left">{block}</span>} title="Paragraph style">
            <DropdownMenuContent align="start" className="w-48">
              {blockTypes.map((b) => (
                <DropdownMenuItem
                  key={b.label}
                  disabled={off}
                  onSelect={() =>
                    b.level ? chain().setHeading({ level: b.level }).run() : chain().setParagraph().run()
                  }
                  className={cn(
                    b.level === 1 && "text-xl font-bold",
                    b.level === 2 && "text-lg font-semibold",
                    b.level === 3 && "text-base font-semibold",
                    b.level === 4 && "font-semibold"
                  )}
                >
                  {b.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem disabled={off} onSelect={() => chain().toggleCodeBlock().run()} className="font-mono text-xs">
                Code block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </MenuButton>
          <MenuButton label={<span className="w-20 truncate text-left">{font}</span>} title="Font">
            <DropdownMenuContent align="start" className="w-56">
              {fontFamilies.map((f) => (
                <DropdownMenuItem
                  key={f.label}
                  disabled={off}
                  style={{ fontFamily: f.value || undefined }}
                  onSelect={() => (f.value ? chain().setFontFamily(f.value).run() : chain().unsetFontFamily().run())}
                >
                  {f.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </MenuButton>
          <MenuButton label={<span className="w-9 text-left tabular-nums">{s.fontSize.replace("px", "") || "Size"}</span>} title="Font size">
            <DropdownMenuContent align="start" className="w-28">
              <DropdownMenuItem disabled={off} onSelect={() => chain().unsetFontSize().run()}>
                Default
              </DropdownMenuItem>
              {fontSizes.map((size) => (
                <DropdownMenuItem key={size} disabled={off} onSelect={() => chain().setFontSize(size).run()}>
                  {size.replace("px", "")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </MenuButton>
        </Group>
        <Divider />
        <Group>
          <Tool label="Bold" shortcut="Ctrl+B" on={s.bold} disabled={off} onClick={() => chain().toggleBold().run()}>
            <BoldIcon />
          </Tool>
          <Tool label="Italic" shortcut="Ctrl+I" on={s.italic} disabled={off} onClick={() => chain().toggleItalic().run()}>
            <ItalicIcon />
          </Tool>
          <Tool label="Underline" shortcut="Ctrl+U" on={s.underline} disabled={off} onClick={() => chain().toggleUnderline().run()}>
            <UnderlineIcon />
          </Tool>
          <Tool label="Strikethrough" shortcut="Ctrl+Shift+S" on={s.strike} disabled={off} onClick={() => chain().toggleStrike().run()}>
            <StrikethroughIcon />
          </Tool>
          <Tool label="Subscript" shortcut="Ctrl+," on={s.subscript} disabled={off} onClick={() => chain().toggleSubscript().run()}>
            <SubscriptIcon />
          </Tool>
          <Tool label="Superscript" shortcut="Ctrl+." on={s.superscript} disabled={off} onClick={() => chain().toggleSuperscript().run()}>
            <SuperscriptIcon />
          </Tool>
          <Tool label="Inline code" shortcut="Ctrl+E" on={s.code} disabled={off} onClick={() => chain().toggleCode().run()}>
            <CodeIcon />
          </Tool>
          <ColorMenu
            title="Text colour"
            icon={<BaselineIcon className="size-3.5" />}
            current={s.color}
            onPick={(color) => chain().setColor(color).run()}
            onClear={() => chain().unsetColor().run()}
          />
          <ColorMenu
            title="Highlight"
            icon={<HighlighterIcon className="size-3.5" />}
            current={s.highlight}
            onPick={(color) => chain().setHighlight({ color }).run()}
            onClear={() => chain().unsetHighlight().run()}
          />
          <Tool label="Clear formatting" disabled={off} onClick={() => chain().unsetAllMarks().clearNodes().run()}>
            <RemoveFormattingIcon />
          </Tool>
        </Group>
        <Divider />
        <Group>
          <Tool label="Align left" shortcut="Ctrl+Shift+L" on={s.align === "left"} disabled={off} onClick={() => chain().setTextAlign("left").run()}>
            <AlignLeftIcon />
          </Tool>
          <Tool label="Centre" shortcut="Ctrl+Shift+E" on={s.align === "center"} disabled={off} onClick={() => chain().setTextAlign("center").run()}>
            <AlignCenterIcon />
          </Tool>
          <Tool label="Align right" shortcut="Ctrl+Shift+R" on={s.align === "right"} disabled={off} onClick={() => chain().setTextAlign("right").run()}>
            <AlignRightIcon />
          </Tool>
          <Tool label="Justify" shortcut="Ctrl+Shift+J" on={s.align === "justify"} disabled={off} onClick={() => chain().setTextAlign("justify").run()}>
            <AlignJustifyIcon />
          </Tool>
        </Group>
        <Divider />
        <Group>
          <Tool label="Bulleted list" shortcut="Ctrl+Shift+8" on={s.bullet} disabled={off} onClick={() => chain().toggleBulletList().run()}>
            <ListIcon />
          </Tool>
          <Tool label="Numbered list" shortcut="Ctrl+Shift+7" on={s.ordered} disabled={off} onClick={() => chain().toggleOrderedList().run()}>
            <ListOrderedIcon />
          </Tool>
          <Tool label="Decrease indent" shortcut="Shift+Tab" disabled={off || !s.canOutdent} onClick={() => chain().liftListItem("listItem").run()}>
            <IndentDecreaseIcon />
          </Tool>
          <Tool label="Increase indent" shortcut="Tab" disabled={off || !s.canIndent} onClick={() => chain().sinkListItem("listItem").run()}>
            <IndentIncreaseIcon />
          </Tool>
          <Tool label="Quote" shortcut="Ctrl+Shift+B" on={s.quote} disabled={off} onClick={() => chain().toggleBlockquote().run()}>
            <QuoteIcon />
          </Tool>
          <Tool label="Horizontal line" disabled={off} onClick={() => chain().setHorizontalRule().run()}>
            <MinusIcon />
          </Tool>
        </Group>
        <Divider />
        <Group>
          <Tool label="Link" shortcut="Ctrl+K" on={s.link} disabled={off} onClick={() => onDialog("link")}>
            <LinkIcon />
          </Tool>
          <Tool label="Remove link" disabled={off || !s.link} onClick={() => chain().extendMarkRange("link").unsetLink().run()}>
            <UnlinkIcon />
          </Tool>
          <Tool label="Image" disabled={off} onClick={() => onDialog("image")}>
            <ImageIcon />
          </Tool>
          <Tool label="YouTube video" disabled={off} onClick={() => onDialog("video")}>
            <SquarePlayIcon />
          </Tool>
          {off ? (
            <Button type="button" variant="ghost" size="icon-sm" disabled aria-label="Insert table">
              <TableIcon />
            </Button>
          ) : (
            <TableMenu editor={editor} />
          )}
          {!off && <SpecialCharMenu editor={editor} />}
        </Group>
        <div className="ml-auto flex items-center gap-0.5">
          <Tool label="Find and replace" shortcut="Ctrl+F" disabled={off} onClick={() => onDialog("find")}>
            <SearchIcon />
          </Tool>
          <Tool label="HTML source" on={source} onClick={onSource}>
            <CodeXmlIcon />
          </Tool>
          <Tool label={fullscreen ? "Exit full screen" : "Full screen"} shortcut="Esc to exit" onClick={onFullscreen}>
            {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </Tool>
          <Divider />
          <Tool label="Undo" shortcut="Ctrl+Z" disabled={off || !s.canUndo} onClick={() => chain().undo().run()}>
            <Undo2Icon />
          </Tool>
          <Tool label="Redo" shortcut="Ctrl+Y" disabled={off || !s.canRedo} onClick={() => chain().redo().run()}>
            <Redo2Icon />
          </Tool>
        </div>
      </div>
      {s.table && !off && (
        <div className="flex flex-wrap items-center gap-1 border-t bg-background/60 px-2 py-1 text-xs">
          <span className="mr-1 font-medium text-muted-foreground">Table</span>
          {(
            [
              ["Row above", () => chain().addRowBefore().run()],
              ["Row below", () => chain().addRowAfter().run()],
              ["Delete row", () => chain().deleteRow().run()],
              ["Column left", () => chain().addColumnBefore().run()],
              ["Column right", () => chain().addColumnAfter().run()],
              ["Delete column", () => chain().deleteColumn().run()],
              ["Header row", () => chain().toggleHeaderRow().run()],
            ] as const
          ).map(([label, run]) => (
            <Button key={label} type="button" size="xs" variant="ghost" onClick={run}>
              {label}
            </Button>
          ))}
          <Button type="button" size="xs" variant="ghost" disabled={!s.canMerge} onClick={() => chain().mergeCells().run()}>
            Merge cells
          </Button>
          <Button type="button" size="xs" variant="ghost" disabled={!s.canSplit} onClick={() => chain().splitCell().run()}>
            Split cell
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => chain().deleteTable().run()}
          >
            Delete table
          </Button>
        </div>
      )}
    </div>
  )
}
